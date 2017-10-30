import * as WebRequest from "web-request";
export declare const TeamFoundationCollectionUri: string;
export declare const TeamProject: string;
export declare const RequestedForUsername: string;
export declare const RequestedForUserId: string;
export declare const SourceVersion: string;
export declare const SourceBranch: string;
export declare const CurrentBuildDefinition: string;
export declare const OAuthAccessToken: string;
export declare const RepositoryType: string;
export declare const TfsRepositoryType: string;
export declare const ApiUrl: string;
export declare const AuthenticationMethodOAuthToken: string;
export declare const AuthenticationMethodBasicAuthentication: string;
export declare const AuthenticationMethodPersonalAccessToken: string;
export declare const BuildStateNotStarted: string;
export declare const BuildStateInProgress: string;
export declare const BuildStateCompleted: string;
export declare const BuildResultSucceeded: string;
export declare const TestRunStateCompleted: string;
export declare const TestRunOutcomePassed: string;
export interface IBuild {
    name: string;
    id: string;
    result: string;
    status: string;
}
export interface ITfsRestService {
    initialize(authenticationMethod: string, username: string, password: string, tfsServer: string, ignoreSslError: boolean): void;
    getBuildsByStatus(buildDefinitionName: string, statusFilter: string): Promise<IBuild[]>;
    triggerBuild(buildDefinitionName: string, branch: string, requestedFor: string, sourceVersion: string, demands: string[], queueId: number, buildParameters: string): Promise<string>;
    downloadArtifacts(buildId: string, downloadDirectory: string): Promise<void>;
    getQueueIdByName(buildQueue: string): Promise<number>;
    areBuildsFinished(triggeredBuilds: string[], failIfNotSuccessful: boolean): Promise<boolean>;
    isBuildFinished(buildId: string): Promise<boolean>;
    wasBuildSuccessful(buildId: string): Promise<boolean>;
    getBuildDefinitionId(buildDefinitionName: string): Promise<string>;
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
export declare class TfsRestService implements ITfsRestService {
    options: WebRequest.RequestOptions;
    initialize(authenticationMethod: string, username: string, password: string, tfsServer: string, ignoreSslError: boolean): void;
    getBuildsByStatus(buildDefinitionName: string, statusFilter: string): Promise<IBuild[]>;
    triggerBuild(buildDefinitionName: string, branch: string, requestedForUserID: string, sourceVersion: string, demands: string[], queueId: number, buildParameters: string): Promise<string>;
    areBuildsFinished(triggeredBuilds: string[], failIfNotSuccessful: boolean): Promise<boolean>;
    downloadArtifacts(buildId: string, downloadDirectory: string): Promise<void>;
    getTestRuns(testRunName: string, numberOfRunsToFetch: number): Promise<ITestRun[]>;
    getTestResults(testRun: ITestRun): Promise<ITestResult[]>;
    getQueueIdByName(buildQueue: string): Promise<number>;
    isBuildFinished(buildId: string): Promise<boolean>;
    wasBuildSuccessful(buildId: string): Promise<boolean>;
    getBuildDefinitionId(buildDefinitionName: string): Promise<string>;
    private handleValidationError(resultAsJson);
    private throwIfAuthenticationError<T>(result);
}
