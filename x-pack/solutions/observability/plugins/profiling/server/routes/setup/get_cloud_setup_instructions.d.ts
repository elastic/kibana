import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PackagePolicyClient } from '@kbn/fleet-plugin/server';
export interface SetupDataCollectionInstructions {
    collector: {
        secretToken?: string;
        host?: string;
    };
    symbolizer: {
        host?: string;
    };
    profilerAgent: {
        version: string;
    };
    stackVersion: string;
}
export declare function getCloudSetupInstructions({ packagePolicyClient, soClient, apmServerHost, stackVersion, }: {
    packagePolicyClient: PackagePolicyClient;
    soClient: SavedObjectsClientContract;
    apmServerHost?: string;
    stackVersion: string;
}): Promise<SetupDataCollectionInstructions>;
