import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataViewBase, EsQueryConfig } from '@kbn/es-query';
import type { Logger } from '@kbn/logging';
import type { CustomMetricExpressionParams, SearchConfigurationType } from '../../../../../common/custom_threshold_rule/types';
import type { BucketKey } from './get_data';
export interface MissingGroupsRecord {
    key: string;
    bucketKey: BucketKey;
}
export declare const checkMissingGroups: (esClient: ElasticsearchClient, metricParams: CustomMetricExpressionParams, indexPattern: string, timeFieldName: string, groupBy: string | undefined | string[], searchConfiguration: SearchConfigurationType, dataView: DataViewBase | undefined, logger: Logger, timeframe: {
    start: number;
    end: number;
}, esQueryConfig: EsQueryConfig, missingGroups?: MissingGroupsRecord[], runtimeMappings?: estypes.MappingRuntimeFields) => Promise<MissingGroupsRecord[]>;
