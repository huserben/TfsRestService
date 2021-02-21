import * as fs from "fs";
import * as url from "url";
import { List } from "linqts";
import path = require('path');
import * as vsts from "azure-devops-node-api";
import * as buildApi from "azure-devops-node-api/BuildApi";
import * as buildInterfaces from "azure-devops-node-api/interfaces/BuildInterfaces";
import * as testInterfaces from "azure-devops-node-api/interfaces/TestInterfaces";
import * as testApi from "azure-devops-node-api/TestApi";
import * as taskAgentApi from "azure-devops-node-api/TaskAgentApi";
import * as coreApi from "azure-devops-node-api/CoreApi";
import * as coreInterfaces from "azure-devops-node-api/interfaces/CoreInterfaces";
import * as taskAgentInterface from "azure-devops-node-api/interfaces/TaskAgentInterfaces";
import * as baseInterfaces from "azure-devops-node-api/interfaces/common/VsoBaseInterfaces";
import { IRequestHandler } from "typed-rest-client/Interfaces";
import Stack from "ts-data.stack";
import common = require("./generalfunctions");

export const TeamFoundationCollectionUri: string = "SYSTEM_TEAMFOUNDATIONCOLLECTIONURI";
export const TeamProject: string = "SYSTEM_TEAMPROJECT";
export const TeamProjectId: string = "SYSTEM_TEAMPROJECTID";

export const RequestedForUsername: string = "BUILD_REQUESTEDFOR";
export const RequestedForUserId: string = "BUILD_REQUESTEDFORID";
export const ReleaseRequestedForUsername: string = "RELEASE_REQUESTEDFOR";
export const ReleaseRequestedForId: string = "RELEASE_REQUESTEDFORID";

export const SourceVersion: string = "BUILD_SOURCEVERSION";
export const SourceBranch: string = "BUILD_SOURCEBRANCH";
export const CurrentBuildDefinition: string = "BUILD_DEFINITIONNAME";

export const OAuthAccessToken: string = "SYSTEM_ACCESSTOKEN";

export const RepositoryType: string = "BUILD_REPOSITORY_PROVIDER";
export const TfsRepositoryType: string = "TfsVersionControl";

export const AuthenticationMethodOAuthToken: string = "OAuth Token";
export const AuthenticationMethodBasicAuthentication: string = "Basic Authentication";
export const AuthenticationMethodPersonalAccessToken: string = "Personal Access Token";

export interface ITfsRestService {
    initialize(
        authenticationMethod: string, username: string, password: string, tfsServer: string, teamProject: string, ignoreSslError: boolean):
        Promise<void>;
    getBuildsByStatus(buildDefinitionName: string, statusFilter?: buildInterfaces.BuildStatus): Promise<buildInterfaces.Build[]>;
    triggerBuild(
        buildDefinitionName: string,
        branch: string,
        requestedFor: string,
        sourceVersion: string,
        demands: string[],
        queueId: number,
        buildParameters: string): Promise<buildInterfaces.Build>;
    downloadArtifacts(buildId: number, downloadDirectory: string): Promise<void>;
    getQueueIdByName(buildQueue: string): Promise<number>;
    getBuildInfo(buildId: number): Promise<buildInterfaces.Build>;
    areBuildsFinished(triggeredBuilds: number[], failIfNotSuccessful: boolean, failIfPartiallySucceeded: boolean): Promise<boolean>;
    isBuildFinished(buildId: number): Promise<boolean>;
    wasBuildSuccessful(buildId: number): Promise<boolean>;
    getBuildDefinitionId(buildDefinitionName: string): Promise<number>;
    getTestRuns(testRunName: string, numberOfRunsToFetch: number): Promise<testInterfaces.TestRun[]>;
    getAssociatedChanges(build: buildInterfaces.Build): Promise<buildInterfaces.Change[]>;
    cancelBuild(buildId: number): Promise<void>;
}

export interface IAzureDevOpsWebApi {
    getBearerHandler(bearerToken: string): IRequestHandler;
    getBasicHandler(username: string, password: string): IRequestHandler;
    getHandlerFromToken(token: string): IRequestHandler;

    initializeConnection(tfsServer: string, authHandler: IRequestHandler, requestOptions: baseInterfaces.IRequestOptions): void;

    getBuildApi(): Promise<buildApi.IBuildApi>;
    getTestApi(): Promise<testApi.ITestApi>;
    getTaskAgentApi(): Promise<taskAgentApi.ITaskAgentApi>;
    getCoreApi(): Promise<coreApi.ICoreApi>;
}

