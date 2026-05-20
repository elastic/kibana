import { UI_SETTINGS } from '@kbn/data-plugin/public';
export { UI_SETTINGS };
type SettingKeys = keyof typeof UI_SETTINGS;
type SettingValues = (typeof UI_SETTINGS)[SettingKeys];
export declare function useKibanaUISettings<T>(key: SettingValues): T;
