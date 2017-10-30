"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var assert = require("assert");
var sinon = require("sinon");
var index = require("../index");
describe("TFS Rest Service Tests", function () {
    var subject;
    var sandbox;
    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        subject = new index.TfsRestService();
    });
    afterEach(function () {
        sandbox.restore();
    });
    it("sets default options when initializing", function () {
        var ServerUrl = "https://www.myTfsServer.com:8080";
        var IgnoreSslError = true;
        var ExpectedEncoding = "utf-8";
        var expectedServerUrl = ServerUrl + "/" + index.ApiUrl + "/";
        var expectedContentTypeHeader = {
            "Content-Type": "application/json"
        };
        subject.initialize(index.AuthenticationMethodBasicAuthentication, "user", "pw", ServerUrl, IgnoreSslError);
        var requestOptions = subject.options;
        assert.equal(JSON.stringify(expectedContentTypeHeader), JSON.stringify(requestOptions.headers));
        assert.equal(expectedServerUrl, requestOptions.baseUrl);
        assert.equal(!IgnoreSslError, requestOptions.agentOptions.rejectUnauthorized);
        assert.equal(ExpectedEncoding, requestOptions.encoding);
    });
    it("sets authentication options correct when using OAuth", function () {
        var OAuthToken = "dsflk12903dfslkaj09123";
        subject.initialize(index.AuthenticationMethodOAuthToken, "", OAuthToken, "https://server.com", false);
        var requestOptions = subject.options;
        assert.equal(requestOptions.auth.bearer, OAuthToken);
        assert.equal(requestOptions.auth.user, undefined);
        assert.equal(requestOptions.auth.password, undefined);
    });
    it("sets authentication options correct when using Personal Access Token", function () {
        var PAT = "123dsf243dfskhjdfslkj";
        subject.initialize(index.AuthenticationMethodPersonalAccessToken, "", PAT, "https://server.com", false);
        var requestOptions = subject.options;
        assert.equal(requestOptions.auth.password, PAT);
        assert.equal(requestOptions.auth.bearer, undefined);
    });
    it("sets authentication options correct when using Basic Authentication", function () {
        var Username = "John";
        var Password = "P4s5W0rd";
        subject.initialize(index.AuthenticationMethodBasicAuthentication, Username, Password, "https://server.com", false);
        var requestOptions = subject.options;
        assert.equal(requestOptions.auth.user, Username);
        assert.equal(requestOptions.auth.password, Password);
        assert.equal(requestOptions.auth.bearer, undefined);
    });
    it("throws error if not supported authentication method is specified", function () {
        assert.throws(function () { return subject.initialize("someFancyOtherMethod", "", "", "", false); }, Error);
    });
});
