import type { AggregationsCompositeAggregateKey } from '@elastic/elasticsearch/lib/api/types';
import type { SLODefinition } from '../../../../domain/models';
import type { BurnRateRuleParams } from '../types';
export interface EvaluationAfterKey extends AggregationsCompositeAggregateKey {
    instanceId: string;
}
export declare const LONG_WINDOW = "LONG";
export declare const SHORT_WINDOW = "SHORT";
type WindowType = typeof LONG_WINDOW | typeof SHORT_WINDOW;
export declare function generateWindowId(index: string | number): string;
export declare function generateStatsKey(id: string, type: WindowType): string;
export declare function generateBurnRateKey(id: string, type: WindowType): string;
export declare function generateAboveThresholdKey(id: string, type: WindowType): string;
export declare function buildQuery(startedAt: Date, slo: SLODefinition, params: BurnRateRuleParams, afterKey?: EvaluationAfterKey): {
    size: number;
    query: {
        bool: {
            filter: ({
                term: {
                    'slo.id': string;
                    'slo.revision'?: undefined;
                };
                range?: undefined;
            } | {
                term: {
                    'slo.revision': number;
                    'slo.id'?: undefined;
                };
                range?: undefined;
            } | {
                range: {
                    '@timestamp': {
                        gte: string;
                        lt: string;
                    };
                };
                term?: undefined;
            })[];
        };
    };
    aggs: {
        instances: {
            composite: {
                size: number;
                sources: {
                    instanceId: {
                        terms: {
                            field: string;
                        };
                    };
                }[];
                after?: EvaluationAfterKey | undefined;
            };
            aggs: {
                groupings: {
                    top_hits: {
                        size: number;
                        _source: string[];
                    };
                };
                evaluation: {
                    bucket_selector: {
                        buckets_path: {};
                        script: {
                            source: string;
                        };
                    };
                };
            };
        };
    };
};
export {};
