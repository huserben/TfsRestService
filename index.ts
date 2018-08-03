import * as fs from "fs";
import * as url from "url";
import { List } from "linqts";
import * as vsts from "vso-node-api";
/*import * as ba from "vso-node-api/BuildApi";
import * as bi from "vso-node-api/interfaces/BuildInterfaces";
import * as ti from "vso-node-api/interfaces/TestInterfaces";*/

import { IRequestHandler, IRequestOptions } from "./node_modules/vso-node-api/interfaces/common/VsoBaseInterfaces";
import { ICoreApi } from "./node_modules/vso-node-api/CoreApi";
import { TeamProjectReference } from "./node_modules/vso-node-api/interfaces/CoreInterfaces";
import { ITestApi } from "./node_modules/vso-node-api/TestApi";
import { IBuildApi } from "./node_modules/vso-node-api/BuildApi";
import { Build, BuildStatus, Change, BuildResult, BuildArtifact, BuildDefinitionReference } from "./node_modules/vso-node-api/interfaces/BuildInterfaces";
import { TestRun, RunStatistic, TestRunState } from "./node_modules/vso-node-api/interfaces/TestInterfaces";
import { ITaskAgentApi } from "./node_modules/vso-node-api/TaskAgentApi";
import { TaskAgentQueue } from "./node_modules/vso-node-api/interfaces/TaskAgentInterfaces";

export const TeamFoundationCollectionUri: string = "SYSTEM_TEAMFOUNDATIONCOLLECTIONURI";
export const TeamProject: string = "SYSTEM_TEAMPROJECT";

export const RequestedForUsername: string = "BUILD_REQUESTEDFOR";
export const RequestedForUserId: string = "BUILD_REQUESTEDFORID";

export const SourceVersion: string = "BUILD_SOURCEVERSION";
export const SourceBranch: string = "BUILD_SOURCEBRANCH";
export const CurrentBuildDefinition: string = "BUILD_DEFINITIONNAME";

export const OAuthAccessToken: string = "SYSTEM_ACCESSTOKEN";

export const RepositoryType: string = "BUILD_REPOSITORY_PROVIDER";
export const TfsRepositoryType: string = "TfsVersionControl";

export const ApiUrl: string = "_apis";

export const AuthenticationMethodOAuthToken: string = "OAuth Token";
export const AuthenticationMethodBasicAuthentication: string = "Basic Authentication";
export const AuthenticationMethodPersonalAccessToken: string = "Personal Access Token";

export interface ITfsRestService {
    initialize(
        authenticationMethod: string, username: string, password: string, tfsServer: string, teamProject: string, ignoreSslError: boolean):
        Promise<void>;
    getBuildsByStatus(buildDefinitionName: string, statusFilter: BuildStatus): Promise<Build[]>;
    triggerBuild(
        buildDefinitionName: string,
        branch: string,
        requestedFor: string,
        sourceVersion: string,
        demands: string[],
        queueId: number,
        buildParameters: string): Promise<Build>;
    downloadArtifacts(buildId: number, downloadDirectory: string): Promise<void>;
    getQueueIdByName(buildQueue: string): Promise<number>;
    getBuildInfo(buildId: number): Promise<Build>;
    areBuildsFinished(triggeredBuilds: number[], failIfNotSuccessful: boolean, failIfPartiallySucceeded: boolean): Promise<boolean>;
    isBuildFinished(buildId: number): Promise<boolean>;
    wasBuildSuccessful(buildId: number): Promise<boolean>;
    getBuildDefinitionId(buildDefinitionName: string): Promise<number>;
    getTestRuns(testRunName: string, numberOfRunsToFetch: number): Promise<TestRun[]>;
    getAssociatedChanges(build: Build): Promise<Change[]>;
    cancelBuild(buildId: number): Promise<void>;
}

/* Tfs Rest Service Implementation */
export class TfsRestService implements ITfsRestService {
    vstsBuildApi: IBuildApi = null;
    vstsTestApi: ITestApi = null;
    taskAgentApi: ITaskAgentApi = null;
    teamProjectId: string = "";
    isDebug: boolean = false;
    logDebugFunction: (message: string) => void;

    constructor(debug: boolean = false, logDebugFunction?: (message: string) => void) {
        this.isDebug = debug;
        this.logDebugFunction = logDebugFunction;
    }

