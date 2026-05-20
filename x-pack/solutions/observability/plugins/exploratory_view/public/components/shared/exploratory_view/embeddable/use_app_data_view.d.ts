import type { DataView } from '@kbn/data-views-plugin/common';
import type { ExploratoryEmbeddableProps, ExploratoryViewPublicPluginsStart } from '../../../..';
import type { DataViewState } from '../hooks/use_app_data_view';
import type { AppDataType } from '../types';
import type { SeriesUrl } from '../../../..';
export declare const useAppDataView: ({ series, dataViewCache, seriesDataType, dataViewsService, dataTypesIndexPatterns, }: {
    series: SeriesUrl;
    seriesDataType: AppDataType;
    dataViewCache: Record<string, DataView>;
    dataViewsService: ExploratoryViewPublicPluginsStart["dataViews"];
    dataTypesIndexPatterns: ExploratoryEmbeddableProps["dataTypesIndexPatterns"];
}) => {
    dataViews: DataViewState;
    loading: false | undefined;
};
