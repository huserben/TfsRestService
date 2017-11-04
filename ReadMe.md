# TFS Rest Service

Simple service that abstracts calls to the TFS REST API and provides back data objects to be used in TypeScript/JavaScript.

Used as part of the Build Tasks for Triggering another build in TFS (see https://marketplace.visualstudio.com/items?itemName=benjhuser.tfs-extensions-build-tasks).  

## Usage
Usage is simple, import the package:  
`import tfsRestService = require("tfsrestservice");`  

Then you can create a new instance of the service by newing it:  
`var service: tfsRestService.ITfsRestService = new tfsRestService.TfsRestService()`  

Before you make any calls to the TFS/VSTS you have to initialize the service by specifying the server you want to query and define how to authenticate:  
`initialize(authenticationMethod: string, username: string, password: string, tfsServer: string, ignoreSslError: boolean): void;`  

The 3 different types of authentication that are supported are the following:  
- OAuth (need to supply the token in the 'password' field)  
- Personal Access token (need to supply the PAT in the 'password' field)  
- Basic Authentication (username and password must be specified)

The different keys for the authentication can be found as a constant - they all start with "AuthenticationMethod".

The supplied TfsServer must be the URL including the collection and the Team Project:  
`https://MyTfsServer.com:8080/DefaultCollection/MyProject`

## Interface
Except from the initialize method following methods are currently offered:

### triggerBuild(buildDefinitionName: string, branch: string, requestedForUserID: string, sourceVersion: string, demands: string[], queueId: number, buildParameters: string): Promise<string\>
This will try to trigger a new build for the build definition that was specified.  
The build definition name is the only mandatory parameter - if not specified it will fail. The others are optional and "" can be passed if they should be skipped.  
- *branch*: The branch for which the build shall be triggered  
- *requestedForUserID*: The ID of the user for which the build is requested.    
-  *sourceVersion*: The source version that should be used for the triggered build (e.g. shelveset or label). If not specified the latest version will be used.  
-  *demands*: Demands that shall be fulfilled by the agent that runs the build.    
-  *queueId*: The id of the agent queue to be used. If not specified, the default queue will be used.  
-  *buildParameters*: Parameters of that should be passed to the build - e.g. BuildConfiguration etc.

### getBuildsByStatus(buildDefinitionName: string, statusFilter: string): Promise<IBuild[]>
Will get all builds from a given build definition and that applie to the specified status filter. If the status filter is empty it will return all found builds. The status filter can as well contain multiple comma separated entries. Following states are predefined:  
- BuildStateNotStarted  
- BuildStateInProgress  
- BuildStateCompleted  
- BuildResultSucceeded

### downloadArtifacts(buildId: string, downloadDirectory: string): void
This method will download the artifacts of the build with the specified id to the directory passed. The artifacts are downloaded as a zip.

### areBuildsFinished(triggeredBuilds: string[], failIfNotSuccessful: boolean): Promise<boolean\>
Will check if **all** of the specified builds are finished. If one is not yet finished, this will return false.  
The builds must be specified with their ids.  
If *failIfNotSuccessful* parameter is set to true, an error will be thrown if a build finished but did not succeed.

### isBuildFinished(buildId: string): Promise<boolean\>
Will check if a single build is finished or not.

### wasBuildSuccessful(buildId: string): Promise<boolean\>
Checks whether the specified build was successful or not.

### getAssociatedChanges(build: IBuild): Promise<IChange[]\>
Returns the associated changes of the specified build.

### getBuildDefinitionId(buildDefinitionName: string): Promise<string\>
Gets the id of the build definition which is specified by name as a parameter.

### getQueueIdByName(buildQueue: string): Promise<number\>
Will try to get a Queue ID by a specified name. This is useful if you want to trigger a build on a specific Agent Queue.

### getTestRuns(testRunName: string, numberOfRunsToFetch: number): Promise<ITestRun[]\>
Will get a list of all Test Runs which match the specified name. Will only get the specified number of runs, sorted by newest to oldest.  

### getTestResults(testRun: ITestRun): Promise<ITestResult[]\>  
Gets the Tests that were run as part of the specified test run.