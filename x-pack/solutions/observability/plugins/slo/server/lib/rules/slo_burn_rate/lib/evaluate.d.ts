import type { ElasticsearchClient } from '@kbn/core/server';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { SLODefinition } from '../../../../domain/models';
import { Duration } from '../../../../domain/models';
import type { BurnRateRuleParams } from '../types';
import type { EvaluationAfterKey } from './build_query';
export interface EvaluationWindowStats {
    doc_count: number;
    good: {
        value: number;
    };
    total: {
        value: number;
    };
}
export interface TopHitsAggResults {
    slo: {
        groupings: Record<string, unknown>;
    };
}
export interface EvaluationBucket {
    key: EvaluationAfterKey;
    groupings: SearchResponse<TopHitsAggResults>;
    doc_count: number;
    WINDOW_0_SHORT?: EvaluationWindowStats;
    WINDOW_1_SHORT?: EvaluationWindowStats;
    WINDOW_2_SHORT?: EvaluationWindowStats;
    WINDOW_3_SHORT?: EvaluationWindowStats;
    WINDOW_0_LONG?: EvaluationWindowStats;
    WINDOW_1_LONG?: EvaluationWindowStats;
    WINDOW_2_LONG?: EvaluationWindowStats;
    WINDOW_3_LONG?: EvaluationWindowStats;
    WINDOW_0_SHORT_BURN_RATE?: {
        value: number;
    };
    WINDOW_1_SHORT_BURN_RATE?: {
        value: number;
    };
    WINDOW_2_SHORT_BURN_RATE?: {
        value: number;
    };
    WINDOW_3_SHORT_BURN_RATE?: {
        value: number;
    };
    WINDOW_0_LONG_BURN_RATE?: {
        value: number;
    };
    WINDOW_1_LONG_BURN_RATE?: {
        value: number;
    };
    WINDOW_2_LONG_BURN_RATE?: {
        value: number;
    };
    WINDOW_3_LONG_BURN_RATE?: {
        value: number;
    };
    WINDOW_0_SHORT_ABOVE_THRESHOLD?: {
        value: number;
    };
    WINDOW_1_SHORT_ABOVE_THRESHOLD?: {
        value: number;
    };
    WINDOW_2_SHORT_ABOVE_THRESHOLD?: {
        value: number;
    };
    WINDOW_3_SHORT_ABOVE_THRESHOLD?: {
        value: number;
    };
    WINDOW_0_LONG_ABOVE_THRESHOLD?: {
        value: number;
    };
    WINDOW_1_LONG_ABOVE_THRESHOLD?: {
        value: number;
    };
    WINDOW_2_LONG_ABOVE_THRESHOLD?: {
        value: number;
    };
    WINDOW_3_LONG_ABOVE_THRESHOLD?: {
        value: number;
    };
}
export interface EvalutionAggResults {
    instances: {
        after_key?: EvaluationAfterKey;
        buckets: EvaluationBucket[];
    };
}
export declare function evaluate(esClient: ElasticsearchClient, slo: SLODefinition, params: BurnRateRuleParams, startedAt: Date): Promise<{
    instanceId: string;
    groupings: Record<string, unknown> | undefined;
    shouldAlert: boolean;
    longWindowBurnRate: number;
    shortWindowBurnRate: number;
    shortWindowDuration: Duration;
    longWindowDuration: Duration;
    window: import("../types").WindowSchema;
}[]>;
