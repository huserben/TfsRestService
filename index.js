"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var url = require("url");
var linqts_1 = require("linqts");
var vsts = require("azure-devops-node-api");
var buildInterfaces = require("azure-devops-node-api/interfaces/BuildInterfaces");
var testInterfaces = require("azure-devops-node-api/interfaces/TestInterfaces");
exports.TeamFoundationCollectionUri = "SYSTEM_TEAMFOUNDATIONCOLLECTIONURI";
exports.TeamProject = "SYSTEM_TEAMPROJECT";
exports.TeamProjectId = "SYSTEM_TEAMPROJECTID";
exports.RequestedForUsername = "BUILD_REQUESTEDFOR";
exports.RequestedForUserId = "BUILD_REQUESTEDFORID";
exports.SourceVersion = "BUILD_SOURCEVERSION";
exports.SourceBranch = "BUILD_SOURCEBRANCH";
exports.CurrentBuildDefinition = "BUILD_DEFINITIONNAME";
exports.OAuthAccessToken = "SYSTEM_ACCESSTOKEN";
exports.RepositoryType = "BUILD_REPOSITORY_PROVIDER";
exports.TfsRepositoryType = "TfsVersionControl";
exports.AuthenticationMethodOAuthToken = "OAuth Token";
exports.AuthenticationMethodBasicAuthentication = "Basic Authentication";
exports.AuthenticationMethodPersonalAccessToken = "Personal Access Token";
var TfsRestService = (function () {
    function TfsRestService(createWebApi) {
        this.vstsBuildApi = null;
        this.vstsTestApi = null;
        this.taskAgentApi = null;
        this.teamProjectId = "";
        this.createWebApi = undefined;
        if (createWebApi === undefined) {
            createWebApi = function (server, authHandler, options) { return new vsts.WebApi(server, authHandler, options); };
        }
        this.createWebApi = createWebApi;
    }
    TfsRestService.prototype.initialize = function (authenticationMethod, username, password, tfsServer, teamProject, ignoreSslError) {
        return __awaiter(this, void 0, void 0, function () {
            var authHandler, requestOptions, connection, _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (teamProject === "" || teamProject === undefined) {
                            throw new Error("Team Project has to be defined!");
                        }
                        this.verifyAuthenticationMethod(authenticationMethod, username, password);
                        switch (authenticationMethod) {
                            case exports.AuthenticationMethodOAuthToken:
                                console.log("Using OAuth Access Token");
                                authHandler = vsts.getBearerHandler(password);
                                break;
                            case exports.AuthenticationMethodBasicAuthentication:
                                console.log("Using Basic Authentication");
                                authHandler = vsts.getBasicHandler(username, password);
                                break;
                            case exports.AuthenticationMethodPersonalAccessToken:
                                console.log("Using Personal Access Token");
                                authHandler = vsts.getHandlerFromToken(password);
                                break;
                            default:
                                throw new Error("Cannot handle authentication method " + authenticationMethod);
                        }
                        requestOptions = {
                            ignoreSslError: ignoreSslError
                        };
                        connection = this.createWebApi(tfsServer, authHandler, requestOptions);
                        _a = this;
                        return [4, connection.getBuildApi()];
                    case 1:
                        _a.vstsBuildApi = _d.sent();
                        _b = this;
                        return [4, connection.getTestApi()];
                    case 2:
                        _b.vstsTestApi = _d.sent();
                        _c = this;
                        return [4, connection.getTaskAgentApi()];
                    case 3:
                        _c.taskAgentApi = _d.sent();
                        return [4, this.setTeamProjectId(connection, teamProject)];
                    case 4:
                        _d.sent();
                        return [2];
                }
            });
        });
    };
    TfsRestService.prototype.getBuildsByStatus = function (buildDefinitionName, statusFilter) {
        return __awaiter(this, void 0, void 0, function () {
            var buildDefinitionID, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.getBuildDefinitionId(buildDefinitionName)];
                    case 1:
                        buildDefinitionID = _a.sent();
                        return [4, this.vstsBuildApi.getBuilds(this.teamProjectId, [buildDefinitionID], null, null, null, null, null, null, statusFilter)];
                    case 2:
                        result = _a.sent();
                        return [2, result];
                }
            });
        });
    };
    TfsRestService.prototype.triggerBuild = function (buildDefinitionName, branch, requestedForUserID, sourceVersion, demands, queueId, buildParameters) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var buildId, buildToTrigger, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.getBuildDefinitionId(buildDefinitionName)];
                    case 1:
                        buildId = _a.sent();
                        buildToTrigger = {
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
                        return [4, this.makeRequest(function () { return _this.vstsBuildApi.queueBuild(buildToTrigger, _this.teamProjectId, true); })];
                    case 2:
                        result = _a.sent();
                        return [2, result];
                }
            });
        });
    };
    TfsRestService.prototype.areBuildsFinished = function (triggeredBuilds, failIfNotSuccessful, treatPartiallySucceededBuildAsSuccessful) {
        return __awaiter(this, void 0, void 0, function () {
            var result, _i, triggeredBuilds_1, queuedBuildId, buildInfo, buildFinished, buildSuccessful;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        result = true;
                        _i = 0, triggeredBuilds_1 = triggeredBuilds;
                        _a.label = 1;
                    case 1:
                        if (!(_i < triggeredBuilds_1.length)) return [3, 4];
                        queuedBuildId = triggeredBuilds_1[_i];
                        return [4, this.getBuildInfo(queuedBuildId)];
                    case 2:
                        buildInfo = _a.sent();
                        buildFinished = buildInfo.status === buildInterfaces.BuildStatus.Completed;
                        if (!buildFinished) {
                            result = false;
                        }
                        else {
                            result = result && true;
                            buildSuccessful = buildInfo.result === buildInterfaces.BuildResult.Succeeded;
                            if (!buildSuccessful && treatPartiallySucceededBuildAsSuccessful) {
                                buildSuccessful = buildInfo.result === buildInterfaces.BuildResult.PartiallySucceeded;
                            }
                            if (failIfNotSuccessful && !buildSuccessful) {
                                throw new Error("Build " + queuedBuildId + " (" + buildInfo.definition.name + ") was not successful. See following link for more info: " + buildInfo._links.web.href);
                            }
                        }
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3, 1];
                    case 4: return [2, result];
                }
            });
        });
    };
    TfsRestService.prototype.cancelBuild = function (buildId) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var buildInfo, requestBody;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.getBuildInfo(buildId)];
                    case 1:
                        buildInfo = _a.sent();
                        if (buildInfo.status === buildInterfaces.BuildStatus.Completed) {
                            console.log("Build " + buildId + " has already finished.");
                            return [2];
                        }
                        requestBody = { status: buildInterfaces.BuildStatus.Cancelling };
                        return [4, this.makeRequest(function () { return _this.vstsBuildApi.updateBuild(requestBody, buildId, _this.teamProjectId); })];
                    case 2:
                        _a.sent();
                        return [2];
                }
            });
        });
    };
    TfsRestService.prototype.downloadArtifacts = function (buildId, downloadDirectory) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var result, _i, result_1, artifact, fileFormat, fileName, index, artifactStream, fileStream;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("Downloading artifacts for Build " + buildId);
                        if (!fs.existsSync(downloadDirectory)) {
                            console.log("Directory " + downloadDirectory + " does not exist - will be created");
                            fs.mkdirSync(downloadDirectory);
                        }
                        if (!downloadDirectory.endsWith("\\")) {
                            downloadDirectory += "\\";
                        }
                        return [4, this.makeRequest(function () { return _this.vstsBuildApi.getArtifacts(buildId, _this.teamProjectId); })];
                    case 1:
                        result = _a.sent();
                        if (result.length === 0) {
                            console.log("No artifacts found for build " + buildId + " - skipping...");
                        }
                        console.log("Found " + result.length + " artifact(s)");
                        _i = 0, result_1 = result;
                        _a.label = 2;
                    case 2:
                        if (!(_i < result_1.length)) return [3, 5];
                        artifact = result_1[_i];
                        if (artifact.resource.type !== "Container") {
                            console.log("Cannot download artifact " + artifact.name + ". Only Containers are supported (type is \"" + artifact.resource.type + ")\"");
                            return [3, 4];
                        }
                        console.log("Downloading artifact " + artifact.name + "...");
                        fileFormat = url.parse(artifact.resource.downloadUrl, true).query.$format;
                        if (fileFormat === null || fileFormat === undefined) {
                            fileFormat = "zip";
                        }
                        fileName = artifact.name + "." + fileFormat;
                        index = 1;
                        while (fs.existsSync("" + downloadDirectory + fileName)) {
                            console.log(fileName + " already exists...");
                            fileName = "" + artifact.name + index + "." + fileFormat;
                            index++;
                        }
                        return [4, this.vstsBuildApi.getArtifactContentZip(buildId, artifact.name, this.teamProjectId)];
                    case 3:
                        artifactStream = _a.sent();
                        fileStream = fs.createWriteStream(downloadDirectory + fileName);
                        artifactStream.pipe(fileStream);
                        fileStream.on("close", function () {
                            console.log("Stored artifact here: " + downloadDirectory + fileName);
                        });
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3, 2];
                    case 5: return [2];
                }
            });
        });
    };
    TfsRestService.prototype.getTestRuns = function (testRunName, numberOfRunsToFetch) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var testRunSummaries, testRuns;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.makeRequest(function () { return _this.vstsTestApi.getTestRuns(_this.teamProjectId); })];
                    case 1:
                        testRunSummaries = _a.sent();
                        testRuns = new linqts_1.List(testRunSummaries)
                            .Reverse()
                            .Where(function (x) { return x !== undefined && x.state === testInterfaces.TestRunState.Completed.toString()
                            && x.name === testRunName; })
                            .Take(numberOfRunsToFetch)
                            .ToArray();
                        return [2, testRuns.reverse()];
                }
            });
        });
    };
    TfsRestService.prototype.getQueueIdByName = function (buildQueue) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var agentQueues, agentQueue, _i, agentQueues_1, queue;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.makeRequest(function () { return _this.taskAgentApi.getAgentQueues(_this.teamProjectId, buildQueue); })];
                    case 1:
                        agentQueues = _a.sent();
                        if (agentQueues.length === 1) {
                            agentQueue = agentQueues[0];
                            return [2, agentQueue.id];
                        }
                        console.error("No queue found with the name: " + buildQueue + ". Following Queues were found (Name (id)):");
                        for (_i = 0, agentQueues_1 = agentQueues; _i < agentQueues_1.length; _i++) {
                            queue = agentQueues_1[_i];
                            console.error(queue.name + " (" + queue.id + ")");
                        }
                        throw new Error("Could not find any Queue with the name " + buildQueue);
                }
            });
        });
    };
    TfsRestService.prototype.isBuildFinished = function (buildId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.getBuildInfo(buildId)];
                    case 1:
                        result = _a.sent();
                        return [2, result.status === buildInterfaces.BuildStatus.Completed];
                }
            });
        });
    };
    TfsRestService.prototype.wasBuildSuccessful = function (buildId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.getBuildInfo(buildId)];
                    case 1:
                        result = _a.sent();
                        return [2, result.result === buildInterfaces.BuildResult.Succeeded];
                }
            });
        });
    };
    TfsRestService.prototype.getBuildDefinitionId = function (buildDefinitionName) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.makeRequest(function () { return _this.vstsBuildApi.getDefinitions(_this.teamProjectId, buildDefinitionName); })];
                    case 1:
                        result = _a.sent();
                        if (result.length === 0) {
                            throw new Error("Did not find any build definition with this name: " + buildDefinitionName);
                        }
                        return [2, result[0].id];
                }
            });
        });
    };
    TfsRestService.prototype.getAssociatedChanges = function (build) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.makeRequest(function () { return _this.vstsBuildApi.getBuildChanges(_this.teamProjectId, build.id); })];
                    case 1:
                        result = _a.sent();
                        return [2, result];
                }
            });
        });
    };
    TfsRestService.prototype.getBuildInfo = function (buildId) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var build;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.makeRequest(function () { return _this.vstsBuildApi.getBuild(buildId, _this.teamProjectId); })];
                    case 1:
                        build = _a.sent();
                        return [2, build];
                }
            });
        });
    };
    TfsRestService.prototype.buildParameterString = function (buildParameters) {
        var buildParametersAsDictionary = {};
        if (buildParameters === null || buildParameters === undefined) {
            return "";
        }
        var keyValuePairs = buildParameters.split(",");
        for (var index = 0; index < keyValuePairs.length; index++) {
            var kvp = keyValuePairs[index];
            var splittedKvp = kvp.split(/:(.+)/);
            if (splittedKvp[0] === undefined || splittedKvp[1] === undefined) {
                var errorMessage = "Build Parameters were not in expected format. Please verify that parameters are in the following format: \"VariableName: Value\"";
                console.error(errorMessage);
                console.error("Specified build parameters: " + buildParameters);
                throw new Error(errorMessage);
            }
            var key = this.cleanValue(splittedKvp[0]);
            var value = this.cleanValue(splittedKvp[1]);
            var checkNextValues = true;
            while (index < keyValuePairs.length - 1 && checkNextValues) {
                var nextKvp = keyValuePairs[index + 1];
                if (nextKvp.indexOf(":") === -1) {
                    value += ", " + this.cleanValue(nextKvp);
                    index++;
                }
                else {
                    checkNextValues = false;
                }
            }
            console.log("Found parameter " + key + " with value: " + value);
            buildParametersAsDictionary[key] = value;
        }
        return JSON.stringify(buildParametersAsDictionary);
    };
    TfsRestService.prototype.cleanValue = function (value) {
        value = value.trim();
        if (value.startsWith("\\\"") && value.endsWith("\\\"")) {
            value = value.substr(2, value.length - 4);
        }
        return value;
    };
    TfsRestService.prototype.escapeParametersForRequestBody = function (value) {
        var escapedValue = JSON.stringify(value);
        escapedValue = escapedValue.substr(1, escapedValue.length - 2);
        var doubleEscapedValue = JSON.stringify(escapedValue);
        doubleEscapedValue = doubleEscapedValue.substr(1, doubleEscapedValue.length - 2);
        return "\\\"" + doubleEscapedValue + "\\\"";
    };
    TfsRestService.prototype.setTeamProjectId = function (connection, teamProject) {
        return __awaiter(this, void 0, void 0, function () {
            var guidCheckRegex, coreAgentApi, projects, _i, projects_1, project, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        guidCheckRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                        if (guidCheckRegex.test(teamProject)) {
                            console.log("Provided team project was guid.");
                            this.teamProjectId = teamProject;
                            return [2];
                        }
                        console.log("Provided team project was no guid, trying to resolve ID via API...");
                        return [4, connection.getCoreApi()];
                    case 1:
                        coreAgentApi = _a.sent();
                        return [4, coreAgentApi.getProjects()];
                    case 2:
                        projects = _a.sent();
                        for (_i = 0, projects_1 = projects; _i < projects_1.length; _i++) {
                            project = projects_1[_i];
                            if (project.name === teamProject) {
                                this.teamProjectId = project.id;
                                console.log("Found id for team project " + teamProject + ": " + this.teamProjectId);
                                break;
                            }
                        }
                        if (this.teamProjectId === "") {
                            throw new Error("Could not find any Team Project with name " + teamProject);
                        }
                        return [3, 4];
                    case 3:
                        err_1 = _a.sent();
                        throw new Error("Could not access projects - you're version of TFS might be too old, please check online for help.");
                    case 4: return [2];
                }
            });
        });
    };
    TfsRestService.prototype.verifyAuthenticationMethod = function (authenticationMethod, username, password) {
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
    };
    TfsRestService.prototype.makeRequest = function (requestFunction) {
        return __awaiter(this, void 0, void 0, function () {
            var maxRequestTryCount, requestCount, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        maxRequestTryCount = 5;
                        requestCount = 0;
                        _a.label = 1;
                    case 1:
                        if (!(requestCount < maxRequestTryCount)) return [3, 6];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4, requestFunction()];
                    case 3: return [2, _a.sent()];
                    case 4:
                        error_1 = _a.sent();
                        console.log("Error during request (" + (requestCount + 1) + "/" + maxRequestTryCount + ")");
                        console.log("Error message: " + error_1);
                        return [3, 5];
                    case 5:
                        requestCount++;
                        return [3, 1];
                    case 6: throw new Error("Request failed after " + maxRequestTryCount + " tries - see error messages in the log");
                }
            });
        });
    };
    return TfsRestService;
}());
exports.TfsRestService = TfsRestService;
//# sourceMappingURL=index.js.map