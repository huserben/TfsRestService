import * as WebRequest from "web-request";
import * as fs from "fs";
import * as url from "url";
import { List } from "linqts";

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

export const BuildStateNotStarted: string = "notStarted";
export const BuildStateInProgress: string = "inProgress";
export const BuildStateCompleted: string = "completed";
export const BuildResultSucceeded: string = "succeeded";

export const TestRunStateCompleted: string = "Completed";
export const TestRunOutcomePassed: string = "Passed";

/* Interfaces that are exported */
export interface IBuild {
    name: string;
    id: string;
    result: string;
    status: string;
}

export interface ITfsRestService {
    initialize(authenticationMethod: string, username: string, password: string, tfsServer: string, ignoreSslError: boolean): void;
    getBuildsByStatus(buildDefinitionName: string, statusFilter: string): Promise<IBuild[]>;
    triggerBuild(
        buildDefinitionName: string,
        branch: string,
        requestedFor: string,
        sourceVersion: string,
        demands: string[],
        queueId: number,
        buildParameters: string): Promise<string>;
    downloadArtifacts(buildId: string, downloadDirectory: string): Promise<void>;
    getQueueIdByName(buildQueue: string): Promise<number>;
    areBuildsFinished(triggeredBuilds: string[], failIfNotSuccessful: boolean): Promise<boolean>;
    isBuildFinished(buildId: string): Promise<boolean>;
    wasBuildSuccessful(buildId: string): Promise<boolean>;
    getBuildDefinitionId(buildDefinitionName: string): Promise<string>;
    getTestRuns(testRunName: string, numberOfRunsToFetch: number): Promise<ITestRun[]>;
    getTestResults(testRun: ITestRun): Promise<ITestResult[]>;
    getAssociatedChanges(build: IBuild): Promise<IChange[]>;
}

export interface ITestRun {
    id: number;
    buildConfiguration: {
        id: number;
        buildDefinitionId: string;
    };
    runStatistics: [{
        state: string;
        outcome: string;
    }];
}

export interface ITestResult {
    state: string;
    outcome: string;
    durationInMs: number;
    testCaseTitle: string;
    startedDate: string;
}

export interface IChange {
    id: string;
    message: string;
    type: string;
    author: {
        id: string;
        displayName: string;
    };
    location: string;
}
// internally used interfaces for json objects returned by REST request.
interface ITfsGetResponse<T> {
    count: number;
    value: T[];
}

interface IQueue {
    id: number;
    name: string;
}

interface IArtifact {
    id: string;
    name: string;
    resource: IArtifactResource;
}

interface IArtifactResource {
    downloadUrl: string;
    type: string;
}

interface IValidationResult {
    result: string;
    message: string;
}

interface ITestRunSummary {
    id: number;
    name: string;
    startedDate: string;
    state: string;
}

interface IQueueBuildBody {
    definition: {
        id: number
    };
    sourceBranch: string;
    requestedFor: {
        id: string
    };
    sourceVersion: string;
    queue: {
        id: number
    };
    demands: string[];
}

/* Tfs Rest Service Implementation */
export class TfsRestService implements ITfsRestService {
    options: WebRequest.RequestOptions;

    public initialize(authenticationMethod: string, username: string, password: string, tfsServer: string, ignoreSslError: boolean): void {
        var baseUrl: string = `${encodeURI(tfsServer)}/${ApiUrl}/`;

        switch (authenticationMethod) {
            case AuthenticationMethodOAuthToken:
                console.log("Using OAuth Access Token");
                this.options = {
                    auth: {
                        bearer: password
                    }
                };
                break;
            case AuthenticationMethodBasicAuthentication:
                console.log("Using Basic Authentication");
                this.options = {
                    auth: {
                        user: username,
                        password: password
                    }
                };

                break;
            case AuthenticationMethodPersonalAccessToken:
                console.log("Using Personal Access Token");

                this.options = {
                    auth: {
                        user: "whatever",
                        password: password
                    }
                };
                break;
            default:
                throw new Error("Cannot handle authentication method " + authenticationMethod);
        }

        this.options.headers = {
            "Content-Type": "application/json"
        };
        this.options.baseUrl = baseUrl;
        this.options.agentOptions = { rejectUnauthorized: !ignoreSslError };
        this.options.encoding = "utf-8";
    }

    public async getBuildsByStatus(buildDefinitionName: string, statusFilter: string): Promise<IBuild[]> {
        var buildDefinitionID: string = await this.getBuildDefinitionId(buildDefinitionName);

        var requestUrl: string =
            `build/builds?api-version=2.0&definitions=${buildDefinitionID}&statusFilter=${statusFilter}`;

        var result: ITfsGetResponse<IBuild> =
            await WebRequest.json<ITfsGetResponse<IBuild>>(requestUrl, this.options);

        return result.value;
    }

