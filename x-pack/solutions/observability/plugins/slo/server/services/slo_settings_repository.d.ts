import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { SLOSettings } from '../domain/models';
export interface SLOSettingsRepository {
    get(): Promise<SLOSettings>;
    save(settings: SLOSettings): Promise<SLOSettings>;
}
export declare const DEFAULT_SETTINGS: SLOSettings;
export declare class DefaultSLOSettingsRepository implements SLOSettingsRepository {
    private soClient;
    constructor(soClient: SavedObjectsClientContract);
    get(): Promise<SLOSettings>;
    save(settings: SLOSettings): Promise<SLOSettings>;
    private toSloSettings;
    private toStoredSloSettings;
}
