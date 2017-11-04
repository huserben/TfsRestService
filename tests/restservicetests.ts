import * as WebRequest from "web-request";
import assert = require("assert");

import * as index from "../index";

describe("TFS Rest Service Tests", () => {
    let subject: index.ITfsRestService;

    beforeEach(() => {
        subject = new index.TfsRestService();
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
});