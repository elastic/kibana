import type { IScopedClusterClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { CloudSetupStateType } from '../../../common/cloud_setup';
import type { SetupStateType } from '../../../common/setup';
import type { RegisterServicesParams } from '../register_services';
import type { ServerlessSetupStateType } from '../../../common/serverless_setup';
export interface SetupStateParams {
    soClient: SavedObjectsClientContract;
    esClient: IScopedClusterClient;
    spaceId?: string;
    isServerless?: boolean;
}
export declare function getSetupState({ createProfilingEsClient, deps, esClient, logger, soClient, spaceId, isServerless, }: RegisterServicesParams & SetupStateParams): Promise<CloudSetupStateType | SetupStateType | ServerlessSetupStateType>;
export declare function createSetupState(params: RegisterServicesParams): ({ esClient, soClient, spaceId }: SetupStateParams) => Promise<SetupStateType | CloudSetupStateType | ServerlessSetupStateType>;
