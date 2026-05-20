import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataViewBase, EsQueryConfig } from '@kbn/es-query';
import type { Logger } from '@kbn/logging';
import type { CustomMetricExpressionParams, SearchConfigurationType } from '../../../../../common/custom_threshold_rule/types';
import type { AdditionalContext } from '../utils';
export type GetDataResponse = Record<string, {
    trigger: boolean;
    value: number | null;
    bucketKey: BucketKey;
    flattenGrouping?: Record<string, string>;
} & AdditionalContext>;
export type BucketKey = Record<string, string>;
export declare const getData: (esClient: ElasticsearchClient, params: CustomMetricExpressionParams, index: string, timeFieldName: string, groupBy: string | undefined | string[], searchConfiguration: SearchConfigurationType, dataView: DataViewBase | undefined, esQueryConfig: EsQueryConfig, compositeSize: number, alertOnGroupDisappear: boolean, timeframe: {
    start: number;
    end: number;
}, logger: Logger, runtimeMappings?: estypes.MappingRuntimeFields, lastPeriodEnd?: number, previousResults?: GetDataResponse, afterKey?: Record<string, string>) => Promise<GetDataResponse>;