class AzureDevOpsWebApi implements IAzureDevOpsWebApi {
    connection: vsts.WebApi = null;

    public initializeConnection(tfsServer: string, authHandler: IRequestHandler, requestOptions: baseInterfaces.IRequestOptions): void {
        this.connection = new vsts.WebApi(tfsServer, authHandler, requestOptions);
    }

    public async getBuildApi(): Promise<buildApi.IBuildApi> {
        this.verifyConnection();

        return await this.connection.getBuildApi();
    }

    public async getTestApi(): Promise<testApi.ITestApi> {
        this.verifyConnection();

        return await this.connection.getTestApi();
    }

    public async getTaskAgentApi(): Promise<taskAgentApi.ITaskAgentApi> {
        this.verifyConnection();

        return await this.connection.getTaskAgentApi();
    }

    public async getCoreApi(): Promise<coreApi.ICoreApi> {
        this.verifyConnection();

        return await this.connection.getCoreApi();
    }

    public getBearerHandler(bearerToken: string): IRequestHandler {
        return vsts.getBearerHandler(bearerToken);
    }

    public getBasicHandler(username: string, password: string): IRequestHandler {
        return vsts.getBasicHandler(username, password);
    }

    public getHandlerFromToken(token: string): IRequestHandler {
        return vsts.getHandlerFromToken(token);
    }

    private verifyConnection(): void {
        if (this.connection === null) {
            throw new Error("Initialize must be called before api's can be fetched!");
        }
    }
}

/* Tfs Rest Service Implementation */
export class TfsRestService implements ITfsRestService {
    vstsBuildApi: buildApi.IBuildApi = null;
    vstsTestApi: testApi.ITestApi = null;
    taskAgentApi: taskAgentApi.ITaskAgentApi = null;
    teamProjectId: string = "";
    azureDevOpsWebApi: IAzureDevOpsWebApi = null;
    genralFunctions: common.IGeneralFunctions = null;

    constructor(azureDevOpsWebApi?: IAzureDevOpsWebApi, generalFunctions?: common.IGeneralFunctions) {

        if (azureDevOpsWebApi === undefined) {
            azureDevOpsWebApi = new AzureDevOpsWebApi();
        }

        if (generalFunctions === undefined) {
            generalFunctions = new common.GeneralFunctions();
        }

        this.azureDevOpsWebApi = azureDevOpsWebApi;
        this.genralFunctions = generalFunctions;
    }

    public async initialize(
        authenticationMethod: string, username: string, password: string, tfsServer: string, teamProject: string, ignoreSslError: boolean):
        Promise<void> {
        if (teamProject === "" || teamProject === undefined) {
            throw new Error("Team Project has to be defined!");
        }

        this.verifyAuthenticationMethod(authenticationMethod, username, password);

        let authHandler: baseInterfaces.IRequestHandler;

        switch (authenticationMethod) {
            case AuthenticationMethodOAuthToken:
                console.log("Using OAuth Access Token");
                authHandler = this.azureDevOpsWebApi.getBearerHandler(password);
                break;
            case AuthenticationMethodBasicAuthentication:
                console.log("Using Basic Authentication");
                authHandler = this.azureDevOpsWebApi.getBasicHandler(username, password);
                break;
            case AuthenticationMethodPersonalAccessToken:
                console.log("Using Personal Access Token");
                authHandler = this.azureDevOpsWebApi.getHandlerFromToken(password);
                break;
            default:
                throw new Error("Cannot handle authentication method " + authenticationMethod);
        }

        let requestOptions: baseInterfaces.IRequestOptions = {
            ignoreSslError: ignoreSslError
        };

        this.azureDevOpsWebApi.initializeConnection(tfsServer, authHandler, requestOptions);
        this.vstsBuildApi = await this.azureDevOpsWebApi.getBuildApi();
        this.vstsTestApi = await this.azureDevOpsWebApi.getTestApi();
        this.taskAgentApi = await this.azureDevOpsWebApi.getTaskAgentApi();

        await this.setTeamProjectId(this.azureDevOpsWebApi, teamProject);
    }

