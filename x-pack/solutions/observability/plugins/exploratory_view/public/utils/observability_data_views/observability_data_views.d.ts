import type { FieldFormat as IFieldFormat } from '@kbn/field-formats-plugin/common';
import type { DataViewsPublicPluginStart, DataView } from '@kbn/data-views-plugin/public';
import type { AppDataType, FieldFormatParams } from '../../components/shared/exploratory_view/types';
export declare const dataViewList: Record<AppDataType, string>;
export declare function getDataTypeIndices(dataType: AppDataType): Promise<{
    hasData: boolean;
    indices: string | undefined;
}>;
export declare function isParamsSame(param1: IFieldFormat['_params'], param2?: FieldFormatParams): boolean;
export declare class ObservabilityDataViews {
    dataViews: DataViewsPublicPluginStart;
    adHocDataViews: boolean;
    constructor(dataViews: DataViewsPublicPluginStart, adHocDataViews?: boolean);
    createDataView(app: AppDataType, indices: string): Promise<DataView | undefined>;
    createAndSavedDataView(app: AppDataType, indices: string): Promise<DataView>;
    validateFieldFormats(app: AppDataType, dataView: DataView): Promise<void>;
    getFieldFormats(app: AppDataType): Record<string, import("@kbn/field-formats-plugin/common").SerializedFieldFormat>;
    getDataView(app: AppDataType, indices?: string): Promise<DataView | undefined>;
}
export default ObservabilityDataViews;
