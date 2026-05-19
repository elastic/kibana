import type { SavedObjectsClientContract, SavedObjectsServiceSetup } from '@kbn/core/server';
import type { DynamicSettingsAttributes } from '../../../runtime_types/settings';
import type { UMSavedObjectsQueryFn } from '../adapters';
import type { UptimeConfig } from '../../../../common/config';
export declare const registerUptimeSavedObjects: (savedObjectsService: SavedObjectsServiceSetup) => void;
export interface UMSavedObjectsAdapter {
    config: UptimeConfig | null;
    getUptimeDynamicSettings: UMSavedObjectsQueryFn<DynamicSettingsAttributes>;
    setUptimeDynamicSettings: (client: SavedObjectsClientContract, attr: DynamicSettingsAttributes) => Promise<DynamicSettingsAttributes>;
}
export declare const savedObjectsAdapter: UMSavedObjectsAdapter;