    public async initialize(
        authenticationMethod: string, username: string, password: string, tfsServer: string, teamProject: string, ignoreSslError: boolean):
        Promise<void> {
        let authHandler: IRequestHandler;

        switch (authenticationMethod) {
            case AuthenticationMethodOAuthToken:
                console.log("Using OAuth Access Token");
                authHandler = vsts.getBearerHandler(password);
                break;
            case AuthenticationMethodBasicAuthentication:
                console.log("Using Basic Authentication");
                authHandler = vsts.getBasicHandler(username, password);
                break;
            case AuthenticationMethodPersonalAccessToken:
                console.log("Using Personal Access Token");
                authHandler = vsts.getHandlerFromToken(password);
                break;
            default:
                throw new Error("Cannot handle authentication method " + authenticationMethod);
        }

        let authOptions: IRequestOptions = {
            ignoreSslError: ignoreSslError
        };

        let connection: vsts.WebApi = new vsts.WebApi(tfsServer, authHandler, authOptions);
        this.vstsBuildApi = await connection.getBuildApi();
        this.vstsTestApi = await connection.getTestApi();
        this.taskAgentApi = await connection.getTaskAgentApi();
        var coreApi: ICoreApi = await connection.getCoreApi();

        var projects: TeamProjectReference[] = await coreApi.getProjects();
        projects.forEach(project => {
            if (project.name === teamProject) {
                this.teamProjectId = project.id;
            }
        });

        if (this.teamProjectId === "") {
            throw new Error(`Could not find any Team Project with name ${teamProject}`);
        }
    }

    public async getBuildsByStatus(buildDefinitionName: string, statusFilter: BuildStatus): Promise<Build[]> {
        var buildDefinitionID: number = await this.getBuildDefinitionId(buildDefinitionName);

        var result: Build[] = await this.vstsBuildApi.getBuilds(
            this.teamProjectId, [buildDefinitionID], null, null, null, null, null, null, statusFilter);

        return result;
    }

    public async triggerBuild(
        buildDefinitionName: string,
        branch: string,
        requestedForUserID: string,
        sourceVersion: string,
        demands: string[],
        queueId: number,
        buildParameters: string): Promise<Build> {
        var buildId: number = await this.getBuildDefinitionId(buildDefinitionName);

        var buildToTrigger: any = {
            definition: { id: buildId },
            demands: demands,
            sourceVersion: sourceVersion,
            SourceBranch: branch,
            queue: { id: queueId },
            requestedFor: { id: requestedForUserID },
            parameters: this.buildParameterString(buildParameters)
        };

        var result: Build = await this.vstsBuildApi.queueBuild(buildToTrigger, this.teamProjectId, true);

        return result;
    }

    public async areBuildsFinished(
        triggeredBuilds: number[], failIfNotSuccessful: boolean, treatPartiallySucceededBuildAsSuccessful: boolean): Promise<boolean> {
        var result: boolean = true;
        for (let queuedBuildId of triggeredBuilds) {
            var buildInfo: Build = await this.getBuildInfo(queuedBuildId);
            var buildFinished: boolean = buildInfo.status === BuildStatus.Completed;

            if (!buildFinished) {
                result = false;
            } else {
                result = result && true;
                var buildSuccessful: boolean = buildInfo.result === BuildResult.Succeeded;

                if (!buildSuccessful && treatPartiallySucceededBuildAsSuccessful) {
                    buildSuccessful = buildInfo.result === BuildResult.PartiallySucceeded;
                }

                if (failIfNotSuccessful && !buildSuccessful) {
                    throw new Error(`Build ${queuedBuildId} (${buildInfo.definition.name}) was not successful. See following link for more info: ${buildInfo._links.web.href}`);
                }
            }
        }

        return result;
    }

    public async cancelBuild(buildId: number): Promise<void> {
        var buildInfo: Build = await this.getBuildInfo(buildId);

        if (buildInfo.status === BuildStatus.Completed) {
            console.log(`Build ${buildId} has already finished.`);
            return;
        }

        var requestBody: any = { status: BuildStatus.Cancelling };

        this.vstsBuildApi.updateBuild(requestBody, buildId, this.teamProjectId);
    }

    public async downloadArtifacts(buildId: number, downloadDirectory: string): Promise<void> {
        console.log(`Downloading artifacts for ${buildId}`);

        if (!fs.existsSync(downloadDirectory)) {
            console.log(`Directory ${downloadDirectory} does not exist - will be created`);
            fs.mkdirSync(downloadDirectory);
        }

        if (!downloadDirectory.endsWith("\\")) {
            downloadDirectory += "\\";
        }


        var result: BuildArtifact[] = await this.vstsBuildApi.getArtifacts(buildId, this.teamProjectId);

        if (result.length === 0) {
            console.log(`No artifacts found for build ${buildId} - skipping...`);
        }

        console.log(`Found ${result.length} artifact(s)`);

        for (let artifact of result) {
            if (artifact.resource.type !== "Container") {
                console.log(`Cannot download artifact ${artifact.name}. Only Containers are supported (type is \"${artifact.resource.type}\"`);
                continue;
            }

            console.log(`Downloading artifact ${artifact.name}...`);

            var fileFormat: any = url.parse(artifact.resource.downloadUrl, true).query.$format;

            // if for whatever reason we cannot get the file format from the url just try with zip.
            if (fileFormat === null || fileFormat === undefined) {
                fileFormat = "zip";
            }

            var fileName: string = `${artifact.name}.${fileFormat}`;
            var index: number = 1;

            while (fs.existsSync(`${downloadDirectory}${fileName}`)) {
                console.log(`${fileName} already exists...`);
                fileName = `${artifact.name}${index}.${fileFormat}`;
                index++;
            }

            const artifactStream: NodeJS.ReadableStream = await this.vstsBuildApi.getArtifactContentZip(
                buildId, artifact.name, this.teamProjectId);
            const fileStream: any = fs.createWriteStream(downloadDirectory + fileName);
            artifactStream.pipe(fileStream);
            fileStream.on("close", () => {
                console.log(`Stored artifact here: ${downloadDirectory}${fileName}`);
            });
        }
    }

