import * as WebRequest from "web-request";
import assert = require("assert");
import * as fs from "fs";
import * as url from "url";
import * as TypeMoq from "typemoq";
import sinon = require("sinon");

import * as index from "../index";

describe("TFS Rest Service Tests", () => {
    //let webRequestMock: sinon.SinonMock;
    let subject: index.ITfsRestService;
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        //webRequestMock = sinon.mock(WebRequest);
        sandbox = sinon.sandbox.create();
        subject = new index.TfsRestService();
    });

    afterEach(() => {
        //webRequestMock.restore();
        sandbox.restore();
    });

    it("sets default options when initializing", () => {
        const ServerUrl: string = "https://www.myTfsServer.com:8080";
        const IgnoreSslError: boolean = true;
        const ExpectedEncoding: string = "utf-8";

        var expectedServerUrl: string = `${ServerUrl}/${index.ApiUrl}/`;
        var expectedContentTypeHeader: WebRequest.Headers = {
            "Content-Type": "application/json"
        };

        subject.initialize(index.AuthenticationMethodBasicAuthentication, "user", "pw", ServerUrl, IgnoreSslError);

        var requestOptions: WebRequest.RequestOptions = (subject as any).options;

        assert.equal(JSON.stringify(expectedContentTypeHeader), JSON.stringify(requestOptions.headers));
        assert.equal(expectedServerUrl, requestOptions.baseUrl);
        assert.equal(!IgnoreSslError, requestOptions.agentOptions.rejectUnauthorized);
        assert.equal(ExpectedEncoding, requestOptions.encoding);
    });

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
    });

    /*it("returns correct id when getting id for build definition name", async () => {
        const BuildDefinitionName: string = "MyBuild";
        const ExptecedID: string = "12";
        var expectedRequest: string = `build/definitions?api-version=2.0&name=${encodeURIComponent(BuildDefinitionName)}`;

        var buildMock: TypeMoq.IMock<index.IBuild> = TypeMoq.Mock.ofType<index.IBuild>();
        buildMock.setup(b => b.id).returns(() => ExptecedID);
        setupTfsResponse([buildMock.object]);

        var webRequestMock: sinon.SinonMock = sandbox.mock(WebRequest);
        webRequestMock.expects("json").withArgs(expectedRequest, undefined).returns(buildMock.object);

        var actualID: string = await subject.getBuildDefinitionId(BuildDefinitionName);

        webRequestMock.verify();
        assert.equal(actualID, ExptecedID);
    });

    it("was build succesful returns false if last build was not successful", async () => {
        const BuildID: string = "123";

        var buildMock: TypeMoq.IMock<index.IBuild> = TypeMoq.Mock.ofType<index.IBuild>();
        buildMock.setup(b => b.result).returns(() => "Failed");

        var webRequestMock: sinon.SinonMock = sandbox.mock(WebRequest);
        webRequestMock.expects("json").withArgs(`build/builds/${BuildID}?api-version=2.0`, undefined)
            .returns(async () => buildMock.object);

        var wasSuccesful: boolean = await subject.wasBuildSuccessful(BuildID);

        webRequestMock.verify();
        assert(!wasSuccesful);
    });

    it("was build succesful returns true if last build was successful", async () => {
        const BuildID: string = "123";

        var buildMock: TypeMoq.IMock<index.IBuild> = TypeMoq.Mock.ofType<index.IBuild>();
        buildMock.setup(b => b.result).returns(() => index.BuildResultSucceeded);

        var webRequestMock: sinon.SinonStub = sandbox.stub(WebRequest, "json");
        webRequestMock.invokeCallback(() => {
            var x = 123;
        });
        webRequestMock//.expects("json").withArgs(`build/builds/${BuildID}?api-version=2.0`, undefined)
           .resolves(() => buildMock.object);

        var wasSuccesful: boolean = await subject.wasBuildSuccessful(BuildID);

        //webRequestMock.verify();
        assert(wasSuccesful);
    });

    function setupTfsResponse<T>(value: T[]): void {
        var getResponseMock: TypeMoq.IMock<index.ITfsGetResponse<T>> = TypeMoq.Mock.ofType<index.ITfsGetResponse<T>>();
        getResponseMock.setup(b => b.count).returns(() => value.length);
        getResponseMock.setup(b => b.value).returns(() => value);

        //webRequestMock.returns(async () => getResponseMock.object);
    }*/
});