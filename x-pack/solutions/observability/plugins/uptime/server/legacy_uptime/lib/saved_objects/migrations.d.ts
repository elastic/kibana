import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { DynamicSettingsAttributes } from '../../../runtime_types/settings';
export declare const add820Indices: SavedObjectMigrationFn<DynamicSettingsAttributes, DynamicSettingsAttributes>;
export declare const remove890Indices: SavedObjectMigrationFn<DynamicSettingsAttributes, DynamicSettingsAttributes>;
