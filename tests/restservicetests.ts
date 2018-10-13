import * as TypeMoq from "typemoq";

import * as vsts from "azure-devops-node-api";
import * as index from "../index";
import { IBuildApi } from "azure-devops-node-api/BuildApi";
import { ITestApi } from "azure-devops-node-api/TestApi";
import { ITaskAgentApi } from "azure-devops-node-api/TaskAgentApi";
import { ICoreApi } from "azure-devops-node-api/CoreApi";
import { TeamProjectReference } from "azure-devops-node-api/interfaces/CoreInterfaces";
import { IRequestHandler, IRequestOptions } from "azure-devops-node-api/interfaces/common/VsoBaseInterfaces";


describe("TFS Rest Service Tests", () => {
    let subject: index.ITfsRestService;
    let buildApiMock: TypeMoq.IMock<IBuildApi>;
    let testApiMock: TypeMoq.IMock<ITestApi>;
    let taskAgentApiMock: TypeMoq.IMock<ITaskAgentApi>;
    let coreApiMock: TypeMoq.IMock<ICoreApi>;

    beforeEach(() => {
        buildApiMock = TypeMoq.Mock.ofType<IBuildApi>();
        testApiMock = TypeMoq.Mock.ofType<ITestApi>();
        taskAgentApiMock = TypeMoq.Mock.ofType<ITaskAgentApi>();
        coreApiMock = TypeMoq.Mock.ofType<ICoreApi>();

        var webApiMock : TypeMoq.IMock<vsts.WebApi> = TypeMoq.Mock.ofType<vsts.WebApi>();

        var teamProjectMock : TypeMoq.IMock<TeamProjectReference> = TypeMoq.Mock.ofType<TeamProjectReference>();
        teamProjectMock.setup(prj => prj.name).returns(() => "TeamProject");
        coreApiMock.setup(api => api.getProjects(TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny()))
        .returns(async () => [teamProjectMock.object]);

        /*sinon.stub(vsts.WebApi.prototype, "getBuildApi").resolves(async () => buildApiMock.object);
        sinon.stub(vsts.WebApi.prototype, "getTestApi").resolves(async () => testApiMock.object);
        sinon.stub(vsts.WebApi.prototype, "getTaskAgentApi").resolves(async () => taskAgentApiMock.object);
        sinon.stub(vsts.WebApi.prototype, "getCoreApi").resolves(async () => coreApiMock.object);*/
        webApiMock.setup(webApi => webApi.getBuildApi(null, null)).returns(async () => buildApiMock.object);
        webApiMock.setup(webApi => webApi.getTestApi(null, null)).returns(async () => testApiMock.object);
        webApiMock.setup(webApi => webApi.getTaskAgentApi(null, null)).returns(async () => taskAgentApiMock.object);
        webApiMock.setup(webApi => webApi.getCoreApi(TypeMoq.It.isAny(), TypeMoq.It.isAny())).returns(async () => coreApiMock.object);

        subject = new index.TfsRestService((server: string, authHandler: IRequestHandler, options: IRequestOptions) => webApiMock.object);
    });

    it("sets default options when initializing", async () => {
        const ServerUrl: string = "https://www.myTfsServer.com:8080";
        const IgnoreSslError: boolean = true;
        const ExpectedTeamProject: string = "TeamProject";

        await subject.initialize(
            index.AuthenticationMethodBasicAuthentication, "user", "pw", ServerUrl, ExpectedTeamProject, IgnoreSslError);

        taskAgentApiMock.verify(api => api.getAgentQueue(12), TypeMoq.Times.never());
    });
    /*
        it("sets authentication options correct when using OAuth", () => {
            const OAuthToken: string = "dsflk12903dfslkaj09123";
    
            subject.initialize(index.AuthenticationMethodOAuthToken, "", OAuthToken, "https://server.com", false);
    
            var requestOptions: WebRequest.RequestOptions = (subject as any).options;
            assert.equal(requestOptions.auth.bearer, OAuthToken);
            assert.equal(requestOptions.auth.user, undefined);
            assert.equal(requestOptions.auth.password, undefined);
        });
    
        it("sets authentication options correct when using Personal Access Token", () => {
            const PAT: string = "123dsf243dfskhjdfslkj";
    
            subject.initialize(index.AuthenticationMethodPersonalAccessToken, "", PAT, "https://server.com", false);
    
            var requestOptions: WebRequest.RequestOptions = (subject as any).options;
            assert.equal(requestOptions.auth.password, PAT);
            assert.equal(requestOptions.auth.bearer, undefined);
        });
    
        it("sets authentication options correct when using Basic Authentication", () => {
            const Username: string = "John";
            const Password: string = "P4s5W0rd";
    
            subject.initialize(index.AuthenticationMethodBasicAuthentication, Username, Password, "https://server.com", false);
    
            var requestOptions: WebRequest.RequestOptions = (subject as any).options;
            assert.equal(requestOptions.auth.user, Username);
            assert.equal(requestOptions.auth.password, Password);
            assert.equal(requestOptions.auth.bearer, undefined);
        });
    
        it("throws error if not supported authentication method is specified", () => {
            assert.throws(() => subject.initialize("someFancyOtherMethod", "", "", "", false), Error);
        });*/
});