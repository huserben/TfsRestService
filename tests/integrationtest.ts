import * as index from "../index";

describe.skip("Testing newly implemented functionality", () => {
    const PAT: string = "sww3otrtvfaqi4sqcqqjceq23lxgvlyjfoftqox7272qc3vxyi2q";
    const tfsServer: string = "https://benjsawesometfstest.visualstudio.com/DefaultCollection/TfsExtensions";

    it("get latest failed build and associated changes", async() => {
        var tfsRestService: index.ITfsRestService = new index.TfsRestService();
        tfsRestService.initialize(index.AuthenticationMethodPersonalAccessToken, "", PAT, tfsServer, false);

        var builds: index.IBuild[] = await tfsRestService.getBuildsByStatus("TFS Rest Service CI", "");
        var build: index.IBuild = builds[0];

        var associatedChanges: index.IChange[] = await tfsRestService.getAssociatedChanges(build);

        console.log(associatedChanges[0].author.displayName);
    });

});