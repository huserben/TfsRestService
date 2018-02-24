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
var WebRequest = require("web-request");
var fs = require("fs");
var url = require("url");
var linqts_1 = require("linqts");
exports.TeamFoundationCollectionUri = "SYSTEM_TEAMFOUNDATIONCOLLECTIONURI";
exports.TeamProject = "SYSTEM_TEAMPROJECT";
exports.RequestedForUsername = "BUILD_REQUESTEDFOR";
exports.RequestedForUserId = "BUILD_REQUESTEDFORID";
exports.SourceVersion = "BUILD_SOURCEVERSION";
exports.SourceBranch = "BUILD_SOURCEBRANCH";
exports.CurrentBuildDefinition = "BUILD_DEFINITIONNAME";
exports.OAuthAccessToken = "SYSTEM_ACCESSTOKEN";
exports.RepositoryType = "BUILD_REPOSITORY_PROVIDER";
exports.TfsRepositoryType = "TfsVersionControl";
exports.ApiUrl = "_apis";
exports.AuthenticationMethodOAuthToken = "OAuth Token";
exports.AuthenticationMethodBasicAuthentication = "Basic Authentication";
exports.AuthenticationMethodPersonalAccessToken = "Personal Access Token";
exports.BuildStateNotStarted = "notStarted";
exports.BuildStateInProgress = "inProgress";
exports.BuildStateCompleted = "completed";
exports.BuildResultSucceeded = "succeeded";
exports.TestRunStateCompleted = "Completed";
exports.TestRunOutcomePassed = "Passed";
var TfsRestService = (function () {
    function TfsRestService() {
    }
    TfsRestService.prototype.initialize = function (authenticationMethod, username, password, tfsServer, ignoreSslError) {
        var baseUrl = encodeURI(tfsServer) + "/" + exports.ApiUrl + "/";
        switch (authenticationMethod) {
            case exports.AuthenticationMethodOAuthToken:
                console.log("Using OAuth Access Token");
                this.options = {
                    auth: {
                        bearer: password
                    }
                };
                break;
            case exports.AuthenticationMethodBasicAuthentication:
                console.log("Using Basic Authentication");
                this.options = {
                    auth: {
                        user: username,
                        password: password
                    }
                };
                break;
            case exports.AuthenticationMethodPersonalAccessToken:
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
    };
    TfsRestService.prototype.getBuildsByStatus = function (buildDefinitionName, statusFilter) {
        return __awaiter(this, void 0, void 0, function () {
            var buildDefinitionID, requestUrl, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.getBuildDefinitionId(buildDefinitionName)];
                    case 1:
                        buildDefinitionID = _a.sent();
                        requestUrl = "build/builds?api-version=2.0&definitions=" + buildDefinitionID + "&statusFilter=" + statusFilter;
                        return [4, WebRequest.json(requestUrl, this.options)];
                    case 2:
                        result = _a.sent();
                        return [2, result.value];
                }
            });
        });
    };
    TfsRestService.prototype.triggerBuild = function (buildDefinitionName, branch, requestedForUserID, sourceVersion, demands, queueId, buildParameters) {
        return __awaiter(this, void 0, void 0, function () {
            var buildId, queueBuildUrl, queueBuildBody, escapedBuildBody, splittedBody, formatBuildParameters, result, responseAsJson, triggeredBuildID, validationResults;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.getBuildDefinitionId(buildDefinitionName)];
                    case 1:
                        buildId = _a.sent();
                        queueBuildUrl = "build/builds?api-version=2.0&ignoreWarnings=true";
                        queueBuildBody = new QueueBuildBody(parseInt(buildId, 10));
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
                            demands.forEach(function (demand) { return queueBuildBody.demands.push(demand); });
                        }
                        escapedBuildBody = JSON.stringify(queueBuildBody);
                        if (buildParameters !== null) {
                            splittedBody = escapedBuildBody.split("");
                            formatBuildParameters = queueBuildBody.formatBuildParameters(buildParameters);
                            splittedBody.splice(splittedBody.lastIndexOf("}"), 1, ", " + formatBuildParameters + "}");
                            escapedBuildBody = splittedBody.join("");
                        }
                        console.log("Queue new Build for definition " + buildDefinitionName);
                        console.log("Request Body: " + escapedBuildBody);
                        return [4, WebRequest.post(queueBuildUrl, this.options, escapedBuildBody)];
                    case 2:
                        result = _a.sent();
                        responseAsJson = JSON.parse(result.content);
                        triggeredBuildID = responseAsJson.id;
                        if (triggeredBuildID === undefined) {
                            this.handleFailedQueueRequest(responseAsJson);
                        }
                        else {
                            validationResults = responseAsJson.validationResults;
                            if (validationResults !== undefined) {
                                this.logValidationResults(validationResults);
                            }
                        }
                        return [2, triggeredBuildID];
                }
            });
        });
    };
    TfsRestService.prototype.areBuildsFinished = function (triggeredBuilds, failIfNotSuccessful) {
        return __awaiter(this, void 0, void 0, function () {
            var result, _i, triggeredBuilds_1, queuedBuildId, buildFinished, buildSuccessful;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        result = true;
                        _i = 0, triggeredBuilds_1 = triggeredBuilds;
                        _a.label = 1;
                    case 1:
                        if (!(_i < triggeredBuilds_1.length)) return [3, 6];
                        queuedBuildId = triggeredBuilds_1[_i];
                        return [4, this.isBuildFinished(queuedBuildId)];
                    case 2:
                        buildFinished = _a.sent();
                        if (!!buildFinished) return [3, 3];
                        console.log("Build " + queuedBuildId + " has not yet completed");
                        result = false;
                        return [3, 5];
                    case 3:
                        result = result && true;
                        console.log("Build " + queuedBuildId + " has completed");
                        return [4, this.wasBuildSuccessful(queuedBuildId)];
                    case 4:
                        buildSuccessful = _a.sent();
                        if (failIfNotSuccessful && !buildSuccessful) {
                            throw new Error("Build " + queuedBuildId + " was not successful - failing task.");
                        }
                        _a.label = 5;
                    case 5:
                        _i++;
                        return [3, 1];
                    case 6: return [2, result];
                }
            });
        });
    };
    TfsRestService.prototype.downloadArtifacts = function (buildId, downloadDirectory) {
        return __awaiter(this, void 0, void 0, function () {
            var requestUrl, result, _i, _a, artifact, fileFormat, fileName, index, fileRequestOptions, request;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log("Downloading artifacts for " + buildId);
                        if (!fs.existsSync(downloadDirectory)) {
                            console.log("Directory " + downloadDirectory + " does not exist - will be created");
                            fs.mkdirSync(downloadDirectory);
                        }
                        if (!downloadDirectory.endsWith("\\")) {
                            downloadDirectory += "\\";
                        }
                        requestUrl = "build/builds/" + buildId + "/artifacts";
                        return [4, WebRequest.json(requestUrl, this.options)];
                    case 1:
                        result = _b.sent();
                        if (result.count === undefined) {
                            console.log("No artifacts found for build " + buildId + " - skipping...");
                        }
                        console.log("Found " + result.count + " artifact(s)");
                        _i = 0, _a = result.value;
                        _b.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3, 6];
                        artifact = _a[_i];
                        if (artifact.resource.type !== "Container") {
                            console.log("Cannot download artifact " + artifact.name + ". Only Containers are supported (type is \"" + artifact.resource.type + "\"");
                            return [3, 5];
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
                        fileRequestOptions = {};
                        fileRequestOptions.auth = this.options.auth;
                        fileRequestOptions.baseUrl = "";
                        fileRequestOptions.agentOptions = { rejectUnauthorized: this.options.agentOptions.rejectUnauthorized };
                        fileRequestOptions.headers = {
                            "Content-Type": "application/" + fileFormat
                        };
                        fileRequestOptions.encoding = null;
                        return [4, WebRequest.stream(artifact.resource.downloadUrl, fileRequestOptions)];
                    case 3:
                        request = _b.sent();
                        return [4, request.pipe(fs.createWriteStream(downloadDirectory + fileName))];
                    case 4:
                        _b.sent();
                        console.log("Stored artifact here: " + downloadDirectory + fileName);
                        _b.label = 5;
                    case 5:
                        _i++;
                        return [3, 2];
                    case 6: return [2];
                }
            });
        });
    };
    TfsRestService.prototype.getTestRuns = function (testRunName, numberOfRunsToFetch) {
        return __awaiter(this, void 0, void 0, function () {
            var testRunsUrl, testRunSummaries, testRunsToReturn, testSummariesToGetResultsFor, _i, testSummariesToGetResultsFor_1, testSummary, testRun;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        testRunsUrl = "test/runs";
                        return [4, WebRequest.json(testRunsUrl, this.options)];
                    case 1:
                        testRunSummaries = _a.sent();
                        this.throwIfAuthenticationError(testRunSummaries);
                        testRunsToReturn = [];
                        testSummariesToGetResultsFor = new linqts_1.List(testRunSummaries.value)
                            .Reverse()
                            .Where(function (x) { return x !== undefined && x.state.toLowerCase() === exports.TestRunStateCompleted.toLowerCase()
                            && x.name === testRunName; })
                            .ToArray();
                        _i = 0, testSummariesToGetResultsFor_1 = testSummariesToGetResultsFor;
                        _a.label = 2;
                    case 2:
                        if (!(_i < testSummariesToGetResultsFor_1.length)) return [3, 5];
                        testSummary = testSummariesToGetResultsFor_1[_i];
                        return [4, WebRequest.json(testRunsUrl + "/" + testSummary.id, this.options)];
                    case 3:
                        testRun = _a.sent();
                        testRunsToReturn.push(testRun);
                        if (testRunsToReturn.length >= numberOfRunsToFetch) {
                            return [3, 5];
                        }
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3, 2];
                    case 5: return [2, testRunsToReturn.reverse()];
                }
            });
        });
    };
    TfsRestService.prototype.getTestResults = function (testRun) {
        return __awaiter(this, void 0, void 0, function () {
            var requestUrl, results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        requestUrl = "test/runs/" + testRun.id + "/results";
                        return [4, WebRequest.json(requestUrl, this.options)];
                    case 1:
                        results = _a.sent();
                        this.throwIfAuthenticationError(results);
                        return [2, results.value];
                }
            });
        });
    };
    TfsRestService.prototype.getQueueIdByName = function (buildQueue) {
        return __awaiter(this, void 0, void 0, function () {
            var requestUrl, result, _i, _a, queue, _b, _c, queue;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        requestUrl = "distributedtask/queues";
                        return [4, WebRequest.json(requestUrl, this.options)];
                    case 1:
                        result = _d.sent();
                        this.throwIfAuthenticationError(result);
                        for (_i = 0, _a = result.value; _i < _a.length; _i++) {
                            queue = _a[_i];
                            if (queue.name.toLowerCase() === buildQueue.toLowerCase()) {
                                return [2, queue.id];
                            }
                        }
                        console.error("No queue found with the name: " + buildQueue + ". Following Queues were found (Name (id)):");
                        for (_b = 0, _c = result.value; _b < _c.length; _b++) {
                            queue = _c[_b];
                            console.error(queue.name + " (" + queue.id + ")");
                        }
                        throw new Error("Could not find any Queue with the name " + buildQueue);
                }
            });
        });
    };
    TfsRestService.prototype.isBuildFinished = function (buildId) {
        return __awaiter(this, void 0, void 0, function () {
            var requestUrl, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        requestUrl = "build/builds/" + buildId + "?api-version=2.0";
                        return [4, WebRequest.json(requestUrl, this.options)];
                    case 1:
                        result = _a.sent();
                        return [2, result.status === exports.BuildStateCompleted];
                }
            });
        });
    };
    TfsRestService.prototype.wasBuildSuccessful = function (buildId) {
        return __awaiter(this, void 0, void 0, function () {
            var requestUrl, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        requestUrl = "build/builds/" + buildId + "?api-version=2.0";
                        return [4, WebRequest.json(requestUrl, this.options)];
                    case 1:
                        result = _a.sent();
                        return [2, result.result === exports.BuildResultSucceeded];
                }
            });
        });
    };
    TfsRestService.prototype.getBuildDefinitionId = function (buildDefinitionName) {
        return __awaiter(this, void 0, void 0, function () {
            var requestUrl, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        requestUrl = "build/definitions?api-version=2.0&name=" + encodeURIComponent(buildDefinitionName);
                        return [4, WebRequest.json(requestUrl, this.options)];
                    case 1:
                        result = _a.sent();
                        this.throwIfAuthenticationError(result);
                        if (result.count === 0) {
                            throw new Error("Did not find any build definition with this name: " + buildDefinitionName + "\n            - checked following url: " + this.options.baseUrl + requestUrl);
                        }
                        return [2, result.value[0].id];
                }
            });
        });
    };
    TfsRestService.prototype.getAssociatedChanges = function (build) {
        return __awaiter(this, void 0, void 0, function () {
            var requestUrl, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        requestUrl = "build/builds/" + build.id + "/changes?api-version=2.0";
                        return [4, WebRequest.json(requestUrl, this.options)];
                    case 1:
                        result = _a.sent();
                        this.throwIfAuthenticationError(result);
                        return [2, result.value];
                }
            });
        });
    };
    TfsRestService.prototype.handleFailedQueueRequest = function (responseAsJson) {
        var validationResults = responseAsJson.ValidationResults;
        if (validationResults === undefined) {
            var errorMessage = responseAsJson.message;
            if (errorMessage !== undefined) {
                console.error(errorMessage);
            }
            else {
                console.error("Unknown error - printing complete return value from server.");
                console.error("Consider raising an issue at github if problem cannot be solved.");
                console.error(responseAsJson);
            }
        }
        else {
            console.error("Could not queue the build because there were validation errors or warnings.");
        }
        throw new Error("Could not Trigger build. See console for more Information.");
    };
    TfsRestService.prototype.logValidationResults = function (validationResults) {
        if (validationResults === undefined) {
            return;
        }
        validationResults.forEach(function (validation) {
            if (validation.result === "error") {
                console.error(validation.result + ": " + validation.message);
            }
            else if (validation.result === "warning") {
                console.warn(validation.result + ": " + validation.message);
            }
        });
    };
    TfsRestService.prototype.throwIfAuthenticationError = function (result) {
        if (result === undefined || result.value === undefined) {
            console.log("Authentication failed - please make sure your settings are correct.");
            console.log("If you use the OAuth Token, make sure you enabled the access to it on the Build Definition.");
            console.log("If you use a Personal Access Token, make sure it did not expire.");
            console.log("If you use Basic Authentication, make sure alternate credentials are enabled on your TFS/VSTS.");
            throw new Error("Authentication with TFS Server failed. Please check your settings.");
        }
    };
    return TfsRestService;
}());
exports.TfsRestService = TfsRestService;
var QueueBuildBody = (function () {
    function QueueBuildBody(id) {
        this.definition = {
            id: id
        };
    }
    QueueBuildBody.prototype.formatBuildParameters = function (buildParameters) {
        var _this = this;
        var buildParameterString = "";
        var keyValuePairs = buildParameters.split(",");
        keyValuePairs.forEach(function (kvp) {
            var splittedKvp = kvp.split(/:(.+)/);
            var key = _this.cleanValue(splittedKvp[0]);
            var value = _this.cleanValue(splittedKvp[1]);
            console.log("Found parameter " + key + " with value: " + value);
            buildParameterString += _this.escapeParametersForRequestBody(key) + ": " + _this.escapeParametersForRequestBody(value) + ",";
        });
        if (buildParameterString.endsWith(",")) {
            buildParameterString = buildParameterString.substr(0, buildParameterString.length - 1);
        }
        return "\"parameters\": \"{" + buildParameterString + "}\"";
    };
    QueueBuildBody.prototype.cleanValue = function (value) {
        value = value.trim();
        if (value.startsWith("\\\"") && value.endsWith("\\\"")) {
            value = value.substr(2, value.length - 4);
        }
        return value;
    };
    QueueBuildBody.prototype.escapeParametersForRequestBody = function (value) {
        var escapedValue = JSON.stringify(value);
        escapedValue = escapedValue.substr(1, escapedValue.length - 2);
        var doubleEscapedValue = JSON.stringify(escapedValue);
        doubleEscapedValue = doubleEscapedValue.substr(1, doubleEscapedValue.length - 2);
        return "\\\"" + doubleEscapedValue + "\\\"";
    };
    return QueueBuildBody;
}());
