import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { AppDataType } from '../../components/shared/exploratory_view/types';
declare const getAppDataView: (data: DataViewsPublicPluginStart) => (appId: AppDataType, indexPattern?: string) => Promise<import("@kbn/data-views-plugin/public").DataView | null | undefined>;
export default getAppDataView;
