import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
export declare const SO_SLO_SETTINGS_TYPE = "slo-settings";
export declare const sloSettingsObjectId: (space?: string) => string;
export declare const sloSettings: SavedObjectsType;
