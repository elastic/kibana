import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PackagePolicyClient } from '@kbn/fleet-plugin/server';
export declare const ELASTIC_CLOUD_APM_POLICY = "elastic-cloud-apm";
export declare function getApmPolicy({ packagePolicyClient, soClient, }: {
    packagePolicyClient: PackagePolicyClient;
    soClient: SavedObjectsClientContract;
}): Promise<import("@kbn/fleet-plugin/common").PackagePolicy | null>;