    public async triggerBuild(
        buildDefinitionName: string,
        branch: string,
        requestedForUserID: string,
        sourceVersion: string,
        demands: string[],
        queueId: number,
        buildParameters: string): Promise<string> {
        var buildId: string = await this.getBuildDefinitionId(buildDefinitionName);
        var queueBuildUrl: string = "build/builds?api-version=2.0";

        var queueBuildBody: IQueueBuildBody = new QueueBuildBody(parseInt(buildId, 10));

        if (branch !== null) {
            queueBuildBody.sourceBranch = branch;
        }

        if (requestedForUserID !== undefined && requestedForUserID !== "") {
            queueBuildBody.requestedFor = { id: requestedForUserID };
        }

        if (sourceVersion !== undefined && sourceVersion !== "") {
            queueBuildBody.sourceVersion = sourceVersion;
        }

        if (queueId !== null && queueId !== undefined) {
            queueBuildBody.queue = { id: queueId };
        }

        if (demands !== null && demands.length > 0) {
            queueBuildBody.demands = [];
            demands.forEach(demand => queueBuildBody.demands.push(demand));
        }

        var escapedBuildBody: string = JSON.stringify(queueBuildBody);

        // parameters should not be escaped like the rest due to the special syntax...
        if (buildParameters !== null) {
            // remove last "}" and instead add the parameter attribute
            var splittedBody: string[] = escapedBuildBody.split("");
            splittedBody.splice(splittedBody.lastIndexOf("}"), 1, `, parameters: \"{${buildParameters}}\"`);
            escapedBuildBody = splittedBody.join("");
        }

        console.log(`Queue new Build for definition ${buildDefinitionName}`);
        console.log(`Request Body: ${escapedBuildBody}`);

        var result: WebRequest.Response<string> = await WebRequest.post(queueBuildUrl, this.options, escapedBuildBody);

        var resultAsJson: any = JSON.parse(result.content);
        var triggeredBuildID: string = resultAsJson.id;

        // if we are not able to fetch the expected JSON it means something went wrong and we got back some exception from TFS.
        if (triggeredBuildID === undefined) {
            this.handleValidationError(resultAsJson);
        }

        return triggeredBuildID;
    }

    public async areBuildsFinished(triggeredBuilds: string[], failIfNotSuccessful: boolean): Promise<boolean> {
        var result: boolean = true;
        for (let queuedBuildId of triggeredBuilds) {
            var buildFinished: boolean = await this.isBuildFinished(queuedBuildId);

            if (!buildFinished) {
                console.log(`Build ${queuedBuildId} has not yet completed`);
                result = false;
            } else {
                result = result && true;
                console.log(`Build ${queuedBuildId} has completed`);
                var buildSuccessful: boolean = await this.wasBuildSuccessful(queuedBuildId);

                if (failIfNotSuccessful && !buildSuccessful) {
                    throw new Error(`Build ${queuedBuildId} was not successful - failing task.`);
                }
            }
        }

        return result;
    }

    public async downloadArtifacts(buildId: string, downloadDirectory: string): Promise<void> {
        console.log(`Downloading artifacts for ${buildId}`);

        if (!fs.existsSync(downloadDirectory)) {
            console.log(`Directory ${downloadDirectory} does not exist - will be created`);
            fs.mkdirSync(downloadDirectory);
        }

        if (!downloadDirectory.endsWith("\\")) {
            downloadDirectory += "\\";
        }

        var requestUrl: string = `build/builds/${buildId}/artifacts`;
        var result: ITfsGetResponse<IArtifact> = await WebRequest.json<ITfsGetResponse<IArtifact>>(requestUrl, this.options);

        if (result.count === undefined) {
            console.log(`No artifacts found for build ${buildId} - skipping...`);
        }

        console.log(`Found ${result.count} artifact(s)`);

        for (let artifact of result.value) {
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

            var fileRequestOptions: WebRequest.RequestOptions = {};
            fileRequestOptions.auth = this.options.auth;
            fileRequestOptions.baseUrl = "";
            fileRequestOptions.agentOptions = { rejectUnauthorized: this.options.agentOptions.rejectUnauthorized };
            fileRequestOptions.headers = {
                "Content-Type": `application/${fileFormat}`
            };
            fileRequestOptions.encoding = null;

            var request: WebRequest.Request<void> = await WebRequest.stream(artifact.resource.downloadUrl, fileRequestOptions);
            await request.pipe(fs.createWriteStream(downloadDirectory + fileName));

            console.log(`Stored artifact here: ${downloadDirectory}${fileName}`);
        }
    }

    public async getTestRuns(testRunName: string, numberOfRunsToFetch: number): Promise<ITestRun[]> {
        var testRunsUrl: string = `test/runs`;

        var testRunSummaries: ITfsGetResponse<ITestRunSummary> =
            await WebRequest.json<ITfsGetResponse<ITestRunSummary>>(testRunsUrl, this.options);
        this.throwIfAuthenticationError(testRunSummaries);

        var testRunsToReturn: ITestRun[] = [];

        // reverse to fetch newest to oldest.
        let testSummariesToGetResultsFor: ITestRunSummary[] = new List<ITestRunSummary>(testRunSummaries.value)
            .Reverse()
            .Where(x => x !== undefined && x.name === testRunName)
            .ToArray();

        for (let testSummary of testSummariesToGetResultsFor) {
            var testRun: ITestRun = await WebRequest.json<ITestRun>(`${testRunsUrl}/${testSummary.id}`, this.options);

            testRunsToReturn.push(testRun);

            if (testRunsToReturn.length >= numberOfRunsToFetch) {
                break;
            }
        }

        // reverse again to get the matching test runs orderd from oldest to newest.
        return testRunsToReturn.reverse();
    }

