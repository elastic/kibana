import type { DataViewBase, EsQueryConfig, Filter, Query, TimeRange } from '@kbn/es-query';
interface BuildEsQueryArgs {
    timeRange?: TimeRange;
    kuery?: string;
    config?: EsQueryConfig;
    queries?: Query[];
    filters?: Filter[];
    indexPattern?: DataViewBase;
}
export declare function buildEsQuery({ timeRange, kuery, config, queries, filters, indexPattern, }: BuildEsQueryArgs): {
    bool: import("@kbn/es-query").BoolQuery;
};
export {};
