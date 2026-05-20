import type { IScopedClusterClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { ProfilingStatus } from '@kbn/profiling-utils';
import type { RegisterServicesParams } from '../register_services';
export interface HasSetupParams {
    soClient: SavedObjectsClientContract;
    esClient: IScopedClusterClient;
    spaceId?: string;
    isServerless?: boolean;
}
export declare function createGetStatusService(params: RegisterServicesParams): ({ esClient, soClient, spaceId, isServerless, }: HasSetupParams) => Promise<ProfilingStatus>;
