import type { PhraseFilter, ExistsFilter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { PersistableFilter } from '@kbn/lens-plugin/common';
import type { ReportViewType, UrlFilter } from '../types';
import type { AllSeries } from '../hooks/use_series_storage';
export declare function createExploratoryViewRoutePath({ reportType, allSeries, }: {
    reportType: ReportViewType;
    allSeries: AllSeries;
}): string;
export declare function buildPhraseFilter(field: string, value: string, dataView?: DataView): (PhraseFilter | import("@kbn/es-query").ScriptedPhraseFilter)[];
export declare function getQueryFilter(field: string, value: string[], dataView?: DataView): {
    query: (Record<string, any> & {
        query_string?: {
            query: string;
            fields?: string[];
        };
    }) | undefined;
    meta: {
        alias: string | null;
        disabled?: boolean;
        negate?: boolean;
        controlledBy?: string;
        group?: string;
        index: string;
        isMultiIndex?: boolean;
        type?: string;
        key?: string;
        params?: import("@kbn/es-query/src/filters/build_filters").FilterMetaParams;
        value?: string | import("@kbn/es-query").RangeFilterParams | import("@kbn/es-query/src/filters/build_filters").PhraseFilterValue[];
    };
}[];
export declare function buildPhrasesFilter(field: string, value: Array<string | number>, dataView?: DataView): (PhraseFilter | import("@kbn/es-query").ScriptedPhraseFilter)[] | import("@kbn/es-query").PhrasesFilter[];
export declare function buildExistsFilter(field: string, dataView?: DataView): ExistsFilter[];
type FiltersType = Array<PersistableFilter | ExistsFilter | PhraseFilter>;
export declare function urlFilterToPersistedFilter({ urlFilters, initFilters, dataView, }: {
    urlFilters: UrlFilter[];
    initFilters?: FiltersType;
    dataView: DataView;
}): FiltersType;
export {};
