import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataViewBase, EsQueryConfig } from '@kbn/es-query';
import type { Logger } from '@kbn/logging';
import type { CustomMetricExpressionParams, SearchConfigurationType } from '../../../../../common/custom_threshold_rule/types';
import type { AdditionalContext } from '../utils';
import type { MissingGroupsRecord } from './check_missing_group';
export interface EvaluatedRuleParams {
    criteria: CustomMetricExpressionParams[];
    groupBy: string | undefined | string[];
    searchConfiguration: SearchConfigurationType;
}
export type Evaluation = CustomMetricExpressionParams & {
    currentValue: number | null;
    timestamp: string;
    shouldFire: boolean;
    isNoData: boolean;
    bucketKey: Record<string, string>;
    flattenGrouping?: Record<string, any>;
    context?: AdditionalContext;
};
export interface CriterionEvaluationResult {
    evaluations: Record<string, Evaluation>;
    timeRange: {
        start: number;
        end: number;
    };
}
export declare const evaluateRule: <Params extends EvaluatedRuleParams = EvaluatedRuleParams>(esClient: ElasticsearchClient, params: Params, dataView: string, dataViewDefinition: DataViewBase | undefined, timeFieldName: string, compositeSize: number, alertOnGroupDisappear: boolean, logger: Logger, timeframe: {
    start: string;
    end: string;
}, esQueryConfig: EsQueryConfig, runtimeMappings?: estypes.MappingRuntimeFields, lastPeriodEnd?: number, missingGroups?: MissingGroupsRecord[]) => Promise<CriterionEvaluationResult[]>;
