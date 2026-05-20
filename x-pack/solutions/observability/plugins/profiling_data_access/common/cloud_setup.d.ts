import type { RecursivePartial } from '@elastic/eui';
import type { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import type { ProfilingSetupOptions, SetupState } from './setup';
export interface ProfilingCloudSetupOptions extends ProfilingSetupOptions {
    packagePolicyClient: PackagePolicyClient;
    isCloudEnabled: boolean;
}
export interface CloudSetupStateType {
    type: 'cloud';
    setupState: CloudSetupState;
}
export interface CloudSetupState extends SetupState {
    cloud: {
        available: boolean;
        required: boolean;
    };
    policies: {
        collector: {
            installed: boolean;
        };
        symbolizer: {
            installed: boolean;
        };
        apm: {
            profilingEnabled: boolean;
        };
    };
}
export type PartialCloudSetupState = RecursivePartial<CloudSetupState>;
export declare function createDefaultCloudSetupState(): CloudSetupState;
export declare function areCloudResourcesSetup(state: CloudSetupState): boolean;
