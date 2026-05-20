import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { PartialCloudSetupState, ProfilingCloudSetupOptions } from './cloud_setup';
export declare const COLLECTOR_PACKAGE_POLICY_NAME = "elastic-universal-profiling-collector";
export declare const SYMBOLIZER_PACKAGE_POLICY_NAME = "elastic-universal-profiling-symbolizer";
export declare function getCollectorPolicy({ soClient, packagePolicyClient, }: {
    packagePolicyClient: PackagePolicyClient;
    soClient: SavedObjectsClientContract;
}): Promise<PackagePolicy | undefined>;
export declare function validateCollectorPackagePolicy({ soClient, packagePolicyClient, }: ProfilingCloudSetupOptions): Promise<PartialCloudSetupState>;
export declare function generateSecretToken(): string;
export declare function getSymbolizerPolicy({ soClient, packagePolicyClient, }: {
    packagePolicyClient: PackagePolicyClient;
    soClient: SavedObjectsClientContract;
}): Promise<PackagePolicy | undefined>;
export declare function validateSymbolizerPackagePolicy({ soClient, packagePolicyClient, }: ProfilingCloudSetupOptions): Promise<PartialCloudSetupState>;
export declare function validateProfilingInApmPackagePolicy({ soClient, packagePolicyClient, }: ProfilingCloudSetupOptions): Promise<PartialCloudSetupState>;
