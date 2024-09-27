import * as TypeMoq from "typemoq";
import sinon = require("sinon");
const assert = require("assert");

import * as fs from "fs";

import * as index from "../index";
import * as buildInterfaces from "azure-devops-node-api/interfaces/BuildInterfaces";
import * as testInterfaces from "azure-devops-node-api/interfaces/TestInterfaces";
import * as buildApi from "azure-devops-node-api/BuildApi";
import * as testApi from "azure-devops-node-api/TestApi";
import * as taskAgentApi from "azure-devops-node-api/TaskAgentApi";
import * as coreApi from "azure-devops-node-api/CoreApi";
import { TeamProjectReference } from "azure-devops-node-api/interfaces/CoreInterfaces";
import { IRequestHandler } from "azure-devops-node-api/interfaces/common/VsoBaseInterfaces";
import { TaskAgentQueue } from "azure-devops-node-api/interfaces/TaskAgentInterfaces";
import { IGeneralFunctions } from "../generalfunctions";


describe("TFS Rest Service Tests", () => {
    const ServerUrl: string = "https://www.myTfsServer.com:8080";
    const TeamProjectName: string = "MyTeam";
    const TeamProjectId: string = "797c3b56-e87e-40f4-8af2-69b3b1467109";

    let consoleLogSpy: sinon.SinonSpy;
    let fsStub: sinon.SinonStub;

    let subject: index.ITfsRestService;
    let buildApiMock: TypeMoq.IMock<buildApi.IBuildApi>;
    let testApiMock: TypeMoq.IMock<testApi.ITestApi>;
    let taskAgentApiMock: TypeMoq.IMock<taskAgentApi.ITaskAgentApi>;
    let coreApiMock: TypeMoq.IMock<coreApi.ICoreApi>;
    let azureDevOpsWebApiMock: TypeMoq.IMock<index.IAzureDevOpsWebApi>;
    let generalFunctionsMock: TypeMoq.IMock<IGeneralFunctions>;
    let requestHandlerMock: TypeMoq.IMock<IRequestHandler>;

    beforeEach(() => {
        azureDevOpsWebApiMock = TypeMoq.Mock.ofType<index.IAzureDevOpsWebApi>();
        generalFunctionsMock = TypeMoq.Mock.ofType<IGeneralFunctions>();

        requestHandlerMock = TypeMoq.Mock.ofType<IRequestHandler>();
        azureDevOpsWebApiMock.setup(x => x.getBasicHandler(TypeMoq.It.isAnyString(), TypeMoq.It.isAnyString()))
            .returns(() => requestHandlerMock.object);
        azureDevOpsWebApiMock.setup(x => x.getBearerHandler(TypeMoq.It.isAnyString()))
            .returns(() => requestHandlerMock.object);
        azureDevOpsWebApiMock.setup(x => x.getHandlerFromToken(TypeMoq.It.isAnyString()))
            .returns(() => requestHandlerMock.object);

        buildApiMock = TypeMoq.Mock.ofType<buildApi.IBuildApi>();
        testApiMock = TypeMoq.Mock.ofType<testApi.ITestApi>();
        taskAgentApiMock = TypeMoq.Mock.ofType<taskAgentApi.ITaskAgentApi>();
        coreApiMock = TypeMoq.Mock.ofType<coreApi.ICoreApi>();

        /* mocks must be "thenable", see https://github.com/florinn/typemoq/issues/70#issuecomment-310828275 */
        buildApiMock.setup((x: any) => x.then).returns(() => undefined);
        testApiMock.setup((x: any) => x.then).returns(() => undefined);
        taskAgentApiMock.setup((x: any) => x.then).returns(() => undefined);
        coreApiMock.setup((x: any) => x.then).returns(() => undefined);

        var teamProjectMock: TypeMoq.IMock<TeamProjectReference> = TypeMoq.Mock.ofType<TeamProjectReference>();
        teamProjectMock.setup(prj => prj.name).returns(() => TeamProjectName);
        teamProjectMock.setup(prj => prj.id).returns(() => TeamProjectId);

        coreApiMock.setup(api => api.getProjects(TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny()))
            .returns(async () => [teamProjectMock.object]);

        azureDevOpsWebApiMock.setup(x => x.getBuildApi()).returns(async () => buildApiMock.object);
        azureDevOpsWebApiMock.setup(x => x.getTestApi()).returns(async () => testApiMock.object);
        azureDevOpsWebApiMock.setup(x => x.getTaskAgentApi()).returns(async () => taskAgentApiMock.object);
        azureDevOpsWebApiMock.setup(x => x.getCoreApi()).returns(async () => coreApiMock.object);

        generalFunctionsMock.setup(x => x.sleep(TypeMoq.It.isAnyNumber()));

        consoleLogSpy = sinon.spy(console, "log");
        fsStub = sinon.stub(fs, "existsSync");

        subject = new index.TfsRestService(azureDevOpsWebApiMock.object, generalFunctionsMock.object);
    });

    afterEach(async () => {
        consoleLogSpy.restore();
        fsStub.restore();
    });

    it("queues new build for specified build definition", async () => {
        const BuildDefinitionName: string = "MyBuildDefinition";
        const BuilDefinitionId: number = 12;

        var expectedBuildToTrigger: any = {
            definition: { id: BuilDefinitionId },
            parameters: ""
        };

        setupBuildIdForBuildDefinition(BuildDefinitionName, BuilDefinitionId);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        await subject.triggerBuild(BuildDefinitionName, null, undefined, undefined, null, undefined, undefined, undefined);

        // assert
        buildApiMock.verify(x => x.queueBuild(expectedBuildToTrigger, TeamProjectId, true), TypeMoq.Times.once());
    });

    it("queues new build for build definition with specified id", async () => {
        const BuilDefinitionId: number = 12;

        var expectedBuildToTrigger: any = {
            definition: { id: BuilDefinitionId },
            parameters: ""
        };

        buildApiMock.setup(x => x.getDefinitions(TeamProjectId, `${BuilDefinitionId}`))
            .returns(async () => []);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        await subject.triggerBuild(`${BuilDefinitionId}`, null, undefined, undefined, null, undefined, undefined, null);

        // assert
        buildApiMock.verify(x => x.queueBuild(expectedBuildToTrigger, TeamProjectId, true), TypeMoq.Times.once());
    });

    it("queues new build in specified branch", async () => {
        const BuildDefinitionName: string = "MyBuildDefinition";
        const BuilDefinitionId: number = 12;
        const SourceBranch: string = "features/unittests";

        var expectedBuildToTrigger: any = {
            definition: { id: BuilDefinitionId },
            parameters: "",
            sourceBranch: SourceBranch
        };

        setupBuildIdForBuildDefinition(BuildDefinitionName, BuilDefinitionId);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        await subject.triggerBuild(BuildDefinitionName, SourceBranch, undefined, undefined, null, undefined, undefined, "");

        // assert
        buildApiMock.verify(x => x.queueBuild(expectedBuildToTrigger, TeamProjectId, true), TypeMoq.Times.once());
    });

    it("queues new build for user that requested it", async () => {
        const BuildDefinitionName: string = "MyBuildDefinition";
        const BuilDefinitionId: number = 12;
        const RequestedUserId: string = "37";

        var expectedBuildToTrigger: any = {
            definition: { id: BuilDefinitionId },
            parameters: "",
            requestedFor: { id: RequestedUserId }
        };

        setupBuildIdForBuildDefinition(BuildDefinitionName, BuilDefinitionId);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        await subject.triggerBuild(BuildDefinitionName, null, RequestedUserId, undefined, null, undefined, undefined, undefined);

        // assert
        buildApiMock.verify(x => x.queueBuild(expectedBuildToTrigger, TeamProjectId, true), TypeMoq.Times.once());
    });

    it("retries 5 times if request fails", async () => {
        const BuildDefinitionName: string = "MyBuildDefinition";
        const BuilDefinitionId: number = 12;
        const RequestedUserId: string = "37";

        var expectedBuildToTrigger: any = {
            definition: { id: BuilDefinitionId },
            parameters: "",
            requestedFor: { id: RequestedUserId }
        };

        setupBuildIdForBuildDefinition(BuildDefinitionName, BuilDefinitionId);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        buildApiMock.setup(x => x.queueBuild(expectedBuildToTrigger, TeamProjectId, true)).throws(new Error("Something wen't wrong"));

        // act
        var requestFailed: boolean = false;
        try {
            await subject.triggerBuild(BuildDefinitionName, null, RequestedUserId, undefined, null, undefined, undefined, undefined);
        }
        catch {
            requestFailed = true;
        }

        // assert
        assert.equal(true, requestFailed);

        var retryCount = 5;

        buildApiMock.verify(x => x.queueBuild(expectedBuildToTrigger, TeamProjectId, true), TypeMoq.Times.exactly(retryCount));
        generalFunctionsMock.verify(x => x.sleep(TypeMoq.It.isAnyNumber()), TypeMoq.Times.exactly(retryCount - 1));
    });

    it("queues new build with specified source version", async () => {
        const BuildDefinitionName: string = "MyBuildDefinition";
        const BuilDefinitionId: number = 12;
        const SourceVersion: string = "C17";

        var expectedBuildToTrigger: any = {
            definition: { id: BuilDefinitionId },
            parameters: "",
            sourceVersion: SourceVersion
        };

        setupBuildIdForBuildDefinition(BuildDefinitionName, BuilDefinitionId);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        await subject.triggerBuild(BuildDefinitionName, null, "", SourceVersion, null, undefined, undefined, undefined);

        // assert
        buildApiMock.verify(x => x.queueBuild(expectedBuildToTrigger, TeamProjectId, true), TypeMoq.Times.once());
    });

    it("queues new build with specified Queue Id", async () => {
        const BuildDefinitionName: string = "MyBuildDefinition";
        const BuilDefinitionId: number = 12;
        const QueueId: number = 1337;

        var expectedBuildToTrigger: any = {
            definition: { id: BuilDefinitionId },
            parameters: "",
            queue: { id: QueueId }
        };

        setupBuildIdForBuildDefinition(BuildDefinitionName, BuilDefinitionId);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        await subject.triggerBuild(BuildDefinitionName, null, "", "", null, QueueId, undefined, undefined);

        // assert
        buildApiMock.verify(x => x.queueBuild(expectedBuildToTrigger, TeamProjectId, true), TypeMoq.Times.once());
    });

    it("queues new build with specified demands", async () => {
        const BuildDefinitionName: string = "MyBuildDefinition";
        const BuilDefinitionId: number = 12;

        var expectedDemands: string[] = ["SomeDemand", "OtherDemand=12"];

        var expectedBuildToTrigger: any = {
            definition: { id: BuilDefinitionId },
            parameters: "",
            demands: [{
                name: "SomeDemand",
                value: null
            },
            {
                name: "OtherDemand",
                value: "12"
            }]
        };

        setupBuildIdForBuildDefinition(BuildDefinitionName, BuilDefinitionId);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        await subject.triggerBuild(BuildDefinitionName, null, "", "", expectedDemands, null, undefined, undefined);

        // assert
        buildApiMock.verify(x => x.queueBuild(expectedBuildToTrigger, TeamProjectId, true), TypeMoq.Times.once());
    });

    [[`\\\"VariableKey\\\": \\\"Value\\\"`, `{"VariableKey":"Value"}`],
    ["VariableKey: Value", `{"VariableKey":"Value"}`],
    ["VariableKey1: Value1, VariableKey2: Value2", `{"VariableKey1":"Value1","VariableKey2":"Value2"}`],
    ["VariableKey1: Value1, Value2, VariableKey2: Value3", `{"VariableKey1":"Value1, Value2","VariableKey2":"Value3"}`],
    ["Foo:A,B", `{"Foo":"A,B"}`],
    ["VariableKey: C:\Test\Something", `{"VariableKey":"C:\Test\Something"}`],
    ["VariableKey: C:\Test\Something, otherValue, VariableKey2: MyValue",
        `{"VariableKey":"C:\Test\Something, otherValue","VariableKey2":"MyValue"}`],
    [`TrafficManagerEndpoints: { "a": 50, "b": 50 }`, `{"TrafficManagerEndpoints":"{ \\"a\\": 50, \\"b\\": 50 }"}`],
    [`TrafficManagerEndpoints: { "a": 50, "b": 50 }, Key2: MyValue`,
        `{"TrafficManagerEndpoints":"{ \\"a\\": 50, \\"b\\": 50 }","Key2":"MyValue"}`],
    [`ComplexJsonObject: { "MyValue": 17, "SubObject": { "Simple": "Hello", "OtherObject": { "Simple": 12}}}`,
        `{"ComplexJsonObject":"{ \\"MyValue\\": 17, \\"SubObject\\": { \\"Simple\\": \\"Hello\\", \\"OtherObject\\": { \\"Simple\\": 12}}}"}`],
    [`{ "01VarName": "...", "02VarName": "..." }`, `{ "01VarName": "...", "02VarName": "..." }`]]
        .forEach(function (input: any): void {
            it("queues new build with specified build parameters", async () => {
                const BuildDefinitionName: string = "MyBuildDefinition";
                const BuilDefinitionId: number = 12;

                var parameterInput: string = input[0];
                var expectedParameterString: string = input[1];

                var expectedBuildToTrigger: any = {
                    definition: { id: BuilDefinitionId },
                    parameters: expectedParameterString
                };

                setupBuildIdForBuildDefinition(BuildDefinitionName, BuilDefinitionId);

                await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

                // act
                await subject.triggerBuild(BuildDefinitionName, null, "", "", null, null, parameterInput, undefined);

                // assert
                buildApiMock.verify(x => x.queueBuild(expectedBuildToTrigger, TeamProjectId, true), TypeMoq.Times.once());
            });
        });

    [
        [`\\\"VariableKey\\\": \\\"Value\\\"`, {"VariableKey":"Value"}],
        ["VariableKey: Value", {"VariableKey":"Value"}],
        ["VariableKey1: Value1, VariableKey2: Value2", {"VariableKey1":"Value1","VariableKey2":"Value2"}],
        ["VariableKey1: Value1, Value2, VariableKey2: Value3", {"VariableKey1":"Value1, Value2","VariableKey2":"Value3"}],
        ["VariableKey: C:\Test\Something", {"VariableKey":"C:\Test\Something"}],
        ["VariableKey: C:\Test\Something, otherValue, VariableKey2: MyValue", {"VariableKey":"C:\Test\Something, otherValue","VariableKey2":"MyValue"}],
        [`agentNumberInPool: 2, paraPipelineOwner: IBC`, { "agentNumberInPool": "2", "paraPipelineOwner": "IBC"}]
    ]
        .forEach(function (input: any): void {
            it("queues new build with specified template parameters", async () => {
                const BuildDefinitionName: string = "MyBuildDefinition";
                const BuilDefinitionId: number = 12;

                var templateParameterInput: string = input[0]
                var expectedTemplateParameter: { [key: string]: string; } = input[1];

                var expectedBuildToTrigger: any = {
                    definition: { id: BuilDefinitionId },
                    parameters: "",
                    templateParameters: expectedTemplateParameter
                };

                setupBuildIdForBuildDefinition(BuildDefinitionName, BuilDefinitionId);

                await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

                // act
                await subject.triggerBuild(BuildDefinitionName, null, "", "", null, null, undefined, templateParameterInput);

                // assert
                buildApiMock.verify(x => x.queueBuild(expectedBuildToTrigger, TeamProjectId, true), TypeMoq.Times.once());
            });
        });

    ["ShouldFailWhenThereIsNoColon",
        "Fail:When:MultipleColonrsAreThere:",
        "Trailing:Commas,"]
        .forEach(function (invalidParameter: string): void {
            it("throws error if build parameters are not in specified format", async () => {
                const BuildDefinitionName: string = "MyBuildDefinition";
                const BuilDefinitionId: number = 12;

                setupBuildIdForBuildDefinition(BuildDefinitionName, BuilDefinitionId);
                await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

                // act
                assert.rejects(async () => await subject.triggerBuild(BuildDefinitionName, null, "", "", null, null, invalidParameter, undefined),
                    {
                        message: `Build Parameters were not in expected format. Please verify that parameters are in the following format: \"VariableName: Value\"`
                    });
            });
        });

    [undefined, ""].forEach(function (teamProject: string): void {
        it("throws if no team project was specified", async () => {
            await assert.rejects(
                async () => await subject.initialize(
                    index.AuthenticationMethodBasicAuthentication, "user", "pw", ServerUrl, teamProject, true),
                {
                    message: "Team Project has to be defined!"
                });
        });
    });

    [undefined, null, ""].forEach(function (oAuthToken: string): void {
        it("throws if OAuth Authentication is selected and no token is specified", async () => {
            await assert.rejects(
                async () => await subject.initialize(
                    index.AuthenticationMethodOAuthToken, "user", oAuthToken, ServerUrl, TeamProjectName, true),
                {
                    message: "No valid OAuth token provided. Please check that you have the OAuth Token Access allowed for your builds."
                });
        });
    });

    [undefined, null, ""].forEach(function (username: string): void {
        it("throws if Basic Authentication is selected and no username is specified", async () => {
            await assert.rejects(
                async () => await subject.initialize(
                    index.AuthenticationMethodBasicAuthentication, username, "Password", ServerUrl, TeamProjectName, true),
                {
                    message: "No Username provided. Please check that you specified the user correctly in the configuration."
                });
        });
    });

    [undefined, null, ""].forEach(function (password: string): void {
        it("throws if Basic Authentication is selected and no username is specified", async () => {
            await assert.rejects(
                async () => await subject.initialize(
                    index.AuthenticationMethodBasicAuthentication, "Username", password, ServerUrl, TeamProjectName, true),
                {
                    message: "No password provided. Please check that you specified the password correctly in the configuration."
                });
        });
    });

    [undefined, null, ""].forEach(function (token: string): void {
        it("throws if Personal Access Token Authentication is selected and no token is specified", async () => {
            await assert.rejects(
                async () => await subject.initialize(
                    index.AuthenticationMethodPersonalAccessToken, "Username", token, ServerUrl, TeamProjectName, true),
                {
                    message: `No valid Personal Access Token provided. Please check that you specified the token to be used correctly in the configuration.`
                });
        });
    });

    it("throws if unsupported Authentication method is selected", async () => {
        var authenticationMethod: string = "Unsupported Authentication";

        await assert.rejects(
            async () => await subject.initialize(
                authenticationMethod, "username", "password", ServerUrl, TeamProjectName, true),
            {
                message: `Cannot handle authentication method ${authenticationMethod}`
            });
    });

    it("useses bearer handler if OAuth Authentication is used", async () => {
        const ExpectedToken: string = "Mytoken";

        // act
        await subject.initialize(index.AuthenticationMethodOAuthToken, "doesn't matter", ExpectedToken, ServerUrl, TeamProjectName, true);

        // assert
        azureDevOpsWebApiMock.verify(x => x.getBearerHandler(ExpectedToken), TypeMoq.Times.once());
        azureDevOpsWebApiMock.verify(
            x => x.initializeConnection(ServerUrl, requestHandlerMock.object, TypeMoq.It.isAny()), TypeMoq.Times.once());
    });

    it("useses basic handler if Basic Authentication is used", async () => {
        const ExpectedPassword: string = "P@5sW0rd";
        const ExpectedUsername: string = "UserName";

        // act
        await subject.initialize(
            index.AuthenticationMethodBasicAuthentication, ExpectedUsername, ExpectedPassword, ServerUrl, TeamProjectName, true);

        // assert
        azureDevOpsWebApiMock.verify(x => x.getBasicHandler(ExpectedUsername, ExpectedPassword), TypeMoq.Times.once());
        azureDevOpsWebApiMock.verify(
            x => x.initializeConnection(ServerUrl, requestHandlerMock.object, TypeMoq.It.isAny()), TypeMoq.Times.once());
    });

    it("useses handler from Token if PAT Authentication is used", async () => {
        const PersonalAccessToken: string = "12389udfsalkjdsaf0912o3iusdf";

        // act
        await subject.initialize(
            index.AuthenticationMethodPersonalAccessToken, "no one cares", PersonalAccessToken, ServerUrl, TeamProjectName, true);

        // assert
        azureDevOpsWebApiMock.verify(x => x.getHandlerFromToken(PersonalAccessToken), TypeMoq.Times.once());
        azureDevOpsWebApiMock.verify(
            x => x.initializeConnection(ServerUrl, requestHandlerMock.object, TypeMoq.It.isAny()), TypeMoq.Times.once());
    });

    [true, false].forEach(function (ignoreSslError: boolean): void {
        it("sets request properties correct", async () => {

            // act
            await subject.initialize(
                index.AuthenticationMethodBasicAuthentication, "no one cares", "SomePassword", ServerUrl, TeamProjectName, ignoreSslError);

            // assert
            azureDevOpsWebApiMock.verify(x => x.initializeConnection(
                ServerUrl, requestHandlerMock.object, { ignoreSslError: ignoreSslError }), TypeMoq.Times.once());
        });
    });

    it("uses team project id as is if it is a guid", async () => {
        // act
        await subject.initialize(
            index.AuthenticationMethodBasicAuthentication, "no one cares", "SomePassword", ServerUrl, TeamProjectId, true);

        // assert
        assert(consoleLogSpy.calledWith(`Provided team project was guid.`));
        coreApiMock.verify(x => x.getProjects(), TypeMoq.Times.never());
    });

    it("uses team project name to get guid", async () => {
        // act
        await subject.initialize(
            index.AuthenticationMethodBasicAuthentication, "no one cares", "SomePassword", ServerUrl, TeamProjectName, true);

        // assert
        coreApiMock.verify(x => x.getProjects(TypeMoq.It.isAny(), 300, TypeMoq.It.isAny(), TypeMoq.It.isAny()), TypeMoq.Times.once());
    });
    
    it("uses specific top value for getting projects", async () => {
        // act
        var custom_top_value = 1337;
        process.env.AzureNodeAPI_GetProjects_Top = `${custom_top_value}`;

        await subject.initialize(
            index.AuthenticationMethodBasicAuthentication, "no one cares", "SomePassword", ServerUrl, TeamProjectName, true);

        // assert
        coreApiMock.verify(x => x.getProjects(TypeMoq.It.isAny(), custom_top_value, TypeMoq.It.isAny(), TypeMoq.It.isAny()), TypeMoq.Times.once());
    });

    it("fetches id from team projects via api if its not a guid", async () => {
        // act
        await subject.initialize(
            index.AuthenticationMethodBasicAuthentication, "no one cares", "SomePassword", ServerUrl, TeamProjectName, true);

        // assert
        assert(consoleLogSpy.calledWith(`Found id for team project ${TeamProjectName}: ${TeamProjectId}`));
    });

    it("throws error if no team with specified name was found", async () => {
        const TeamName: string = "Some not existing team";

        await assert.rejects(
            async () => await subject.initialize(
                index.AuthenticationMethodBasicAuthentication, "user", "pw", ServerUrl, TeamName, true),
            {
                message: `Could not find any Team Project with name ${TeamName}`
            });
    });

    it("throws error if access to team project fails", async () => {
        coreApiMock.reset();
        coreApiMock.setup((x: any) => x.then).returns(() => undefined);
        coreApiMock.setup(api => api.getProjects(TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny()))
            .throws(new Error());

        subject = new index.TfsRestService(azureDevOpsWebApiMock.object);

        await assert.rejects(
            async () => await subject.initialize(
                index.AuthenticationMethodBasicAuthentication, "user", "pw", ServerUrl, TeamProjectName, true),
            {
                message: `Could not access projects - you're version of TFS might be too old, please check online for help.`
            });
    });

    it("getBuildsByStatus returns all builds of the specified build definition", async () => {
        const BuildDefinitionName: string = "MyBuild";
        const BuildDefinitionID: number = 42;
        const ExpectedBuildStatus: buildInterfaces.BuildStatus = buildInterfaces.BuildStatus.InProgress;

        var buildMock: TypeMoq.IMock<buildInterfaces.Build> = TypeMoq.Mock.ofType<buildInterfaces.Build>();
        var buildDefinitionReferenceMock: TypeMoq.IMock<buildInterfaces.BuildDefinitionReference>
            = TypeMoq.Mock.ofType<buildInterfaces.BuildDefinitionReference>();

        var expectedBuilds: buildInterfaces.Build[] = [buildMock.object];
        buildDefinitionReferenceMock.setup(x => x.id).returns(() => BuildDefinitionID);

        buildApiMock.setup(x => x.getBuilds(TeamProjectId, [BuildDefinitionID], null, null, null, null, null, null, ExpectedBuildStatus))
            .returns(async () => expectedBuilds);
        buildApiMock.setup(x => x.getDefinitions(TeamProjectId, BuildDefinitionName))
            .returns(async () => [buildDefinitionReferenceMock.object]);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        var actualBuilds: buildInterfaces.Build[] = await subject.getBuildsByStatus(BuildDefinitionName, ExpectedBuildStatus);

        // assert
        assert.equal(expectedBuilds, actualBuilds);
    });

    it("ignores if build to cancel has already completed", async () => {
        const BuildId: number = 1337;

        var buildMock: TypeMoq.IMock<buildInterfaces.Build> = setupBuildMock(BuildId);
        buildMock.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.Completed);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        await subject.cancelBuild(BuildId);

        // assert
        buildApiMock.verify(x => x.updateBuild(TypeMoq.It.isAny(), TeamProjectId, BuildId), TypeMoq.Times.never());
        assert(consoleLogSpy.calledWith(`Build ${BuildId} has already finished.`));
    });

    it("updates build with cancelling status if it has not already completed", async () => {
        const BuildId: number = 1337;

        var expectedRequest: any = { status: buildInterfaces.BuildStatus.Cancelling };

        var buildMock: TypeMoq.IMock<buildInterfaces.Build> = setupBuildMock(BuildId);
        buildMock.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.InProgress);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        await subject.cancelBuild(BuildId);

        // assert
        buildApiMock.verify(x => x.updateBuild(expectedRequest, TeamProjectId, BuildId), TypeMoq.Times.once());
    });

    it("returns true when we check if builds have finished and the status is completed", async () => {
        const BuildId: number = 1337;

        var buildMock: TypeMoq.IMock<buildInterfaces.Build> = setupBuildMock(BuildId);
        buildMock.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.Completed);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        var isFinished: boolean = await subject.areBuildsFinished([BuildId], false, false);

        // assert
        assert.equal(true, isFinished);
    });

    it("returns false when we check if builds have finished and the status is not completed", async () => {
        const BuildId: number = 1337;

        var buildMock: TypeMoq.IMock<buildInterfaces.Build> = setupBuildMock(BuildId);
        buildMock.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.InProgress);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        var isFinished: boolean = await subject.areBuildsFinished([BuildId], false, false);

        // assert
        assert.equal(false, isFinished);
    });

    it("returns true when we check if two builds have finished and both have", async () => {
        const BuildId1: number = 1337;
        const BuildId2: number = 42;

        var buildMock1: TypeMoq.IMock<buildInterfaces.Build> = setupBuildMock(BuildId1);
        buildMock1.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.Completed);
        var buildMock2: TypeMoq.IMock<buildInterfaces.Build> = setupBuildMock(BuildId2);
        buildMock2.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.Completed);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        var isFinished: boolean = await subject.areBuildsFinished([BuildId1, BuildId2], false, false);

        // assert
        assert.equal(true, isFinished);
    });

    it("returns false when we check if two builds have finished and only has so far", async () => {
        const BuildId1: number = 1337;
        const BuildId2: number = 42;

        var buildMock1: TypeMoq.IMock<buildInterfaces.Build> = setupBuildMock(BuildId1);
        buildMock1.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.Completed);
        var buildMock2: TypeMoq.IMock<buildInterfaces.Build> = setupBuildMock(BuildId2);
        buildMock2.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.InProgress);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        var isFinished: boolean = await subject.areBuildsFinished([BuildId1, BuildId2], false, false);

        // assert
        assert.equal(false, isFinished);
    });

    it("does not throw if build has not successfully completed and is not configured to fail on non successful builds", async () => {
        const BuildId: number = 1337;
        const BuildDefinitionName: string = "Failed Build";
        const BuildUrl: string = "https://whatever.my.build.is";

        var buildMock: TypeMoq.IMock<buildInterfaces.Build> = setupBuildMock(BuildId);
        buildMock.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.Completed);
        buildMock.setup(x => x.result).returns(() => buildInterfaces.BuildResult.Failed);
        buildMock.setup(x => x.definition.name).returns(() => BuildDefinitionName);

        var links: any = {
            web: {
                href: BuildUrl
            }
        };
        buildMock.setup(x => x._links).returns(() => links);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        var actual: boolean = await subject.areBuildsFinished([BuildId], false, false);

        // assert
        assert.equal(true, actual);
    });

    it("throws if build has not successfully completed and is configured to fail on non successful builds", async () => {
        const BuildId: number = 1337;
        const BuildDefinitionName: string = "Failed Build";
        const BuildUrl: string = "https://whatever.my.build.is";

        var buildMock: TypeMoq.IMock<buildInterfaces.Build> = setupBuildMock(BuildId);
        buildMock.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.Completed);
        buildMock.setup(x => x.result).returns(() => buildInterfaces.BuildResult.Failed);

        var definition: any = { name: BuildDefinitionName };
        var links: any = {
            web: {
                href: BuildUrl
            }
        };
        buildMock.setup(x => x.definition).returns(() => definition);
        buildMock.setup(x => x._links).returns(() => links);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        assert.rejects(
            async () => await subject.areBuildsFinished([BuildId], true, false),
            {
                message: `Build ${BuildId} (${BuildDefinitionName}) was not successful. See following link for more info: ${BuildUrl}`
            });
    });

    it("does not throw if build was partially successful and is configured to fail on non successful builds", async () => {
        const BuildId: number = 1337;
        const BuildDefinitionName: string = "Failed Build";
        const BuildUrl: string = "https://whatever.my.build.is";

        var buildMock: TypeMoq.IMock<buildInterfaces.Build> = setupBuildMock(BuildId);
        buildMock.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.Completed);
        buildMock.setup(x => x.result).returns(() => buildInterfaces.BuildResult.PartiallySucceeded);
        buildMock.setup(x => x.definition.name).returns(() => BuildDefinitionName);

        var links: any = {
            web: {
                href: BuildUrl
            }
        };

        buildMock.setup(x => x._links).returns(() => links);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        var actualValue: boolean = await subject.areBuildsFinished([BuildId], true, true);

        // assert
        assert.equal(true, actualValue);
    });

    it("does not throw if build was partially successful and is configured to fail on non successful builds", async () => {
        const BuildId: number = 1337;
        const BuildDefinitionName: string = "Failed Build";
        const BuildUrl: string = "https://whatever.my.build.is";

        var buildMock: TypeMoq.IMock<buildInterfaces.Build> = setupBuildMock(BuildId);
        buildMock.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.Completed);
        buildMock.setup(x => x.result).returns(() => buildInterfaces.BuildResult.PartiallySucceeded);

        var definition: any = { name: BuildDefinitionName };

        var links: any = {
            web: {
                href: BuildUrl
            }
        };
        buildMock.setup(x => x.definition).returns(() => definition);
        buildMock.setup(x => x._links).returns(() => links);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        assert.rejects(
            async () => await subject.areBuildsFinished([BuildId], true, false),
            {
                message: `Build ${BuildId} (${BuildDefinitionName}) was not successful. See following link for more info: ${BuildUrl}`
            });
    });

    it("gets queue id by name if queue exists", async () => {
        const QueueName: string = "MyQueue";
        const ExpectedQueueId: number = 12;

        var taskAgentQueueMock: TypeMoq.IMock<TaskAgentQueue> = TypeMoq.Mock.ofType<TaskAgentQueue>();
        taskAgentQueueMock.setup(x => x.name).returns(() => QueueName);
        taskAgentQueueMock.setup(x => x.id).returns(() => ExpectedQueueId);

        taskAgentApiMock.setup(x => x.getAgentQueues(TeamProjectId, QueueName)).returns(async () => [taskAgentQueueMock.object]);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        var actualQueueId: number = await subject.getQueueIdByName(QueueName);

        // assert
        assert.equal(ExpectedQueueId, actualQueueId);
    });

    it("throws error if no queues with specified name were found", async () => {
        const QueueName: string = "MyQueue";
        taskAgentApiMock.setup(x => x.getAgentQueues(TeamProjectId, QueueName)).returns(async () => []);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        assert.rejects(async () => await subject.getQueueIdByName(QueueName),
            {
                message: `Could not find any Queue with the name ${QueueName}`
            });
    });


    it("throws error if multiple queues with name were found", async () => {
        const QueueName: string = "MyQueue";

        var taskAgentQueueMock1: TypeMoq.IMock<TaskAgentQueue> = TypeMoq.Mock.ofType<TaskAgentQueue>();
        taskAgentQueueMock1.setup(x => x.name).returns(() => QueueName);
        taskAgentQueueMock1.setup(x => x.id).returns(() => 12);
        var taskAgentQueueMock2: TypeMoq.IMock<TaskAgentQueue> = TypeMoq.Mock.ofType<TaskAgentQueue>();
        taskAgentQueueMock2.setup(x => x.name).returns(() => QueueName);
        taskAgentQueueMock2.setup(x => x.id).returns(() => 42);

        taskAgentApiMock.setup(x => x.getAgentQueues(TeamProjectId, QueueName))
            .returns(async () => [taskAgentQueueMock1.object, taskAgentQueueMock2.object]);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        assert.rejects(async () => await subject.getQueueIdByName(QueueName),
            {
                message: `Could not find any Queue with the name ${QueueName}`
            });
    });

    it("returns true when checking if build is finished and state is completed", async () => {
        const BuildId: number = 42;

        var buildMock: TypeMoq.IMock<buildInterfaces.Build> = setupBuildMock(BuildId);
        buildMock.setup(x => x.status).returns(() => buildInterfaces.BuildStatus.Completed);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        var isFinished: boolean = await subject.isBuildFinished(BuildId);

        // assert
        assert.equal(true, isFinished);
    });

    [buildInterfaces.BuildStatus.All,
    buildInterfaces.BuildStatus.Cancelling,
    buildInterfaces.BuildStatus.InProgress,
    buildInterfaces.BuildStatus.None,
    buildInterfaces.BuildStatus.NotStarted,
    buildInterfaces.BuildStatus.Postponed]
        .forEach(function (buildStatus: buildInterfaces.BuildStatus): void {
            it("returns false when checking if build is finished and state is not completed", async () => {
                const BuildId: number = 42;

                var buildMock: TypeMoq.IMock<buildInterfaces.Build> = setupBuildMock(BuildId);
                buildMock.setup(x => x.status).returns(() => buildStatus);

                await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

                // act
                var isFinished: boolean = await subject.isBuildFinished(BuildId);

                // assert
                assert.equal(false, isFinished);
            });
        });

    it("returns true when checking if build was successful and result is succeeded", async () => {
        const BuildId: number = 42;

        var buildMock: TypeMoq.IMock<buildInterfaces.Build> = setupBuildMock(BuildId);
        buildMock.setup(x => x.result).returns(() => buildInterfaces.BuildResult.Succeeded);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        var wasSuccessful: boolean = await subject.wasBuildSuccessful(BuildId);

        // assert
        assert.equal(true, wasSuccessful);
    });

    [buildInterfaces.BuildResult.Canceled,
    buildInterfaces.BuildResult.Failed,
    buildInterfaces.BuildResult.None,
    buildInterfaces.BuildResult.PartiallySucceeded]
        .forEach(function (buildResult: buildInterfaces.BuildResult): void {
            it("returns false when checking if build was successful and result is not succeeded", async () => {
                const BuildId: number = 42;

                var buildMock: TypeMoq.IMock<buildInterfaces.Build> = setupBuildMock(BuildId);
                buildMock.setup(x => x.result).returns(() => buildResult);

                await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

                // act
                var wasSuccessful: boolean = await subject.wasBuildSuccessful(BuildId);

                // assert
                assert.equal(false, wasSuccessful);
            });
        });

    it("returns correct id when asking for ID of Build Definition", async () => {
        const DefinitionName: string = "MyDefinition";
        const ExpectedId: number = 12;

        var buildDefinitionReferenceMock: TypeMoq.IMock<buildInterfaces.BuildDefinitionReference>
            = TypeMoq.Mock.ofType<buildInterfaces.BuildDefinitionReference>();
        buildDefinitionReferenceMock.setup(x => x.id).returns(() => ExpectedId);
        buildApiMock.setup(x => x.getDefinitions(TeamProjectId, DefinitionName))
            .returns(async () => [buildDefinitionReferenceMock.object]);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        var actualId: number = await subject.getBuildDefinitionId(DefinitionName);

        // assert
        assert.equal(ExpectedId, actualId);
    });

    it("throws when asking for ID of Build Definition and no build definition with that name exists", async () => {
        const DefinitionName: string = "MyDefinition";

        buildApiMock.setup(x => x.getDefinitions(TeamProjectId, DefinitionName))
            .returns(async () => []);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        assert.rejects(async () => await subject.getBuildDefinitionId(DefinitionName),
            {
                message: `Did not find any build definition with this name: ${DefinitionName}`
            });
    });

    it("throws when asking for ID of Build Definition and more than 1 build definition with that name exists", async () => {
        const DefinitionName: string = "MyDefinition";
        const ExpectedId: number = 12;

        var buildDefinitionReferenceMock1: TypeMoq.IMock<buildInterfaces.BuildDefinitionReference>
            = TypeMoq.Mock.ofType<buildInterfaces.BuildDefinitionReference>();
        buildDefinitionReferenceMock1.setup(x => x.id).returns(() => ExpectedId);
        var buildDefinitionReferenceMock2: TypeMoq.IMock<buildInterfaces.BuildDefinitionReference>
            = TypeMoq.Mock.ofType<buildInterfaces.BuildDefinitionReference>();
        buildDefinitionReferenceMock2.setup(x => x.id).returns(() => ExpectedId);
        buildApiMock.setup(x => x.getDefinitions(TeamProjectId, DefinitionName))
            .returns(async () => [buildDefinitionReferenceMock1.object, buildDefinitionReferenceMock2.object]);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        assert.rejects(async () => await subject.getBuildDefinitionId(DefinitionName),
            {
                message: `Did not find any build definition with this name: ${DefinitionName}`
            });
    });

    it("returns associated changes when asking for them given a specific build", async () => {
        const BuildId: number = 1337;

        var buildMock: TypeMoq.IMock<buildInterfaces.Build> = setupBuildMock(BuildId);
        var changeMock: TypeMoq.IMock<buildInterfaces.Change> = TypeMoq.Mock.ofType<buildInterfaces.Change>();

        var expectedChanges: buildInterfaces.Change[] = [changeMock.object];

        buildApiMock.setup(x => x.getBuildChanges(TeamProjectId, BuildId))
            .returns(async () => expectedChanges);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        var actualChanges: buildInterfaces.Change[] = await subject.getAssociatedChanges(buildMock.object);

        // assert
        assert.equal(expectedChanges, actualChanges);
    });

    it("returns test runs in correct order", async () => {
        const RunName: string = "Testrun";

        var testRun1: testInterfaces.TestRun = setupTestRunMock(testInterfaces.TestRunState.Completed, RunName).object;
        var testRun2: testInterfaces.TestRun = setupTestRunMock(testInterfaces.TestRunState.Completed, RunName).object;

        testApiMock.setup(x => x.getTestRuns(TeamProjectId)).returns(async () => [testRun1, testRun2]);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        var actualTestRuns: testInterfaces.TestRun[] = await subject.getTestRuns(RunName, 2);

        // assert
        assert.equal(testRun1, actualTestRuns[0]);
        assert.equal(testRun2, actualTestRuns[1]);
    });

    it("returns only specified number of test runs", async () => {
        const RunName: string = "Testrun";

        var testRun1: testInterfaces.TestRun = setupTestRunMock(testInterfaces.TestRunState.Completed, RunName).object;
        var testRun2: testInterfaces.TestRun = setupTestRunMock(testInterfaces.TestRunState.Completed, RunName).object;

        testApiMock.setup(x => x.getTestRuns(TeamProjectId)).returns(async () => [testRun1, testRun2]);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        var actualTestRuns: testInterfaces.TestRun[] = await subject.getTestRuns(RunName, 1);

        // assert
        assert.equal(1, actualTestRuns.length);
    });

    it("skips test runs from different run", async () => {
        const RunName: string = "Testrun";

        var testRun1: testInterfaces.TestRun = setupTestRunMock(testInterfaces.TestRunState.Completed, RunName).object;
        var testRun2: testInterfaces.TestRun = setupTestRunMock(testInterfaces.TestRunState.Completed, "some other run").object;
        var testRun3: testInterfaces.TestRun = setupTestRunMock(testInterfaces.TestRunState.Completed, RunName).object;

        testApiMock.setup(x => x.getTestRuns(TeamProjectId)).returns(async () => [testRun1, testRun2, testRun3]);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        var actualTestRuns: testInterfaces.TestRun[] = await subject.getTestRuns(RunName, 2);

        // assert
        assert.equal(testRun1, actualTestRuns[0]);
        assert.equal(testRun3, actualTestRuns[1]);
    });

    [testInterfaces.TestRunState.Aborted,
    testInterfaces.TestRunState.InProgress,
    testInterfaces.TestRunState.NeedsInvestigation,
    testInterfaces.TestRunState.NotStarted,
    testInterfaces.TestRunState.Unspecified,
    testInterfaces.TestRunState.Waiting]
        .forEach(function (testRunState: testInterfaces.TestRunState): void {
            it("skips incomplete test runs", async () => {
                const RunName: string = "Testrun";

                var testRun1: testInterfaces.TestRun = setupTestRunMock(testInterfaces.TestRunState.Completed, RunName).object;
                var testRun2: testInterfaces.TestRun = setupTestRunMock(testRunState, RunName).object;
                var testRun3: testInterfaces.TestRun = setupTestRunMock(testInterfaces.TestRunState.Completed, RunName).object;

                testApiMock.setup(x => x.getTestRuns(TeamProjectId)).returns(async () => [testRun1, testRun2, testRun3]);

                await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

                // act
                var actualTestRuns: testInterfaces.TestRun[] = await subject.getTestRuns(RunName, 2);

                // assert
                assert.equal(testRun1, actualTestRuns[0]);
                assert.equal(testRun3, actualTestRuns[1]);
            });
        });

    it("skips undefined test runs", async () => {
        const RunName: string = "Testrun";

        var testRun1: testInterfaces.TestRun = setupTestRunMock(testInterfaces.TestRunState.Completed, RunName).object;
        var testRun2: testInterfaces.TestRun = undefined;
        var testRun3: testInterfaces.TestRun = setupTestRunMock(testInterfaces.TestRunState.Completed, RunName).object;

        testApiMock.setup(x => x.getTestRuns(TeamProjectId)).returns(async () => [testRun1, testRun2, testRun3]);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        var actualTestRuns: testInterfaces.TestRun[] = await subject.getTestRuns(RunName, 2);

        // assert
        assert.equal(testRun1, actualTestRuns[0]);
        assert.equal(testRun3, actualTestRuns[1]);
    });

    it("skips downloading if noartifacts were found to download", async () => {
        const BuildId: number = 111;
        var downloadDirectory: string = `C:\\users\\someUser\\Downloads`;

        buildApiMock.setup(x => x.getArtifacts(TeamProjectId, BuildId))
            .returns(async () => []);

        fsStub.withArgs(downloadDirectory).returns(true);

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        await subject.downloadArtifacts(BuildId, downloadDirectory);

        // assert
        assert(consoleLogSpy.calledWith(`Downloading artifacts for Build ${BuildId}`));
        assert(consoleLogSpy.calledWith(`No artifacts found for build ${BuildId} - skipping...`));
        assert(consoleLogSpy.neverCalledWith("Found 0 artifact(s)"));
    });

    it("creates download directory if it doesnt exist yet", async () => {
        const BuildId: number = 111;
        var downloadDirectory: string = `C:\\users\\someUser\\Downloads`;

        buildApiMock.setup(x => x.getArtifacts(TeamProjectId, BuildId))
            .returns(async () => []);

        fsStub.withArgs(downloadDirectory).returns(false);
        var mkDirStub: sinon.SinonSpy = sinon.stub(fs, "mkdirSync");

        await subject.initialize(index.AuthenticationMethodOAuthToken, "", "token", ServerUrl, TeamProjectName, true);

        // act
        await subject.downloadArtifacts(BuildId, downloadDirectory);

        // assert
        assert(consoleLogSpy.calledWith(`Directory ${downloadDirectory} does not exist - will be created`));
        assert(mkDirStub.calledWith(downloadDirectory));
    });

    function setupBuildIdForBuildDefinition(name: string, id: number): void {
        var buildRefMock: TypeMoq.IMock<buildInterfaces.BuildDefinitionReference>
            = TypeMoq.Mock.ofType<buildInterfaces.BuildDefinitionReference>();

        buildRefMock.setup(x => x.id).returns(() => id);

        buildApiMock.setup(x => x.getDefinitions(TeamProjectId, name))
            .returns(async () => [buildRefMock.object]);
    }

    function setupTestRunMock(testRunState: testInterfaces.TestRunState, testRunName: string): TypeMoq.IMock<testInterfaces.TestRun> {
        var testRunMock: TypeMoq.IMock<testInterfaces.TestRun> = TypeMoq.Mock.ofType<testInterfaces.TestRun>();
        testRunMock.setup(x => x.state).returns(() => testRunState.toString());
        testRunMock.setup(x => x.name).returns(() => testRunName);

        return testRunMock;
    }

    function setupBuildMock(buildId: number): TypeMoq.IMock<buildInterfaces.Build> {
        var buildMock: TypeMoq.IMock<buildInterfaces.Build> = TypeMoq.Mock.ofType<buildInterfaces.Build>();
        buildMock.setup((x: any) => x.then).returns(() => undefined);
        buildMock.setup(x => x.id).returns(() => buildId);

        buildApiMock.setup(x => x.getBuild(TeamProjectId, buildId)).returns(async () => buildMock.object);

        return buildMock;
    }
});