    public async getBuildsByStatus(buildDefinitionName: string, statusFilter?: buildInterfaces.BuildStatus):
        Promise<buildInterfaces.Build[]> {
        var buildDefinitionID: number = await this.getBuildDefinitionId(buildDefinitionName);

        var result: buildInterfaces.Build[] = await this.vstsBuildApi.getBuilds(
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
        buildParameters: string): Promise<buildInterfaces.Build> {
        var buildId: number = await this.getBuildDefinitionId(buildDefinitionName);

        var buildToTrigger: buildInterfaces.Build = {
            definition: { id: buildId },
            parameters: this.buildParameterString(buildParameters)
        };

        if (branch !== null) {
            buildToTrigger.sourceBranch = branch;
        }

        if (requestedForUserID !== undefined && requestedForUserID !== "") {
            buildToTrigger.requestedFor = { id: requestedForUserID };
        }

        if (sourceVersion !== undefined && sourceVersion !== "") {
            buildToTrigger.sourceVersion = sourceVersion;
        }

        if (queueId !== null && queueId !== undefined) {
            buildToTrigger.queue = { id: queueId };
        }

        if (demands !== null && demands.length > 0) {
            buildToTrigger.demands = [];

            demands.forEach(demand => {
                var demandSplit : string[] = demand.split('=');
                var demandName: string = demandSplit[0].trim();
                var demandValue: string = null;

                if (demandSplit.length > 1){
                    demandValue = demandSplit[1].trim();
                }

                buildToTrigger.demands.push({name: demandName, value: demandValue})
            });
        }

        var result: buildInterfaces.Build = await this.makeRequest(
            () => this.vstsBuildApi.queueBuild(buildToTrigger, this.teamProjectId, true));

        return result;
    }

    public async areBuildsFinished(
        triggeredBuilds: number[], failIfNotSuccessful: boolean, treatPartiallySucceededBuildAsSuccessful: boolean): Promise<boolean> {
        var result: boolean = true;
        for (let queuedBuildId of triggeredBuilds) {
            var buildInfo: buildInterfaces.Build = await this.getBuildInfo(queuedBuildId);
            var buildFinished: boolean = buildInfo.status === buildInterfaces.BuildStatus.Completed;

            if (!buildFinished) {
                result = false;
            } else {
                result = result && true;
                var buildSuccessful: boolean = buildInfo.result === buildInterfaces.BuildResult.Succeeded;

                if (!buildSuccessful && treatPartiallySucceededBuildAsSuccessful) {
                    buildSuccessful = buildInfo.result === buildInterfaces.BuildResult.PartiallySucceeded;
                }

                if (failIfNotSuccessful && !buildSuccessful) {
                    throw new Error(`Build ${queuedBuildId} (${buildInfo.definition.name}) was not successful. See following link for more info: ${buildInfo._links.web.href}`);
                }
            }
        }

        return result;
    }

    public async cancelBuild(buildId: number): Promise<void> {
        var buildInfo: buildInterfaces.Build = await this.getBuildInfo(buildId);

        if (buildInfo.status === buildInterfaces.BuildStatus.Completed) {
            console.log(`Build ${buildId} has already finished.`);
            return;
        }

        var requestBody: any = { status: buildInterfaces.BuildStatus.Cancelling };

        await this.makeRequest(
            () => this.vstsBuildApi.updateBuild(requestBody, this.teamProjectId, buildId));
    }

    public async downloadArtifacts(buildId: number, downloadDirectory: string): Promise<void> {
        console.log(`Downloading artifacts for Build ${buildId}`);

        if (!fs.existsSync(downloadDirectory)) {
            console.log(`Directory ${downloadDirectory} does not exist - will be created`);
            fs.mkdirSync(downloadDirectory);
        }

        var result: buildInterfaces.BuildArtifact[] =
            await this.makeRequest(() => this.vstsBuildApi.getArtifacts(this.teamProjectId, buildId));

        if (result.length === 0) {
            console.log(`No artifacts found for build ${buildId} - skipping...`);
            return;
        }

        console.log(`Found ${result.length} artifact(s)`);

        for (let artifact of result) {
            if (artifact.resource.type.toLowerCase() !== "container") {
                console.log(`Cannot download artifact ${artifact.name}. Only Containers are supported (type is \"${artifact.resource.type}"\)`);
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

            var filePath : string = path.join(downloadDirectory, fileName);

            while (fs.existsSync(filePath)) {
                console.log(`${fileName} already exists...`);
                fileName = `${artifact.name}${index}.${fileFormat}`;
                filePath = path.join(downloadDirectory, fileName);
                index++;
            }

            const artifactStream: NodeJS.ReadableStream = await this.vstsBuildApi.getArtifactContentZip(
                this.teamProjectId, buildId, artifact.name);
            const fileStream: any = fs.createWriteStream(filePath);
            artifactStream.pipe(fileStream);
            fileStream.on("close", () => {
                console.log(`Stored artifact here: ${filePath}`);
            });
        }
    }

    public async getTestRuns(testRunName: string, numberOfRunsToFetch: number): Promise<testInterfaces.TestRun[]> {
        var testRunSummaries: testInterfaces.TestRun[] = await this.makeRequest(() => this.vstsTestApi.getTestRuns(this.teamProjectId));

        // reverse to fetch newest to oldest.
        let testRuns: testInterfaces.TestRun[] = new List<testInterfaces.TestRun>(testRunSummaries)
            .Reverse()
            .Where(x => x !== undefined && x.state === testInterfaces.TestRunState.Completed.toString()
                && x.name === testRunName)
            .Take(numberOfRunsToFetch)
            .ToArray();

        // reverse again to get the matching test runs orderd from oldest to newest.
        return testRuns.reverse();
    }

    public async getQueueIdByName(buildQueue: string): Promise<number> {
        var agentQueues: taskAgentInterface.TaskAgentQueue[] =
            await this.makeRequest(() => this.taskAgentApi.getAgentQueues(this.teamProjectId, buildQueue));

        if (agentQueues.length === 1) {
            var agentQueue: taskAgentInterface.TaskAgentQueue = agentQueues[0];
            return agentQueue.id;
        }

        console.error(`No queue found with the name: ${buildQueue}. Following Queues were found (Name (id)):`);
        for (let queue of agentQueues) {
            console.error(`${queue.name} (${queue.id})`);
        }

        throw new Error(`Could not find any Queue with the name ${buildQueue}`);
    }

    public async isBuildFinished(buildId: number): Promise<boolean> {
        var result: buildInterfaces.Build = await this.getBuildInfo(buildId);

        return result.status === buildInterfaces.BuildStatus.Completed;
    }

    public async wasBuildSuccessful(buildId: number): Promise<boolean> {
        var result: buildInterfaces.Build = await this.getBuildInfo(buildId);

        return result.result === buildInterfaces.BuildResult.Succeeded;
    }

    public async getBuildDefinitionId(buildDefinitionName: string): Promise<number> {

        var result: buildInterfaces.BuildDefinitionReference[] = await this.makeRequest(
            () => this.vstsBuildApi.getDefinitions(this.teamProjectId, buildDefinitionName));

        if (result.length === 0) {
            console.log(`No build definition with name ${buildDefinitionName} found...`);

            var buildId: number = parseInt(buildDefinitionName);

            if (isNaN(buildId)) {
                throw new Error(`Did not find any build definition with this name: ${buildDefinitionName}`);
            }

            console.log(`Specified build name is a number - will treat as build id...`);
            return buildId;
        }

        return result[0].id;
    }

    public async getAssociatedChanges(build: buildInterfaces.Build): Promise<buildInterfaces.Change[]> {
        var result: buildInterfaces.Change[] = await this.makeRequest(
            () => this.vstsBuildApi.getBuildChanges(this.teamProjectId, build.id));
        return result;
    }

    public async getBuildInfo(buildId: number): Promise<buildInterfaces.Build> {

        var build: buildInterfaces.Build = await this.makeRequest(
            () => this.vstsBuildApi.getBuild(this.teamProjectId, buildId));
        return build;
    }

    private buildParameterString(buildParameters: string): string {
        var buildParametersAsDictionary: { [id: string]: string } = {};

        if (buildParameters === null || buildParameters === undefined) {
            return "";
        }

        buildParameters = buildParameters.trim();

        if (buildParameters.startsWith("{") && buildParameters.endsWith("}")) {
            console.log(`Specified Build Parameters are a json object - will be treated as is. Please make sure you handled any kind of escaping etc. yourself.`);
            console.log(`Parameters: ${buildParameters}`);
            return buildParameters;
        }

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

            var openingCurlyBracesStack: Stack<string> = new Stack<string>();

            if (value.startsWith("{")) {
                console.log(`Identified value as Json Object - will use as is`);
                this.updateCurlyBracesStack(openingCurlyBracesStack, value);
            }

            while (index < keyValuePairs.length - 1 && checkNextValues) {
                var nextKvp: string = keyValuePairs[index + 1];
                var nextValue: string = `${this.cleanValue(nextKvp)}`;

                if (!openingCurlyBracesStack.isEmpty()) {
                    value += `, ${nextValue}`;
                    index++;

                    this.updateCurlyBracesStack(openingCurlyBracesStack, nextValue);

                    if (openingCurlyBracesStack.isEmpty()) {
                        checkNextValues = false;
                    }
                } else if (nextKvp.indexOf(":") === -1) {
                    // next Value is part of the value and was just separated by comma
                    value += `, ${nextValue}`;
                    index++;
                } else {
                    checkNextValues = false;
                }
            }
            console.log(`Found parameter ${key} with value: ${value}`);
            buildParametersAsDictionary[key] = value;
        }

        return JSON.stringify(buildParametersAsDictionary);
    }

    private updateCurlyBracesStack(openingCurlyBracesStack: Stack<string>, value: string): void {
        var openingCurlyBracesInValue: number = (value.match(/{/g) || []).length;
        for (var index: number = 0; index < openingCurlyBracesInValue; index++) {
            openingCurlyBracesStack.push("{");
        }

        var closingCurlyBracesInValue: number = (value.match(/}/g) || []).length;
        for (var index: number = 0; index < closingCurlyBracesInValue; index++) {
            openingCurlyBracesStack.pop();
        }
    }

    private cleanValue(value: string): string {
        value = value.trim();

        if (value.startsWith("\\\"") && value.endsWith("\\\"")) {
            value = value.substr(2, value.length - 4);
        }

        return value;
    }

    private async setTeamProjectId(connection: IAzureDevOpsWebApi, teamProject: string): Promise<void> {
        try {
            var guidCheckRegex: RegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (guidCheckRegex.test(teamProject)) {
                console.log("Provided team project was guid.");
                this.teamProjectId = teamProject;
                return;
            }

            console.log("Provided team project was no guid, trying to resolve ID via API...");
            var coreAgentApi: coreApi.ICoreApi = await connection.getCoreApi();
            var projects: coreInterfaces.TeamProjectReference[] = await coreAgentApi.getProjects();

            for (let project of projects) {
                if (project.name === teamProject) {
                    this.teamProjectId = project.id;
                    console.log(`Found id for team project ${teamProject}: ${this.teamProjectId}`);
                    break;
                }
            }
        } catch (err) {
            throw new Error("Could not access projects - you're version of TFS might be too old, please check online for help.");
        }

        if (this.teamProjectId === "") {
            throw new Error(`Could not find any Team Project with name ${teamProject}`);
        }
    }

    private verifyAuthenticationMethod(authenticationMethod: string, username: string, password: string): void {
        switch (authenticationMethod) {
            case AuthenticationMethodOAuthToken:
                if (password === undefined || password === null || password === "") {
                    throw new Error("No valid OAuth token provided. Please check that you have the OAuth Token Access allowed for your builds.");
                }
                break;
            case AuthenticationMethodBasicAuthentication:
                if (username === undefined || username === null || username === "") {
                    throw new Error("No Username provided. Please check that you specified the user correctly in the configuration.");
                }
                if (password === undefined || password === null || password === "") {
                    throw new Error("No password provided. Please check that you specified the password correctly in the configuration.");
                }
                break;
            case AuthenticationMethodPersonalAccessToken:
                if (password === undefined || password === null || password === "") {
                    throw new Error("No valid Personal Access Token provided. Please check that you specified the token to be used correctly in the configuration.");
                }
                break;
        }
    }

    private async makeRequest<T>(requestFunction: () => Promise<T>): Promise<T> {
        var maxRequestTryCount: number = 5;
        var maxWaitingTime: number = 64;

        for (var requestCount: number = 0; requestCount < maxRequestTryCount; requestCount++) {
            try {
                return await requestFunction();
            } catch (error) {
                console.log(`Error during request (${requestCount + 1}/${maxRequestTryCount})`);
                console.log(`Error message: ${error}`);

                if (requestCount < maxRequestTryCount - 1) {
                    var waitTimeInSeconds: number = Math.pow(2, requestCount);

                    if (waitTimeInSeconds > maxWaitingTime) {
                        waitTimeInSeconds = maxWaitingTime;
                    }

                    console.log(`Will wait ${waitTimeInSeconds} seconds before retrying request...`);
                    await this.genralFunctions.sleep(waitTimeInSeconds * 1000);
                }
            }
        }

        throw new Error(`Request failed after ${maxRequestTryCount} tries - see error messages in the log`);
    }
}