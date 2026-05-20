import type { RecursivePartial } from '@elastic/eui';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ProfilingESClient } from './profiling_es_client';
export interface ProfilingSetupOptions {
    client: ProfilingESClient;
    clientWithProfilingAuth: ProfilingESClient;
    soClient: SavedObjectsClientContract;
    logger: Logger;
    spaceId: string;
}
export interface SetupStateType {
    type: 'self-managed';
    setupState: SetupState;
}
export interface SetupState {
    data: {
        available: boolean;
    };
    resource_management: {
        enabled: boolean;
    };
    resources: {
        created: boolean;
        pre_8_9_1_data: boolean;
    };
    settings: {
        configured: boolean;
    };
    profiling: {
        enabled: boolean;
    };
}
export type PartialSetupState = RecursivePartial<SetupState>;
export declare function createDefaultSetupState(): SetupState;
export declare function areResourcesSetup(state: SetupState): boolean;
export declare function mergePartialSetupStates<T extends SetupState>(base: T, partials: Array<RecursivePartial<T>>): T;
