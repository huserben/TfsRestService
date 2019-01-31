"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const TypeMoq = require("typemoq");
const sinon = require("sinon");
const assert = require("assert");
const fs = require("fs");
const index = require("../index");
const buildInterfaces = require("azure-devops-node-api/interfaces/BuildInterfaces");
const testInterfaces = require("azure-devops-node-api/interfaces/TestInterfaces");
describe("TFS Rest Service Tests", () => {
    const ServerUrl = "https://www.myTfsServer.com:8080";
    const TeamProjectName = "MyTeam";
    const TeamProjectId = "797c3b56-e87e-40f4-8af2-69b3b1467109";
    let consoleLogSpy;
    let fsStub;
    let subject;
    let buildApiMock;
    let testApiMock;
    let taskAgentApiMock;
    let coreApiMock;
    let azureDevOpsWebApiMock;
    let requestHandlerMock;
    beforeEach(() => {
        azureDevOpsWebApiMock = TypeMoq.Mock.ofType();
        requestHandlerMock = TypeMoq.Mock.ofType();
        azureDevOpsWebApiMock.setup(x => x.getBasicHandler(TypeMoq.It.isAnyString(), TypeMoq.It.isAnyString()))
            .returns(() => requestHandlerMock.object);
        azureDevOpsWebApiMock.setup(x => x.getBearerHandler(TypeMoq.It.isAnyString()))
            .returns(() => requestHandlerMock.object);
        azureDevOpsWebApiMock.setup(x => x.getHandlerFromToken(TypeMoq.It.isAnyString()))
            .returns(() => requestHandlerMock.object);
        buildApiMock = TypeMoq.Mock.ofType();
        testApiMock = TypeMoq.Mock.ofType();
        taskAgentApiMock = TypeMoq.Mock.ofType();
        coreApiMock = TypeMoq.Mock.ofType();
        buildApiMock.setup((x) => x.then).returns(() => undefined);
        testApiMock.setup((x) => x.then).returns(() => undefined);
        taskAgentApiMock.setup((x) => x.then).returns(() => undefined);
        coreApiMock.setup((x) => x.then).returns(() => undefined);
        var teamProjectMock = TypeMoq.Mock.ofType();
        teamProjectMock.setup(prj => prj.name).returns(() => TeamProjectName);
        teamProjectMock.setup(prj => prj.id).returns(() => TeamProjectId);
        coreApiMock.setup(api => api.getProjects(TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny()))
            .returns(() => __awaiter(this, void 0, void 0, function* () { return [teamProjectMock.object]; }));
        azureDevOpsWebApiMock.setup(x => x.getBuildApi()).returns(() => __awaiter(this, void 0, void 0, function* () { return buildApiMock.object; }));
        azureDevOpsWebApiMock.setup(x => x.getTestApi()).returns(() => __awaiter(this, void 0, void 0, function* () { return testApiMock.object; }));
        azureDevOpsWebApiMock.setup(x => x.getTaskAgentApi()).returns(() => __awaiter(this, void 0, void 0, function* () { return taskAgentApiMock.object; }));
        azureDevOpsWebApiMock.setup(x => x.getCoreApi()).returns(() => __awaiter(this, void 0, void 0, function* () { return coreApiMock.object; }));
        consoleLogSpy = sinon.spy(console, "log");
        fsStub = sinon.stub(fs, "existsSync");
        subject = new index.TfsRestService(azureDevOpsWebApiMock.object);
    });
    afterEach(() => __awaiter(this, void 0, void 0, function* () {
        consoleLogSpy.restore();
        fsStub.restore();
    }));
    it("queues new build for specified build definition", () => __awaiter(this, void 0, void 0, function* () {
        const BuildDefinitionName = "MyBuildDefinition";
        const BuilDefinitionId = 12;
        var expectedBuildToTrigger = {
            definition: { id: BuilDefinitionId },
            parameters: ""
        };
        setupBuildIdForBuildDefinition(BuildDefinitionName, BuilDefinitionId);
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        yield subject.triggerBuild(BuildDefinitionName, null, undefined, undefined, null, undefined, undefined);
        buildApiMock.verify(x => x.queueBuild(expectedBuildToTrigger, TeamProjectId, true), TypeMoq.Times.once());
    }));
    it("queues new build in specified branch", () => __awaiter(this, void 0, void 0, function* () {
        const BuildDefinitionName = "MyBuildDefinition";
        const BuilDefinitionId = 12;
        const SourceBranch = "features/unittests";
        var expectedBuildToTrigger = {
            definition: { id: BuilDefinitionId },
            parameters: "",
            SourceBranch: SourceBranch
        };
        setupBuildIdForBuildDefinition(BuildDefinitionName, BuilDefinitionId);
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        yield subject.triggerBuild(BuildDefinitionName, SourceBranch, undefined, undefined, null, undefined, undefined);
        buildApiMock.verify(x => x.queueBuild(expectedBuildToTrigger, TeamProjectId, true), TypeMoq.Times.once());
    }));
    it("queues new build for user that requested it", () => __awaiter(this, void 0, void 0, function* () {
        const BuildDefinitionName = "MyBuildDefinition";
        const BuilDefinitionId = 12;
        const RequestedUserId = "37";
        var expectedBuildToTrigger = {
            definition: { id: BuilDefinitionId },
            parameters: "",
            requestedFor: { id: RequestedUserId }
        };
        setupBuildIdForBuildDefinition(BuildDefinitionName, BuilDefinitionId);
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        yield subject.triggerBuild(BuildDefinitionName, null, RequestedUserId, undefined, null, undefined, undefined);
        buildApiMock.verify(x => x.queueBuild(expectedBuildToTrigger, TeamProjectId, true), TypeMoq.Times.once());
    }));
    it("queues new build with specified source version", () => __awaiter(this, void 0, void 0, function* () {
        const BuildDefinitionName = "MyBuildDefinition";
        const BuilDefinitionId = 12;
        const SourceVersion = "C17";
        var expectedBuildToTrigger = {
            definition: { id: BuilDefinitionId },
            parameters: "",
            sourceVersion: SourceVersion
        };
        setupBuildIdForBuildDefinition(BuildDefinitionName, BuilDefinitionId);
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        yield subject.triggerBuild(BuildDefinitionName, null, "", SourceVersion, null, undefined, undefined);
        buildApiMock.verify(x => x.queueBuild(expectedBuildToTrigger, TeamProjectId, true), TypeMoq.Times.once());
    }));
    it("queues new build with specified Queue Id", () => __awaiter(this, void 0, void 0, function* () {
        const BuildDefinitionName = "MyBuildDefinition";
        const BuilDefinitionId = 12;
        const QueueId = 1337;
        var expectedBuildToTrigger = {
            definition: { id: BuilDefinitionId },
            parameters: "",
            queue: { id: QueueId }
        };
        setupBuildIdForBuildDefinition(BuildDefinitionName, BuilDefinitionId);
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        yield subject.triggerBuild(BuildDefinitionName, null, "", "", null, QueueId, undefined);
        buildApiMock.verify(x => x.queueBuild(expectedBuildToTrigger, TeamProjectId, true), TypeMoq.Times.once());
    }));
    it("queues new build with specified demands", () => __awaiter(this, void 0, void 0, function* () {
        const BuildDefinitionName = "MyBuildDefinition";
        const BuilDefinitionId = 12;
        var expectedDemands = ["SomeDemand", "OtherDemand=12"];
        var expectedBuildToTrigger = {
            definition: { id: BuilDefinitionId },
            parameters: "",
            demands: expectedDemands
        };
        setupBuildIdForBuildDefinition(BuildDefinitionName, BuilDefinitionId);
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        yield subject.triggerBuild(BuildDefinitionName, null, "", "", expectedDemands, null, undefined);
        buildApiMock.verify(x => x.queueBuild(expectedBuildToTrigger, TeamProjectId, true), TypeMoq.Times.once());
    }));
    [["VariableKey: Value", `{"VariableKey":"Value"}`],
        ["VariableKey1: Value1, VariableKey2: Value2", `{"VariableKey1":"Value1","VariableKey2":"Value2"}`],
        ["VariableKey1: Value1, Value2, VariableKey2: Value3", `{"VariableKey1":"Value1, Value2","VariableKey2":"Value3"}`],
        ["VariableKey: C:\Test\Something", `{"VariableKey":"C:\Test\Something"}`],
        ["VariableKey: C:\Test\Something, otherValue, VariableKey2: MyValue",
            `{"VariableKey":"C:\Test\Something, otherValue","VariableKey2":"MyValue"}`]]
        .forEach(function (input) {
        it("queues new build with specified parameters", () => __awaiter(this, void 0, void 0, function* () {
            const BuildDefinitionName = "MyBuildDefinition";
            const BuilDefinitionId = 12;
            var parameterInput = input[0];
            var expectedParameterString = input[1];
            var expectedBuildToTrigger = {
                definition: { id: BuilDefinitionId },
                parameters: expectedParameterString
            };
            setupBuildIdForBuildDefinition(BuildDefinitionName, BuilDefinitionId);
            yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
            yield subject.triggerBuild(BuildDefinitionName, null, "", "", null, null, parameterInput);
            buildApiMock.verify(x => x.queueBuild(expectedBuildToTrigger, TeamProjectId, true), TypeMoq.Times.once());
        }));
    });
    ["ShouldFailWhenThereIsNoColon",
        "Fail:When:MultipleColonrsAreThere:",
        "Trailing:Commas,"]
        .forEach(function (invalidParameter) {
        it("throws error if build parameters are not in specified format", () => __awaiter(this, void 0, void 0, function* () {
            const BuildDefinitionName = "MyBuildDefinition";
            const BuilDefinitionId = 12;
            setupBuildIdForBuildDefinition(BuildDefinitionName, BuilDefinitionId);
            yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
            assert.rejects(() => __awaiter(this, void 0, void 0, function* () { return yield subject.triggerBuild(BuildDefinitionName, null, "", "", null, null, invalidParameter); }), {
                message: `Build Parameters were not in expected format. Please verify that parameters are in the following format: \"VariableName: Value\"`
            });
        }));
    });
    [undefined, ""].forEach(function (teamProject) {
        it("throws if no team project was specified", () => __awaiter(this, void 0, void 0, function* () {
            yield assert.rejects(() => __awaiter(this, void 0, void 0, function* () {
                return yield subject.initialize(index.AuthenticationMethodBasicAuthentication, "user", "pw", ServerUrl, teamProject, true);
            }), {
                message: "Team Project has to be defined!"
            });
        }));
    });
    [undefined, null, ""].forEach(function (oAuthToken) {
        it("throws if OAuth Authentication is selected and no token is specified", () => __awaiter(this, void 0, void 0, function* () {
            yield assert.rejects(() => __awaiter(this, void 0, void 0, function* () {
                return yield subject.initialize(index.AuthenticationMethodOAuthToken, "user", oAuthToken, ServerUrl, TeamProjectName, true);
            }), {
                message: "No valid OAuth token provided. Please check that you have the OAuth Token Access allowed for your builds."
            });
        }));
    });
    [undefined, null, ""].forEach(function (username) {
        it("throws if Basic Authentication is selected and no username is specified", () => __awaiter(this, void 0, void 0, function* () {
            yield assert.rejects(() => __awaiter(this, void 0, void 0, function* () {
                return yield subject.initialize(index.AuthenticationMethodBasicAuthentication, username, "Password", ServerUrl, TeamProjectName, true);
            }), {
                message: "No Username provided. Please check that you specified the user correctly in the configuration."
            });
        }));
    });
    [undefined, null, ""].forEach(function (password) {
        it("throws if Basic Authentication is selected and no username is specified", () => __awaiter(this, void 0, void 0, function* () {
            yield assert.rejects(() => __awaiter(this, void 0, void 0, function* () {
                return yield subject.initialize(index.AuthenticationMethodBasicAuthentication, "Username", password, ServerUrl, TeamProjectName, true);
            }), {
                message: "No password provided. Please check that you specified the password correctly in the configuration."
            });
        }));
    });
    [undefined, null, ""].forEach(function (token) {
        it("throws if Personal Access Token Authentication is selected and no token is specified", () => __awaiter(this, void 0, void 0, function* () {
            yield assert.rejects(() => __awaiter(this, void 0, void 0, function* () {
                return yield subject.initialize(index.AuthenticationMethodPersonalAccessToken, "Username", token, ServerUrl, TeamProjectName, true);
            }), {
                message: `No valid Personal Access Token provided. Please check that you specified the token to be used correctly in the configuration.`
            });
        }));
    });
    it("throws if unsupported Authentication method is selected", () => __awaiter(this, void 0, void 0, function* () {
        var authenticationMethod = "Unsupported Authentication";
        yield assert.rejects(() => __awaiter(this, void 0, void 0, function* () {
            return yield subject.initialize(authenticationMethod, "username", "password", ServerUrl, TeamProjectName, true);
        }), {
            message: `Cannot handle authentication method ${authenticationMethod}`
        });
    }));
    it("useses bearer handler if OAuth Authentication is used", () => __awaiter(this, void 0, void 0, function* () {
        const ExpectedToken = "Mytoken";
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "doesn't matter", ExpectedToken, ServerUrl, TeamProjectName, true);
        azureDevOpsWebApiMock.verify(x => x.getBearerHandler(ExpectedToken), TypeMoq.Times.once());
        azureDevOpsWebApiMock.verify(x => x.initializeConnection(ServerUrl, requestHandlerMock.object, TypeMoq.It.isAny()), TypeMoq.Times.once());
    }));
    it("useses basic handler if Basic Authentication is used", () => __awaiter(this, void 0, void 0, function* () {
        const ExpectedPassword = "P@5sW0rd";
        const ExpectedUsername = "UserName";
        yield subject.initialize(index.AuthenticationMethodBasicAuthentication, ExpectedUsername, ExpectedPassword, ServerUrl, TeamProjectName, true);
        azureDevOpsWebApiMock.verify(x => x.getBasicHandler(ExpectedUsername, ExpectedPassword), TypeMoq.Times.once());
        azureDevOpsWebApiMock.verify(x => x.initializeConnection(ServerUrl, requestHandlerMock.object, TypeMoq.It.isAny()), TypeMoq.Times.once());
    }));
    it("useses handler from Token if PAT Authentication is used", () => __awaiter(this, void 0, void 0, function* () {
        const PersonalAccessToken = "12389udfsalkjdsaf0912o3iusdf";
        yield subject.initialize(index.AuthenticationMethodPersonalAccessToken, "no one cares", PersonalAccessToken, ServerUrl, TeamProjectName, true);
        azureDevOpsWebApiMock.verify(x => x.getHandlerFromToken(PersonalAccessToken), TypeMoq.Times.once());
        azureDevOpsWebApiMock.verify(x => x.initializeConnection(ServerUrl, requestHandlerMock.object, TypeMoq.It.isAny()), TypeMoq.Times.once());
    }));
    [true, false].forEach(function (ignoreSslError) {
        it("sets request properties correct", () => __awaiter(this, void 0, void 0, function* () {
            yield subject.initialize(index.AuthenticationMethodBasicAuthentication, "no one cares", "SomePassword", ServerUrl, TeamProjectName, ignoreSslError);
            azureDevOpsWebApiMock.verify(x => x.initializeConnection(ServerUrl, requestHandlerMock.object, { ignoreSslError: ignoreSslError }), TypeMoq.Times.once());
        }));
    });
    it("uses team project id as is if it is a guid", () => __awaiter(this, void 0, void 0, function* () {
        yield subject.initialize(index.AuthenticationMethodBasicAuthentication, "no one cares", "SomePassword", ServerUrl, TeamProjectId, true);
        assert(consoleLogSpy.calledWith(`Provided team project was guid.`));
        coreApiMock.verify(x => x.getProjects(), TypeMoq.Times.never());
    }));
    it("fetches id from team projects via api if its not a guid", () => __awaiter(this, void 0, void 0, function* () {
        yield subject.initialize(index.AuthenticationMethodBasicAuthentication, "no one cares", "SomePassword", ServerUrl, TeamProjectName, true);
        assert(consoleLogSpy.calledWith(`Found id for team project ${TeamProjectName}: ${TeamProjectId}`));
    }));
    it("throws error if no team with specified name was found", () => __awaiter(this, void 0, void 0, function* () {
        const TeamName = "Some not existing team";
        yield assert.rejects(() => __awaiter(this, void 0, void 0, function* () {
            return yield subject.initialize(index.AuthenticationMethodBasicAuthentication, "user", "pw", ServerUrl, TeamName, true);
        }), {
            message: `Could not find any Team Project with name ${TeamName}`
        });
    }));
    it("throws error if access to team project fails", () => __awaiter(this, void 0, void 0, function* () {
        coreApiMock.reset();
        coreApiMock.setup((x) => x.then).returns(() => undefined);
        coreApiMock.setup(api => api.getProjects(TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny()))
            .throws(new Error());
        subject = new index.TfsRestService(azureDevOpsWebApiMock.object);
        yield assert.rejects(() => __awaiter(this, void 0, void 0, function* () {
            return yield subject.initialize(index.AuthenticationMethodBasicAuthentication, "user", "pw", ServerUrl, TeamProjectName, true);
        }), {
            message: `Could not access projects - you're version of TFS might be too old, please check online for help.`
        });
    }));
    it("getBuildsByStatus returns all builds of the specified build definition", () => __awaiter(this, void 0, void 0, function* () {
        const BuildDefinitionName = "MyBuild";
        const BuildDefinitionID = 42;
        const ExpectedBuildStatus = buildInterfaces.BuildStatus.InProgress;
        var buildMock = TypeMoq.Mock.ofType();
        var buildDefinitionReferenceMock = TypeMoq.Mock.ofType();
        var expectedBuilds = [buildMock.object];
        buildDefinitionReferenceMock.setup(x => x.id).returns(() => BuildDefinitionID);
        buildApiMock.setup(x => x.getBuilds(TeamProjectId, [BuildDefinitionID], null, null, null, null, null, null, ExpectedBuildStatus))
            .returns(() => __awaiter(this, void 0, void 0, function* () { return expectedBuilds; }));
        buildApiMock.setup(x => x.getDefinitions(TeamProjectId, BuildDefinitionName))
            .returns(() => __awaiter(this, void 0, void 0, function* () { return [buildDefinitionReferenceMock.object]; }));
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        var actualBuilds = yield subject.getBuildsByStatus(BuildDefinitionName, ExpectedBuildStatus);
        assert.equal(expectedBuilds, actualBuilds);
    }));
    it("ignores if build to cancel has already completed", () => __awaiter(this, void 0, void 0, function* () {
        const BuildId = 1337;
        var buildMock = setupBuildMock(BuildId);
        buildMock.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.Completed);
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        yield subject.cancelBuild(BuildId);
        buildApiMock.verify(x => x.updateBuild(TypeMoq.It.isAny(), BuildId, TeamProjectId), TypeMoq.Times.never());
        assert(consoleLogSpy.calledWith(`Build ${BuildId} has already finished.`));
    }));
    it("updates build with cancelling status if it has not already completed", () => __awaiter(this, void 0, void 0, function* () {
        const BuildId = 1337;
        var expectedRequest = { status: buildInterfaces.BuildStatus.Cancelling };
        var buildMock = setupBuildMock(BuildId);
        buildMock.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.InProgress);
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        yield subject.cancelBuild(BuildId);
        buildApiMock.verify(x => x.updateBuild(expectedRequest, BuildId, TeamProjectId), TypeMoq.Times.once());
    }));
    it("returns true when we check if builds have finished and the status is completed", () => __awaiter(this, void 0, void 0, function* () {
        const BuildId = 1337;
        var buildMock = setupBuildMock(BuildId);
        buildMock.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.Completed);
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        var isFinished = yield subject.areBuildsFinished([BuildId], false, false);
        assert.equal(true, isFinished);
    }));
    it("returns false when we check if builds have finished and the status is not completed", () => __awaiter(this, void 0, void 0, function* () {
        const BuildId = 1337;
        var buildMock = setupBuildMock(BuildId);
        buildMock.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.InProgress);
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        var isFinished = yield subject.areBuildsFinished([BuildId], false, false);
        assert.equal(false, isFinished);
    }));
    it("returns true when we check if two builds have finished and both have", () => __awaiter(this, void 0, void 0, function* () {
        const BuildId1 = 1337;
        const BuildId2 = 42;
        var buildMock1 = setupBuildMock(BuildId1);
        buildMock1.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.Completed);
        var buildMock2 = setupBuildMock(BuildId2);
        buildMock2.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.Completed);
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        var isFinished = yield subject.areBuildsFinished([BuildId1, BuildId2], false, false);
        assert.equal(true, isFinished);
    }));
    it("returns false when we check if two builds have finished and only has so far", () => __awaiter(this, void 0, void 0, function* () {
        const BuildId1 = 1337;
        const BuildId2 = 42;
        var buildMock1 = setupBuildMock(BuildId1);
        buildMock1.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.Completed);
        var buildMock2 = setupBuildMock(BuildId2);
        buildMock2.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.InProgress);
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        var isFinished = yield subject.areBuildsFinished([BuildId1, BuildId2], false, false);
        assert.equal(false, isFinished);
    }));
    it("does not throw if build has not successfully completed and is not configured to fail on non successful builds", () => __awaiter(this, void 0, void 0, function* () {
        const BuildId = 1337;
        const BuildDefinitionName = "Failed Build";
        const BuildUrl = "https://whatever.my.build.is";
        var buildMock = setupBuildMock(BuildId);
        buildMock.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.Completed);
        buildMock.setup(x => x.result).returns(() => buildInterfaces.BuildResult.Failed);
        buildMock.setup(x => x.definition.name).returns(() => BuildDefinitionName);
        var links = {
            web: {
                href: BuildUrl
            }
        };
        buildMock.setup(x => x._links).returns(() => links);
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        var actual = yield subject.areBuildsFinished([BuildId], false, false);
        assert.equal(true, actual);
    }));
    it("throws if build has not successfully completed and is configured to fail on non successful builds", () => __awaiter(this, void 0, void 0, function* () {
        const BuildId = 1337;
        const BuildDefinitionName = "Failed Build";
        const BuildUrl = "https://whatever.my.build.is";
        var buildMock = setupBuildMock(BuildId);
        buildMock.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.Completed);
        buildMock.setup(x => x.result).returns(() => buildInterfaces.BuildResult.Failed);
        var definition = { name: BuildDefinitionName };
        var links = {
            web: {
                href: BuildUrl
            }
        };
        buildMock.setup(x => x.definition).returns(() => definition);
        buildMock.setup(x => x._links).returns(() => links);
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        assert.rejects(() => __awaiter(this, void 0, void 0, function* () { return yield subject.areBuildsFinished([BuildId], true, false); }), {
            message: `Build ${BuildId} (${BuildDefinitionName}) was not successful. See following link for more info: ${BuildUrl}`
        });
    }));
    it("does not throw if build was partially successful and is configured to fail on non successful builds", () => __awaiter(this, void 0, void 0, function* () {
        const BuildId = 1337;
        const BuildDefinitionName = "Failed Build";
        const BuildUrl = "https://whatever.my.build.is";
        var buildMock = setupBuildMock(BuildId);
        buildMock.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.Completed);
        buildMock.setup(x => x.result).returns(() => buildInterfaces.BuildResult.PartiallySucceeded);
        buildMock.setup(x => x.definition.name).returns(() => BuildDefinitionName);
        var links = {
            web: {
                href: BuildUrl
            }
        };
        buildMock.setup(x => x._links).returns(() => links);
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        var actualValue = yield subject.areBuildsFinished([BuildId], true, true);
        assert.equal(true, actualValue);
    }));
    it("does not throw if build was partially successful and is configured to fail on non successful builds", () => __awaiter(this, void 0, void 0, function* () {
        const BuildId = 1337;
        const BuildDefinitionName = "Failed Build";
        const BuildUrl = "https://whatever.my.build.is";
        var buildMock = setupBuildMock(BuildId);
        buildMock.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.Completed);
        buildMock.setup(x => x.result).returns(() => buildInterfaces.BuildResult.PartiallySucceeded);
        var definition = { name: BuildDefinitionName };
        var links = {
            web: {
                href: BuildUrl
            }
        };
        buildMock.setup(x => x.definition).returns(() => definition);
        buildMock.setup(x => x._links).returns(() => links);
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        assert.rejects(() => __awaiter(this, void 0, void 0, function* () { return yield subject.areBuildsFinished([BuildId], true, false); }), {
            message: `Build ${BuildId} (${BuildDefinitionName}) was not successful. See following link for more info: ${BuildUrl}`
        });
    }));
    it("gets queue id by name if queue exists", () => __awaiter(this, void 0, void 0, function* () {
        const QueueName = "MyQueue";
        const ExpectedQueueId = 12;
        var taskAgentQueueMock = TypeMoq.Mock.ofType();
        taskAgentQueueMock.setup(x => x.name).returns(() => QueueName);
        taskAgentQueueMock.setup(x => x.id).returns(() => ExpectedQueueId);
        taskAgentApiMock.setup(x => x.getAgentQueues(TeamProjectId, QueueName)).returns(() => __awaiter(this, void 0, void 0, function* () { return [taskAgentQueueMock.object]; }));
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        var actualQueueId = yield subject.getQueueIdByName(QueueName);
        assert.equal(ExpectedQueueId, actualQueueId);
    }));
    it("throws error if no queues with specified name were found", () => __awaiter(this, void 0, void 0, function* () {
        const QueueName = "MyQueue";
        taskAgentApiMock.setup(x => x.getAgentQueues(TeamProjectId, QueueName)).returns(() => __awaiter(this, void 0, void 0, function* () { return []; }));
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        assert.rejects(() => __awaiter(this, void 0, void 0, function* () { return yield subject.getQueueIdByName(QueueName); }), {
            message: `Could not find any Queue with the name ${QueueName}`
        });
    }));
    it("throws error if multiple queues with name were found", () => __awaiter(this, void 0, void 0, function* () {
        const QueueName = "MyQueue";
        var taskAgentQueueMock1 = TypeMoq.Mock.ofType();
        taskAgentQueueMock1.setup(x => x.name).returns(() => QueueName);
        taskAgentQueueMock1.setup(x => x.id).returns(() => 12);
        var taskAgentQueueMock2 = TypeMoq.Mock.ofType();
        taskAgentQueueMock2.setup(x => x.name).returns(() => QueueName);
        taskAgentQueueMock2.setup(x => x.id).returns(() => 42);
        taskAgentApiMock.setup(x => x.getAgentQueues(TeamProjectId, QueueName))
            .returns(() => __awaiter(this, void 0, void 0, function* () { return [taskAgentQueueMock1.object, taskAgentQueueMock2.object]; }));
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        assert.rejects(() => __awaiter(this, void 0, void 0, function* () { return yield subject.getQueueIdByName(QueueName); }), {
            message: `Could not find any Queue with the name ${QueueName}`
        });
    }));
    it("returns true when checking if build is finished and state is completed", () => __awaiter(this, void 0, void 0, function* () {
        const BuildId = 42;
        var buildMock = setupBuildMock(BuildId);
        buildMock.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.Completed);
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        var isFinished = yield subject.isBuildFinished(BuildId);
        assert.equal(true, isFinished);
    }));
    [buildInterfaces.BuildStatus.All,
        buildInterfaces.BuildStatus.Cancelling,
        buildInterfaces.BuildStatus.InProgress,
        buildInterfaces.BuildStatus.None,
        buildInterfaces.BuildStatus.NotStarted,
        buildInterfaces.BuildStatus.Postponed]
        .forEach(function (buildStatus) {
        it("returns false when checking if build is finished and state is not completed", () => __awaiter(this, void 0, void 0, function* () {
            const BuildId = 42;
            var buildMock = setupBuildMock(BuildId);
            buildMock.setup(x => x.status).returns(() => buildStatus);
            yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
            var isFinished = yield subject.isBuildFinished(BuildId);
            assert.equal(false, isFinished);
        }));
    });
    it("returns true when checking if build was successful and result is succeeded", () => __awaiter(this, void 0, void 0, function* () {
        const BuildId = 42;
        var buildMock = setupBuildMock(BuildId);
        buildMock.setup(x => x.result).returns(() => buildInterfaces.BuildResult.Succeeded);
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        var wasSuccessful = yield subject.wasBuildSuccessful(BuildId);
        assert.equal(true, wasSuccessful);
    }));
    [buildInterfaces.BuildResult.Canceled,
        buildInterfaces.BuildResult.Failed,
        buildInterfaces.BuildResult.None,
        buildInterfaces.BuildResult.PartiallySucceeded]
        .forEach(function (buildResult) {
        it("returns false when checking if build was successful and result is not succeeded", () => __awaiter(this, void 0, void 0, function* () {
            const BuildId = 42;
            var buildMock = setupBuildMock(BuildId);
            buildMock.setup(x => x.result).returns(() => buildResult);
            yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
            var wasSuccessful = yield subject.wasBuildSuccessful(BuildId);
            assert.equal(false, wasSuccessful);
        }));
    });
    it("returns correct id when asking for ID of Build Definition", () => __awaiter(this, void 0, void 0, function* () {
        const DefinitionName = "MyDefinition";
        const ExpectedId = 12;
        var buildDefinitionReferenceMock = TypeMoq.Mock.ofType();
        buildDefinitionReferenceMock.setup(x => x.id).returns(() => ExpectedId);
        buildApiMock.setup(x => x.getDefinitions(TeamProjectId, DefinitionName))
            .returns(() => __awaiter(this, void 0, void 0, function* () { return [buildDefinitionReferenceMock.object]; }));
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        var actualId = yield subject.getBuildDefinitionId(DefinitionName);
        assert.equal(ExpectedId, actualId);
    }));
    it("throws when asking for ID of Build Definition and no build definition with that name exists", () => __awaiter(this, void 0, void 0, function* () {
        const DefinitionName = "MyDefinition";
        buildApiMock.setup(x => x.getDefinitions(TeamProjectId, DefinitionName))
            .returns(() => __awaiter(this, void 0, void 0, function* () { return []; }));
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        assert.rejects(() => __awaiter(this, void 0, void 0, function* () { return yield subject.getBuildDefinitionId(DefinitionName); }), {
            message: `Did not find any build definition with this name: ${DefinitionName}`
        });
    }));
    it("throws when asking for ID of Build Definition and more than 1 build definition with that name exists", () => __awaiter(this, void 0, void 0, function* () {
        const DefinitionName = "MyDefinition";
        const ExpectedId = 12;
        var buildDefinitionReferenceMock1 = TypeMoq.Mock.ofType();
        buildDefinitionReferenceMock1.setup(x => x.id).returns(() => ExpectedId);
        var buildDefinitionReferenceMock2 = TypeMoq.Mock.ofType();
        buildDefinitionReferenceMock2.setup(x => x.id).returns(() => ExpectedId);
        buildApiMock.setup(x => x.getDefinitions(TeamProjectId, DefinitionName))
            .returns(() => __awaiter(this, void 0, void 0, function* () { return [buildDefinitionReferenceMock1.object, buildDefinitionReferenceMock2.object]; }));
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        assert.rejects(() => __awaiter(this, void 0, void 0, function* () { return yield subject.getBuildDefinitionId(DefinitionName); }), {
            message: `Did not find any build definition with this name: ${DefinitionName}`
        });
    }));
    it("returns associated changes when asking for them given a specific build", () => __awaiter(this, void 0, void 0, function* () {
        const BuildId = 1337;
        var buildMock = setupBuildMock(BuildId);
        var changeMock = TypeMoq.Mock.ofType();
        var expectedChanges = [changeMock.object];
        buildApiMock.setup(x => x.getBuildChanges(TeamProjectId, BuildId))
            .returns(() => __awaiter(this, void 0, void 0, function* () { return expectedChanges; }));
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        var actualChanges = yield subject.getAssociatedChanges(buildMock.object);
        assert.equal(expectedChanges, actualChanges);
    }));
    it("returns test runs in correct order", () => __awaiter(this, void 0, void 0, function* () {
        const RunName = "Testrun";
        var testRun1 = setupTestRunMock(testInterfaces.TestRunState.Completed, RunName).object;
        var testRun2 = setupTestRunMock(testInterfaces.TestRunState.Completed, RunName).object;
        testApiMock.setup(x => x.getTestRuns(TeamProjectId)).returns(() => __awaiter(this, void 0, void 0, function* () { return [testRun1, testRun2]; }));
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        var actualTestRuns = yield subject.getTestRuns(RunName, 2);
        assert.equal(testRun1, actualTestRuns[0]);
        assert.equal(testRun2, actualTestRuns[1]);
    }));
    it("returns only specified number of test runs", () => __awaiter(this, void 0, void 0, function* () {
        const RunName = "Testrun";
        var testRun1 = setupTestRunMock(testInterfaces.TestRunState.Completed, RunName).object;
        var testRun2 = setupTestRunMock(testInterfaces.TestRunState.Completed, RunName).object;
        testApiMock.setup(x => x.getTestRuns(TeamProjectId)).returns(() => __awaiter(this, void 0, void 0, function* () { return [testRun1, testRun2]; }));
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        var actualTestRuns = yield subject.getTestRuns(RunName, 1);
        assert.equal(1, actualTestRuns.length);
    }));
    it("skips test runs from different run", () => __awaiter(this, void 0, void 0, function* () {
        const RunName = "Testrun";
        var testRun1 = setupTestRunMock(testInterfaces.TestRunState.Completed, RunName).object;
        var testRun2 = setupTestRunMock(testInterfaces.TestRunState.Completed, "some other run").object;
        var testRun3 = setupTestRunMock(testInterfaces.TestRunState.Completed, RunName).object;
        testApiMock.setup(x => x.getTestRuns(TeamProjectId)).returns(() => __awaiter(this, void 0, void 0, function* () { return [testRun1, testRun2, testRun3]; }));
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        var actualTestRuns = yield subject.getTestRuns(RunName, 2);
        assert.equal(testRun1, actualTestRuns[0]);
        assert.equal(testRun3, actualTestRuns[1]);
    }));
    [testInterfaces.TestRunState.Aborted,
        testInterfaces.TestRunState.InProgress,
        testInterfaces.TestRunState.NeedsInvestigation,
        testInterfaces.TestRunState.NotStarted,
        testInterfaces.TestRunState.Unspecified,
        testInterfaces.TestRunState.Waiting]
        .forEach(function (testRunState) {
        it("skips incomplete test runs", () => __awaiter(this, void 0, void 0, function* () {
            const RunName = "Testrun";
            var testRun1 = setupTestRunMock(testInterfaces.TestRunState.Completed, RunName).object;
            var testRun2 = setupTestRunMock(testRunState, RunName).object;
            var testRun3 = setupTestRunMock(testInterfaces.TestRunState.Completed, RunName).object;
            testApiMock.setup(x => x.getTestRuns(TeamProjectId)).returns(() => __awaiter(this, void 0, void 0, function* () { return [testRun1, testRun2, testRun3]; }));
            yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
            var actualTestRuns = yield subject.getTestRuns(RunName, 2);
            assert.equal(testRun1, actualTestRuns[0]);
            assert.equal(testRun3, actualTestRuns[1]);
        }));
    });
    it("skips undefined test runs", () => __awaiter(this, void 0, void 0, function* () {
        const RunName = "Testrun";
        var testRun1 = setupTestRunMock(testInterfaces.TestRunState.Completed, RunName).object;
        var testRun2 = undefined;
        var testRun3 = setupTestRunMock(testInterfaces.TestRunState.Completed, RunName).object;
        testApiMock.setup(x => x.getTestRuns(TeamProjectId)).returns(() => __awaiter(this, void 0, void 0, function* () { return [testRun1, testRun2, testRun3]; }));
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        var actualTestRuns = yield subject.getTestRuns(RunName, 2);
        assert.equal(testRun1, actualTestRuns[0]);
        assert.equal(testRun3, actualTestRuns[1]);
    }));
    it("skips downloading if noartifacts were found to download", () => __awaiter(this, void 0, void 0, function* () {
        const BuildId = 111;
        var downloadDirectory = `C:\\users\\someUser\\Downloads`;
        buildApiMock.setup(x => x.getArtifacts(BuildId, TeamProjectId))
            .returns(() => __awaiter(this, void 0, void 0, function* () { return []; }));
        fsStub.withArgs(downloadDirectory).returns(true);
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        yield subject.downloadArtifacts(BuildId, downloadDirectory);
        assert(consoleLogSpy.calledWith(`Downloading artifacts for Build ${BuildId}`));
        assert(consoleLogSpy.calledWith(`No artifacts found for build ${BuildId} - skipping...`));
        assert(consoleLogSpy.neverCalledWith("Found 0 artifact(s)"));
    }));
    it("creates download directory if it doesnt exist yet", () => __awaiter(this, void 0, void 0, function* () {
        const BuildId = 111;
        var downloadDirectory = `C:\\users\\someUser\\Downloads`;
        buildApiMock.setup(x => x.getArtifacts(BuildId, TeamProjectId))
            .returns(() => __awaiter(this, void 0, void 0, function* () { return []; }));
        fsStub.withArgs(downloadDirectory).returns(false);
        var mkDirStub = sinon.stub(fs, "mkdirSync");
        yield subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);
        yield subject.downloadArtifacts(BuildId, downloadDirectory);
        assert(consoleLogSpy.calledWith(`Directory ${downloadDirectory} does not exist - will be created`));
        assert(mkDirStub.calledWith(downloadDirectory));
    }));
    function setupBuildIdForBuildDefinition(name, id) {
        var buildRefMock = TypeMoq.Mock.ofType();
        buildRefMock.setup(x => x.id).returns(() => id);
        buildApiMock.setup(x => x.getDefinitions(TeamProjectId, name))
            .returns(() => __awaiter(this, void 0, void 0, function* () { return [buildRefMock.object]; }));
    }
    function setupBuildArtifactMock({ name, type = "Container", fileFormat = "zip" }) {
        var buildArtifactMock = TypeMoq.Mock.ofType();
        var artifactResourceMock = TypeMoq.Mock.ofType();
        artifactResourceMock.setup(x => x.type).returns(() => type);
        artifactResourceMock.setup(x => x.downloadUrl).returns(() => `https:://www.some.thing/MyFile.${fileFormat}`);
        buildArtifactMock.setup(x => x.name).returns(() => name);
        buildArtifactMock.setup(x => x.resource).returns(() => artifactResourceMock.object);
        return buildArtifactMock;
    }
    function setupTestRunMock(testRunState, testRunName) {
        var testRunMock = TypeMoq.Mock.ofType();
        testRunMock.setup(x => x.state).returns(() => testRunState.toString());
        testRunMock.setup(x => x.name).returns(() => testRunName);
        return testRunMock;
    }
    function setupBuildMock(buildId) {
        var buildMock = TypeMoq.Mock.ofType();
        buildMock.setup((x) => x.then).returns(() => undefined);
        buildMock.setup(x => x.id).returns(() => buildId);
        buildApiMock.setup(x => x.getBuild(buildId, TeamProjectId)).returns(() => __awaiter(this, void 0, void 0, function* () { return buildMock.object; }));
        return buildMock;
    }
});
