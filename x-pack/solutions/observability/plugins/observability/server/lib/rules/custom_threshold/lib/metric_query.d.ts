import type { estypes } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { DataViewBase, EsQueryConfig } from '@kbn/es-query';
import type { CustomMetricExpressionParams, SearchConfigurationType } from '../../../../../common/custom_threshold_rule/types';
export declare const calculateCurrentTimeFrame: (metricParams: CustomMetricExpressionParams, timeframe: {
    start: number;
    end: number;
}) => {
    start: number;
    end: number;
};
export declare const createBoolQuery: (timeframe: {
    start: number;
    end: number;
}, timeFieldName: string, searchConfiguration: SearchConfigurationType, dataView: DataViewBase | undefined, esQueryConfig: EsQueryConfig, additionalQueries?: QueryDslQueryContainer[]) => {
    bool: import("@kbn/es-query").BoolQuery;
};
export declare const getElasticsearchMetricQuery: (metricParams: CustomMetricExpressionParams, timeframe: {
    start: number;
    end: number;
}, timeFieldName: string, compositeSize: number, alertOnGroupDisappear: boolean, searchConfiguration: SearchConfigurationType, dataView: DataViewBase | undefined, esQueryConfig: EsQueryConfig, runtimeMappings?: estypes.MappingRuntimeFields, lastPeriodEnd?: number, groupBy?: string | string[], afterKey?: Record<string, string>, fieldsExisted?: Record<string, boolean> | null) => {
    size: number;
    aggs: any;
    runtime_mappings?: estypes.MappingRuntimeFields | undefined;
    track_total_hits: boolean;
    query: {
        bool: import("@kbn/es-query").BoolQuery;
    };
};
