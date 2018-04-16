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
export const BuildResultPartiallySucceeded: string = "partiallySucceeded";

export const TestRunStateCompleted: string = "Completed";
export const TestRunOutcomePassed: string = "Passed";

/* Interfaces that are exported */
export interface IBuild {
    name: string;
    id: string;
    result: string;
    status: string;
    definition: {
        name: string;
    };
    _links: {
        web: {
            href: string;
        };
    };
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
    getBuildInfo(buildId: string): Promise<IBuild>;
    areBuildsFinished(triggeredBuilds: string[], failIfNotSuccessful: boolean, failIfPartiallySucceeded: boolean): Promise<boolean>;
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

    formatBuildParameters(buildParmeters: string): string;
}

/* Tfs Rest Service Implementation */
export class TfsRestService implements ITfsRestService {
    options: WebRequest.RequestOptions = {};
    isDebug: boolean = false;
    logDebugFunction: (message: string) => void;

    constructor(debug: boolean = false, logDebugFunction?: (message: string) => void) {
        this.isDebug = debug;
        this.logDebugFunction = logDebugFunction;
    }

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
        this.options.throwResponseError = true;
    }

    public async getBuildsByStatus(buildDefinitionName: string, statusFilter: string): Promise<IBuild[]> {
        var buildDefinitionID: string = await this.getBuildDefinitionId(buildDefinitionName);

        var requestUrl: string =
            `build/builds?api-version=2.0&definitions=${buildDefinitionID}&statusFilter=${statusFilter}`;

        var result: ITfsGetResponse<IBuild> =
            await this.sendGetRequest<ITfsGetResponse<IBuild>>(requestUrl);

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
        var queueBuildUrl: string = "build/builds?api-version=2.0&ignoreWarnings=true";

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
            var formatBuildParameters: string = queueBuildBody.formatBuildParameters(buildParameters);

            splittedBody.splice(splittedBody.lastIndexOf("}"), 1, `, ${formatBuildParameters}}`);
            escapedBuildBody = splittedBody.join("");
        }

        console.log(`Queue new Build for definition ${buildDefinitionName}`);
        this.logDebug("Sending Request to following url:");
        this.logDebug(queueBuildUrl);
        this.logDebug(`Request Body: ${escapedBuildBody}`);

        var result: WebRequest.Response<string> = await WebRequest.post(queueBuildUrl, this.options, escapedBuildBody);

        this.logDebug("Result");
        this.logDebug(JSON.stringify(result));

        var responseAsJson: any = JSON.parse(result.content);
        var triggeredBuildID: string = responseAsJson.id;

        // if we are not able to fetch the expected JSON it means something went wrong and we got back some exception from TFS.
        if (triggeredBuildID === undefined) {
            this.handleFailedQueueRequest(responseAsJson);
        } else {
            var validationResults: IValidationResult[] = responseAsJson.validationResults;
            if (validationResults !== undefined) {
                this.logValidationResults(validationResults);
            }
        }


        return triggeredBuildID;
    }

    public async areBuildsFinished(
        triggeredBuilds: string[], failIfNotSuccessful: boolean, treatPartiallySucceededBuildAsSuccessful: boolean): Promise<boolean> {
        var result: boolean = true;
        for (let queuedBuildId of triggeredBuilds) {
            var buildInfo: IBuild = await this.getBuildInfo(queuedBuildId);
            var buildFinished: boolean = buildInfo.status === BuildStateCompleted;

            if (!buildFinished) {
                result = false;
            } else {
                result = result && true;
                var buildSuccessful: boolean = buildInfo.result === BuildResultSucceeded;

                if (!buildSuccessful && treatPartiallySucceededBuildAsSuccessful) {
                    buildSuccessful = buildInfo.result === BuildResultPartiallySucceeded;
                }

                if (failIfNotSuccessful && !buildSuccessful) {
                    throw new Error(`Build ${queuedBuildId} (${buildInfo.definition.name}) was not successful. See following link for more info: ${buildInfo._links.web.href}`);
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

        var result: ITfsGetResponse<IArtifact> = await this.sendGetRequest<ITfsGetResponse<IArtifact>>(requestUrl);

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
            .Where(x => x !== undefined && x.state.toLowerCase() === TestRunStateCompleted.toLowerCase()
                && x.name === testRunName)
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

        var result: ITfsGetResponse<IQueue> = await this.sendGetRequest<ITfsGetResponse<IQueue>>(requestUrl);
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
        var result: IBuild = await this.getBuildInfo(buildId);

        return result.status === BuildStateCompleted;
    }

    public async wasBuildSuccessful(buildId: string): Promise<boolean> {
        var result: IBuild = await this.getBuildInfo(buildId);

        return result.result === BuildResultSucceeded;
    }

    public async getBuildDefinitionId(buildDefinitionName: string): Promise<string> {
        var requestUrl: string = `build/definitions?api-version=2.0&name=${encodeURIComponent(buildDefinitionName)}`;

        var result: ITfsGetResponse<IBuild> =
            await this.sendGetRequest<ITfsGetResponse<IBuild>>(requestUrl);

        this.throwIfAuthenticationError(result);

        if (result.count === 0) {
            throw new Error(`Did not find any build definition with this name: ${buildDefinitionName}
            - checked following url: ${this.options.baseUrl}${requestUrl}`);
        }

        return result.value[0].id;
    }

    public async getAssociatedChanges(build: IBuild): Promise<IChange[]> {
        var requestUrl: string = `build/builds/${build.id}/changes?api-version=2.0`;
        var result: ITfsGetResponse<IChange> = await this.sendGetRequest<ITfsGetResponse<IChange>>(requestUrl);

        this.throwIfAuthenticationError(result);

        return result.value;
    }

    public async getBuildInfo(buildId: string): Promise<IBuild> {
        var requestUrl: string = `build/builds/${buildId}?api-version=2.0`;

        var buildInfo: IBuild = await this.sendGetRequest<IBuild>(requestUrl);
        return buildInfo;
    }

    private async sendGetRequest<T>(requestUrl: string): Promise<T> {
        var retryIndex: number = 1;
        this.logDebug("Sending Request to following url:");
        this.logDebug(requestUrl);

        var requestError: string = "";

        while (retryIndex < 6) {
            try {
                var result: T =
                    await WebRequest.json<T>(requestUrl, this.options);

                this.logDebug("Result:");
                this.logDebug(JSON.stringify(result));

                return result;
            } catch (error) {
                this.logDebug(`An error happened during the request (Try ${retryIndex}/5)`);
                this.logDebug(error);

                requestError = error;
                retryIndex++;
            }
        }

        console.log("Request was not successful.");
        console.log(requestError);
    }

    private handleFailedQueueRequest(responseAsJson: any): void {
        var validationResults: IValidationResult[] = responseAsJson.ValidationResults;
        if (validationResults === undefined) {
            // in case something else failed try fetch just a message:
            var errorMessage: string = responseAsJson.message;

            if (errorMessage !== undefined) {
                console.error(errorMessage);
            } else {
                console.error("Unknown error - printing complete return value from server.");
                console.error(`Consider raising an issue at github if problem cannot be solved.`);
                console.error(responseAsJson);
            }
        } else {
            console.error("Could not queue the build because there were validation errors or warnings.");
        }

        throw new Error(`Could not Trigger build. See console for more Information.`);
    }

    private logValidationResults(validationResults: IValidationResult[]): void {
        if (validationResults === undefined) {
            return;
        }

        validationResults.forEach(validation => {
            if (validation.result === "error") {
                console.error(`${validation.result}: ${validation.message}`);
            } else if (validation.result === "warning") {
                console.log(`${validation.result}: ${validation.message}`);
            }
        });
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

    private logDebug(message: any): void {
        if (this.isDebug) {
            if (this.logDebugFunction !== undefined) {
                this.logDebugFunction(message);
            } else {
                console.log(`###DEBUG: ${message}`);
            }
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

    formatBuildParameters(buildParameters: string): string {
        var buildParameterString: string = "";

        var keyValuePairs: string[] = buildParameters.split(",");

        for (var index: number = 0; index < keyValuePairs.length; index++) {
            var kvp: string = keyValuePairs[index];

            var splittedKvp: string[] = kvp.split(/:(.+)/);

            if (splittedKvp.length !== 2) {
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

        return `\"parameters\": \"{${buildParameterString}}\"`;
    }

    cleanValue(value: string): string {
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