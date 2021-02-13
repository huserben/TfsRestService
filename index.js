"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TfsRestService = exports.AuthenticationMethodPersonalAccessToken = exports.AuthenticationMethodBasicAuthentication = exports.AuthenticationMethodOAuthToken = exports.TfsRepositoryType = exports.RepositoryType = exports.OAuthAccessToken = exports.CurrentBuildDefinition = exports.SourceBranch = exports.SourceVersion = exports.ReleaseRequestedForId = exports.ReleaseRequestedForUsername = exports.RequestedForUserId = exports.RequestedForUsername = exports.TeamProjectId = exports.TeamProject = exports.TeamFoundationCollectionUri = void 0;
const fs = require("fs");
const url = require("url");
const linqts_1 = require("linqts");
const vsts = require("azure-devops-node-api");
const buildInterfaces = require("azure-devops-node-api/interfaces/BuildInterfaces");
const testInterfaces = require("azure-devops-node-api/interfaces/TestInterfaces");
const ts_data_stack_1 = require("ts-data.stack");
const common = require("./generalfunctions");
exports.TeamFoundationCollectionUri = "SYSTEM_TEAMFOUNDATIONCOLLECTIONURI";
exports.TeamProject = "SYSTEM_TEAMPROJECT";
exports.TeamProjectId = "SYSTEM_TEAMPROJECTID";
exports.RequestedForUsername = "BUILD_REQUESTEDFOR";
exports.RequestedForUserId = "BUILD_REQUESTEDFORID";
exports.ReleaseRequestedForUsername = "RELEASE_REQUESTEDFOR";
exports.ReleaseRequestedForId = "RELEASE_REQUESTEDFORID";
exports.SourceVersion = "BUILD_SOURCEVERSION";
exports.SourceBranch = "BUILD_SOURCEBRANCH";
exports.CurrentBuildDefinition = "BUILD_DEFINITIONNAME";
exports.OAuthAccessToken = "SYSTEM_ACCESSTOKEN";
exports.RepositoryType = "BUILD_REPOSITORY_PROVIDER";
exports.TfsRepositoryType = "TfsVersionControl";
exports.AuthenticationMethodOAuthToken = "OAuth Token";
exports.AuthenticationMethodBasicAuthentication = "Basic Authentication";
exports.AuthenticationMethodPersonalAccessToken = "Personal Access Token";
class AzureDevOpsWebApi {
    constructor() {
        this.connection = null;
    }
    initializeConnection(tfsServer, authHandler, requestOptions) {
        this.connection = new vsts.WebApi(tfsServer, authHandler, requestOptions);
    }
    getBuildApi() {
        return __awaiter(this, void 0, void 0, function* () {
            this.verifyConnection();
            return yield this.connection.getBuildApi();
        });
    }
    getTestApi() {
        return __awaiter(this, void 0, void 0, function* () {
            this.verifyConnection();
            return yield this.connection.getTestApi();
        });
    }
    getTaskAgentApi() {
        return __awaiter(this, void 0, void 0, function* () {
            this.verifyConnection();
            return yield this.connection.getTaskAgentApi();
        });
    }
    getCoreApi() {
        return __awaiter(this, void 0, void 0, function* () {
            this.verifyConnection();
            return yield this.connection.getCoreApi();
        });
    }
    getBearerHandler(bearerToken) {
        return vsts.getBearerHandler(bearerToken);
    }
    getBasicHandler(username, password) {
        return vsts.getBasicHandler(username, password);
    }
    getHandlerFromToken(token) {
        return vsts.getHandlerFromToken(token);
    }
    verifyConnection() {
        if (this.connection === null) {
            throw new Error("Initialize must be called before api's can be fetched!");
        }
    }
}
class TfsRestService {
    constructor(azureDevOpsWebApi, generalFunctions) {
        this.vstsBuildApi = null;
        this.vstsTestApi = null;
        this.taskAgentApi = null;
        this.teamProjectId = "";
        this.azureDevOpsWebApi = null;
        this.genralFunctions = null;
        if (azureDevOpsWebApi === undefined) {
            azureDevOpsWebApi = new AzureDevOpsWebApi();
        }
        if (generalFunctions === undefined) {
            generalFunctions = new common.GeneralFunctions();
        }
        this.azureDevOpsWebApi = azureDevOpsWebApi;
        this.genralFunctions = generalFunctions;
    }
    initialize(authenticationMethod, username, password, tfsServer, teamProject, ignoreSslError) {
        return __awaiter(this, void 0, void 0, function* () {
            if (teamProject === "" || teamProject === undefined) {
                throw new Error("Team Project has to be defined!");
            }
            this.verifyAuthenticationMethod(authenticationMethod, username, password);
            let authHandler;
            switch (authenticationMethod) {
                case exports.AuthenticationMethodOAuthToken:
                    console.log("Using OAuth Access Token");
                    authHandler = this.azureDevOpsWebApi.getBearerHandler(password);
                    break;
                case exports.AuthenticationMethodBasicAuthentication:
                    console.log("Using Basic Authentication");
                    authHandler = this.azureDevOpsWebApi.getBasicHandler(username, password);
                    break;
                case exports.AuthenticationMethodPersonalAccessToken:
                    console.log("Using Personal Access Token");
                    authHandler = this.azureDevOpsWebApi.getHandlerFromToken(password);
                    break;
                default:
                    throw new Error("Cannot handle authentication method " + authenticationMethod);
            }
            let requestOptions = {
                ignoreSslError: ignoreSslError
            };
            this.azureDevOpsWebApi.initializeConnection(tfsServer, authHandler, requestOptions);
            this.vstsBuildApi = yield this.azureDevOpsWebApi.getBuildApi();
            this.vstsTestApi = yield this.azureDevOpsWebApi.getTestApi();
            this.taskAgentApi = yield this.azureDevOpsWebApi.getTaskAgentApi();
            yield this.setTeamProjectId(this.azureDevOpsWebApi, teamProject);
        });
    }
    getBuildsByStatus(buildDefinitionName, statusFilter) {
        return __awaiter(this, void 0, void 0, function* () {
            var buildDefinitionID = yield this.getBuildDefinitionId(buildDefinitionName);
            var result = yield this.vstsBuildApi.getBuilds(this.teamProjectId, [buildDefinitionID], null, null, null, null, null, null, statusFilter);
            return result;
        });
    }
    triggerBuild(buildDefinitionName, branch, requestedForUserID, sourceVersion, demands, queueId, buildParameters) {
        return __awaiter(this, void 0, void 0, function* () {
            var buildId = yield this.getBuildDefinitionId(buildDefinitionName);
            var buildToTrigger = {
                definition: { id: buildId },
                parameters: this.buildParameterString(buildParameters)
            };
            if (branch !== null) {
                buildToTrigger.SourceBranch = branch;
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
                buildToTrigger.demands = demands;
            }
            var result = yield this.makeRequest(() => this.vstsBuildApi.queueBuild(buildToTrigger, this.teamProjectId, true));
            return result;
        });
    }
    areBuildsFinished(triggeredBuilds, failIfNotSuccessful, treatPartiallySucceededBuildAsSuccessful) {
        return __awaiter(this, void 0, void 0, function* () {
            var result = true;
            for (let queuedBuildId of triggeredBuilds) {
                var buildInfo = yield this.getBuildInfo(queuedBuildId);
                var buildFinished = buildInfo.status === buildInterfaces.BuildStatus.Completed;
                if (!buildFinished) {
                    result = false;
                }
                else {
                    result = result && true;
                    var buildSuccessful = buildInfo.result === buildInterfaces.BuildResult.Succeeded;
                    if (!buildSuccessful && treatPartiallySucceededBuildAsSuccessful) {
                        buildSuccessful = buildInfo.result === buildInterfaces.BuildResult.PartiallySucceeded;
                    }
                    if (failIfNotSuccessful && !buildSuccessful) {
                        throw new Error(`Build ${queuedBuildId} (${buildInfo.definition.name}) was not successful. See following link for more info: ${buildInfo._links.web.href}`);
                    }
                }
            }
            return result;
        });
    }
    cancelBuild(buildId) {
        return __awaiter(this, void 0, void 0, function* () {
            var buildInfo = yield this.getBuildInfo(buildId);
            if (buildInfo.status === buildInterfaces.BuildStatus.Completed) {
                console.log(`Build ${buildId} has already finished.`);
                return;
            }
            var requestBody = { status: buildInterfaces.BuildStatus.Cancelling };
            yield this.makeRequest(() => this.vstsBuildApi.updateBuild(requestBody, this.teamProjectId, buildId));
        });
    }
    downloadArtifacts(buildId, downloadDirectory) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Downloading artifacts for Build ${buildId}`);
            if (!fs.existsSync(downloadDirectory)) {
                console.log(`Directory ${downloadDirectory} does not exist - will be created`);
                fs.mkdirSync(downloadDirectory);
            }
            if (!downloadDirectory.endsWith("\\")) {
                downloadDirectory += "\\";
            }
            var result = yield this.makeRequest(() => this.vstsBuildApi.getArtifacts(this.teamProjectId, buildId));
            if (result.length === 0) {
                console.log(`No artifacts found for build ${buildId} - skipping...`);
                return;
            }
            console.log(`Found ${result.length} artifact(s)`);
            for (let artifact of result) {
                if (artifact.resource.type !== "Container") {
                    console.log(`Cannot download artifact ${artifact.name}. Only Containers are supported (type is \"${artifact.resource.type}\)"`);
                    continue;
                }
                console.log(`Downloading artifact ${artifact.name}...`);
                var fileFormat = url.parse(artifact.resource.downloadUrl, true).query.$format;
                if (fileFormat === null || fileFormat === undefined) {
                    fileFormat = "zip";
                }
                var fileName = `${artifact.name}.${fileFormat}`;
                var index = 1;
                while (fs.existsSync(`${downloadDirectory}${fileName}`)) {
                    console.log(`${fileName} already exists...`);
                    fileName = `${artifact.name}${index}.${fileFormat}`;
                    index++;
                }
                const artifactStream = yield this.vstsBuildApi.getArtifactContentZip(this.teamProjectId, buildId, artifact.name);
                const fileStream = fs.createWriteStream(downloadDirectory + fileName);
                artifactStream.pipe(fileStream);
                fileStream.on("close", () => {
                    console.log(`Stored artifact here: ${downloadDirectory}${fileName}`);
                });
            }
        });
    }
    getTestRuns(testRunName, numberOfRunsToFetch) {
        return __awaiter(this, void 0, void 0, function* () {
            var testRunSummaries = yield this.makeRequest(() => this.vstsTestApi.getTestRuns(this.teamProjectId));
            let testRuns = new linqts_1.List(testRunSummaries)
                .Reverse()
                .Where(x => x !== undefined && x.state === testInterfaces.TestRunState.Completed.toString()
                && x.name === testRunName)
                .Take(numberOfRunsToFetch)
                .ToArray();
            return testRuns.reverse();
        });
    }
    getQueueIdByName(buildQueue) {
        return __awaiter(this, void 0, void 0, function* () {
            var agentQueues = yield this.makeRequest(() => this.taskAgentApi.getAgentQueues(this.teamProjectId, buildQueue));
            if (agentQueues.length === 1) {
                var agentQueue = agentQueues[0];
                return agentQueue.id;
            }
            console.error(`No queue found with the name: ${buildQueue}. Following Queues were found (Name (id)):`);
            for (let queue of agentQueues) {
                console.error(`${queue.name} (${queue.id})`);
            }
            throw new Error(`Could not find any Queue with the name ${buildQueue}`);
        });
    }
    isBuildFinished(buildId) {
        return __awaiter(this, void 0, void 0, function* () {
            var result = yield this.getBuildInfo(buildId);
            return result.status === buildInterfaces.BuildStatus.Completed;
        });
    }
    wasBuildSuccessful(buildId) {
        return __awaiter(this, void 0, void 0, function* () {
            var result = yield this.getBuildInfo(buildId);
            return result.result === buildInterfaces.BuildResult.Succeeded;
        });
    }
    getBuildDefinitionId(buildDefinitionName) {
        return __awaiter(this, void 0, void 0, function* () {
            var result = yield this.makeRequest(() => this.vstsBuildApi.getDefinitions(this.teamProjectId, buildDefinitionName));
            if (result.length === 0) {
                throw new Error(`Did not find any build definition with this name: ${buildDefinitionName}`);
            }
            return result[0].id;
        });
    }
    getAssociatedChanges(build) {
        return __awaiter(this, void 0, void 0, function* () {
            var result = yield this.makeRequest(() => this.vstsBuildApi.getBuildChanges(this.teamProjectId, build.id));
            return result;
        });
    }
    getBuildInfo(buildId) {
        return __awaiter(this, void 0, void 0, function* () {
            var build = yield this.makeRequest(() => this.vstsBuildApi.getBuild(this.teamProjectId, buildId));
            return build;
        });
    }
    buildParameterString(buildParameters) {
        var buildParametersAsDictionary = {};
        if (buildParameters === null || buildParameters === undefined) {
            return "";
        }
        var keyValuePairs = buildParameters.split(",");
        for (var index = 0; index < keyValuePairs.length; index++) {
            var kvp = keyValuePairs[index];
            var splittedKvp = kvp.split(/:(.+)/);
            if (splittedKvp[0] === undefined || splittedKvp[1] === undefined) {
                var errorMessage = `Build Parameters were not in expected format. Please verify that parameters are in the following format: \"VariableName: Value\"`;
                console.error(errorMessage);
                console.error(`Specified build parameters: ${buildParameters}`);
                throw new Error(errorMessage);
            }
            var key = this.cleanValue(splittedKvp[0]);
            var value = this.cleanValue(splittedKvp[1]);
            var checkNextValues = true;
            var openingCurlyBracesStack = new ts_data_stack_1.default();
            if (value.startsWith("{")) {
                console.log(`Identified value as Json Object - will use as is`);
                this.updateCurlyBracesStack(openingCurlyBracesStack, value);
            }
            while (index < keyValuePairs.length - 1 && checkNextValues) {
                var nextKvp = keyValuePairs[index + 1];
                var nextValue = `${this.cleanValue(nextKvp)}`;
                if (!openingCurlyBracesStack.isEmpty()) {
                    value += `, ${nextValue}`;
                    index++;
                    this.updateCurlyBracesStack(openingCurlyBracesStack, nextValue);
                    if (openingCurlyBracesStack.isEmpty()) {
                        checkNextValues = false;
                    }
                }
                else if (nextKvp.indexOf(":") === -1) {
                    value += `, ${nextValue}`;
                    index++;
                }
                else {
                    checkNextValues = false;
                }
            }
            console.log(`Found parameter ${key} with value: ${value}`);
            buildParametersAsDictionary[key] = value;
        }
        return JSON.stringify(buildParametersAsDictionary);
    }
    updateCurlyBracesStack(openingCurlyBracesStack, value) {
        var openingCurlyBracesInValue = (value.match(/{/g) || []).length;
        for (var index = 0; index < openingCurlyBracesInValue; index++) {
            openingCurlyBracesStack.push("{");
        }
        var closingCurlyBracesInValue = (value.match(/}/g) || []).length;
        for (var index = 0; index < closingCurlyBracesInValue; index++) {
            openingCurlyBracesStack.pop();
        }
    }
    cleanValue(value) {
        value = value.trim();
        if (value.startsWith("\\\"") && value.endsWith("\\\"")) {
            value = value.substr(2, value.length - 4);
        }
        return value;
    }
    setTeamProjectId(connection, teamProject) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                var guidCheckRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                if (guidCheckRegex.test(teamProject)) {
                    console.log("Provided team project was guid.");
                    this.teamProjectId = teamProject;
                    return;
                }
                console.log("Provided team project was no guid, trying to resolve ID via API...");
                var coreAgentApi = yield connection.getCoreApi();
                var projects = yield coreAgentApi.getProjects();
                for (let project of projects) {
                    if (project.name === teamProject) {
                        this.teamProjectId = project.id;
                        console.log(`Found id for team project ${teamProject}: ${this.teamProjectId}`);
                        break;
                    }
                }
            }
            catch (err) {
                throw new Error("Could not access projects - you're version of TFS might be too old, please check online for help.");
            }
            if (this.teamProjectId === "") {
                throw new Error(`Could not find any Team Project with name ${teamProject}`);
            }
        });
    }
    verifyAuthenticationMethod(authenticationMethod, username, password) {
        switch (authenticationMethod) {
            case exports.AuthenticationMethodOAuthToken:
                if (password === undefined || password === null || password === "") {
                    throw new Error("No valid OAuth token provided. Please check that you have the OAuth Token Access allowed for your builds.");
                }
                break;
            case exports.AuthenticationMethodBasicAuthentication:
                if (username === undefined || username === null || username === "") {
                    throw new Error("No Username provided. Please check that you specified the user correctly in the configuration.");
                }
                if (password === undefined || password === null || password === "") {
                    throw new Error("No password provided. Please check that you specified the password correctly in the configuration.");
                }
                break;
            case exports.AuthenticationMethodPersonalAccessToken:
                if (password === undefined || password === null || password === "") {
                    throw new Error("No valid Personal Access Token provided. Please check that you specified the token to be used correctly in the configuration.");
                }
                break;
        }
    }
    makeRequest(requestFunction) {
        return __awaiter(this, void 0, void 0, function* () {
            var maxRequestTryCount = 5;
            var maxWaitingTime = 64;
            for (var requestCount = 0; requestCount < maxRequestTryCount; requestCount++) {
                try {
                    return yield requestFunction();
                }
                catch (error) {
                    console.log(`Error during request (${requestCount + 1}/${maxRequestTryCount})`);
                    console.log(`Error message: ${error}`);
                    if (requestCount < maxRequestTryCount - 1) {
                        var waitTimeInSeconds = Math.pow(2, requestCount);
                        if (waitTimeInSeconds > maxWaitingTime) {
                            waitTimeInSeconds = maxWaitingTime;
                        }
                        console.log(`Will wait ${waitTimeInSeconds} seconds before retrying request...`);
                        yield this.genralFunctions.sleep(waitTimeInSeconds * 1000);
                    }
                }
            }
            throw new Error(`Request failed after ${maxRequestTryCount} tries - see error messages in the log`);
        });
    }
}
exports.TfsRestService = TfsRestService;