    public async getTestResults(testRun: ITestRun): Promise<ITestResult[]> {
        var requestUrl: string = `test/runs/${testRun.id}/results`;

        var results: ITfsGetResponse<ITestResult> = await WebRequest.json<ITfsGetResponse<ITestResult>>(requestUrl, this.options);

        this.throwIfAuthenticationError(results);

        return results.value;
    }

    public async getQueueIdByName(buildQueue: string): Promise<number> {
        var requestUrl: string = `distributedtask/queues`;
        var result: ITfsGetResponse<IQueue> = await WebRequest.json<ITfsGetResponse<IQueue>>(requestUrl, this.options);

        this.throwIfAuthenticationError(result);

        for (let queue of result.value) {
            if (queue.name.toLowerCase() === buildQueue.toLowerCase()) {
                return queue.id;
            }
        }

        console.error(`No queue found with the name: ${buildQueue}. Following Queues were found (Name (id)):`);
        for (let queue of result.value) {
            console.error(`${queue.name} (${queue.id})`);
        }

        throw new Error(`Could not find any Queue with the name ${buildQueue}`);
    }

    public async isBuildFinished(buildId: string): Promise<boolean> {
        var requestUrl: string = `build/builds/${buildId}?api-version=2.0`;
        var result: IBuild =
            await WebRequest.json<IBuild>(requestUrl, this.options);

        return result.status === BuildStateCompleted;
    }

    public async wasBuildSuccessful(buildId: string): Promise<boolean> {
        var requestUrl: string = `build/builds/${buildId}?api-version=2.0`;
        var result: IBuild =
            await WebRequest.json<IBuild>(requestUrl, this.options);

        return result.result === BuildResultSucceeded;
    }

    public async getBuildDefinitionId(buildDefinitionName: string): Promise<string> {
        var requestUrl: string = `build/definitions?api-version=2.0&name=${encodeURIComponent(buildDefinitionName)}`;

        var result: ITfsGetResponse<IBuild> =
            await WebRequest.json<ITfsGetResponse<IBuild>>(requestUrl, this.options);

        this.throwIfAuthenticationError(result);

        if (result.count === 0) {
            throw new Error(`Did not find any build definition with this name: ${buildDefinitionName}
            - checked following url: ${this.options.baseUrl}${requestUrl}`);
        }

        return result.value[0].id;
    }

    public async getAssociatedChanges(build: IBuild): Promise<IChange[]> {
        var requestUrl: string = `build/builds/${build.id}/changes?api-version=2.0`;

        var result: ITfsGetResponse<IChange> =
            await WebRequest.json<ITfsGetResponse<IChange>>(requestUrl, this.options);

        this.throwIfAuthenticationError(result);

        return result.value;
    }

    private handleValidationError(resultAsJson: any): void {
        var validationResults: IValidationResult[] = resultAsJson.ValidationResults;
        if (validationResults === undefined) {
            // in case something else failed try fetch just a message:
            var errorMessage: string = resultAsJson.message;

            if (errorMessage !== undefined) {
                console.error(errorMessage);
            } else {
                console.error("Unknown error - printing complete return value from server.");
                console.error(`Consider raising an issue at github if problem cannot be solved.`);
                console.error(resultAsJson);
            }
        } else {
            console.error("Could not queue the build because there were validation errors or warnings:");
            validationResults.forEach(validation => {
                if (validation.result !== "ok") {
                    console.error(`${validation.result}: ${validation.message}`);
                }
            });
        }

        throw new Error(`Could not Trigger build. See console for more Information.`);
    }

    private throwIfAuthenticationError<T>(result: ITfsGetResponse<T>): void {
        if (result === undefined || result.value === undefined) {
            console.log("Authentication failed - please make sure your settings are correct.");
            console.log("If you use the OAuth Token, make sure you enabled the access to it on the Build Definition.");
            console.log("If you use a Personal Access Token, make sure it did not expire.");
            console.log("If you use Basic Authentication, make sure alternate credentials are enabled on your TFS/VSTS.");
            throw new Error(`Authentication with TFS Server failed. Please check your settings.`);
        }
    }
}

class QueueBuildBody implements IQueueBuildBody {

    constructor(id: number) {
        this.definition = {
            id: id
        };
    }

    definition: { id: number; };
    sourceBranch: string;
    requestedFor: { id: string; };
    sourceVersion: string;
    queue: { id: number; };
    demands: string[];
}