    public async getTestRuns(testRunName: string, numberOfRunsToFetch: number): Promise<TestRun[]> {
        var testRunSummaries: TestRun[] = await this.vstsTestApi.getTestRuns(this.teamProjectId);

        // reverse to fetch newest to oldest.
        let testRuns: TestRun[] = new List<TestRun>(testRunSummaries)
            .Reverse()
            .Where(x => x !== undefined && x.state === TestRunState.Completed.toString()
                && x.name === testRunName)
            .Take(numberOfRunsToFetch)
            .ToArray();

        // reverse again to get the matching test runs orderd from oldest to newest.
        return testRuns.reverse();
    }

    public async getQueueIdByName(buildQueue: string): Promise<number> {
        var agentQueues: TaskAgentQueue[] = await this.taskAgentApi.getAgentQueues(this.teamProjectId, buildQueue);

        if (agentQueues.length === 1) {
            var agentQueue : TaskAgentQueue = agentQueues[0];
            return agentQueue.id;
        }

        console.error(`No queue found with the name: ${buildQueue}. Following Queues were found (Name (id)):`);
        for (let queue of agentQueues) {
            console.error(`${queue.name} (${queue.id})`);
        }

        throw new Error(`Could not find any Queue with the name ${buildQueue}`);
    }

    public async isBuildFinished(buildId: number): Promise<boolean> {
        var result: Build = await this.getBuildInfo(buildId);

        return result.status === BuildStatus.Completed;
    }

    public async wasBuildSuccessful(buildId: number): Promise<boolean> {
        var result: Build = await this.getBuildInfo(buildId);

        return result.result === BuildResult.Succeeded;
    }

    public async getBuildDefinitionId(buildDefinitionName: string): Promise<number> {

        var result: BuildDefinitionReference[] = await this.vstsBuildApi.getDefinitions(this.teamProjectId, buildDefinitionName);

        if (result.length === 0) {
            throw new Error(`Did not find any build definition with this name: ${buildDefinitionName}`);
        }

        return result[0].id;
    }

    public async getAssociatedChanges(build: Build): Promise<Change[]> {
        var result: Change[] = await this.vstsBuildApi.getBuildChanges(this.teamProjectId, build.id);
        return result;
    }

    public async getBuildInfo(buildId: number): Promise<Build> {

        var build: Build = await this.vstsBuildApi.getBuild(buildId, this.teamProjectId);
        return build;
    }

    private buildParameterString(buildParameters: string): string {
        var buildParameterString: string = "";
        var keyValuePairs: string[] = buildParameters.split(",");
        for (var index: number = 0; index < keyValuePairs.length; index++) {
            var kvp: string = keyValuePairs[index];
            var splittedKvp: string[] = kvp.split(/:(.+)/);
            if (splittedKvp[0] === undefined || splittedKvp[1] === undefined) {
                var errorMessage: string = `Build Parameters were not in expected format. Please verify that parameters are in the following format: \"VariableName: Value\"`;
                console.error(errorMessage);
                console.error(`Specified build parameters: ${buildParameters}`);
                throw new Error(errorMessage);
            }
            var key: string = this.cleanValue(splittedKvp[0]);
            var value: string = this.cleanValue(splittedKvp[1]);
            var checkNextValues: boolean = true;
            while (index < keyValuePairs.length - 1 && checkNextValues) {
                var nextKvp: string = keyValuePairs[index + 1];
                if (nextKvp.indexOf(":") === -1) {
                    // next Value is part of the value and was just separated by comma
                    value += `, ${this.cleanValue(nextKvp)}`;
                    index++;
                } else {
                    checkNextValues = false;
                }
            }
            console.log(`Found parameter ${key} with value: ${value}`);
            buildParameterString += `${this.escapeParametersForRequestBody(key)}: ${this.escapeParametersForRequestBody(value)},`;
        }
        if (buildParameterString.endsWith(",")) {
            buildParameterString = buildParameterString.substr(0, buildParameterString.length - 1);
        }

        return buildParameterString;
    }

    private cleanValue(value: string): string {
        value = value.trim();

        if (value.startsWith("\\\"") && value.endsWith("\\\"")) {
            value = value.substr(2, value.length - 4);
        }

        return value;
    }

    // the parameters have to be escaped specially because they need some special syntax that is (partly) double escaped
    escapeParametersForRequestBody(value: string): string {
        var escapedValue: string = JSON.stringify(value);
        escapedValue = escapedValue.substr(1, escapedValue.length - 2);
        var doubleEscapedValue: string = JSON.stringify(escapedValue);
        doubleEscapedValue = doubleEscapedValue.substr(1, doubleEscapedValue.length - 2);
        return `\\\"${doubleEscapedValue}\\\"`;
    }
}