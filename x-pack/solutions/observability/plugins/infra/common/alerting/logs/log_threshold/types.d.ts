import * as rt from 'io-ts';
export { LOG_THRESHOLD_ALERT_TYPE_ID as LOG_DOCUMENT_COUNT_RULE_TYPE_ID } from '@kbn/rule-data-utils';
declare const ThresholdTypeRT: rt.KeyofC<{
    count: null;
    ratio: null;
}>;
export type ThresholdType = rt.TypeOf<typeof ThresholdTypeRT>;
export declare enum Comparator {
    GT = "more than",
    GT_OR_EQ = "more than or equals",
    LT = "less than",
    LT_OR_EQ = "less than or equals",
    EQ = "equals",
    NOT_EQ = "does not equal",
    MATCH = "matches",
    NOT_MATCH = "does not match",
    MATCH_PHRASE = "matches phrase",
    NOT_MATCH_PHRASE = "does not match phrase"
}
export declare const ComparatorToi18nMap: {
    "more than": string;
    "more than or equals": string;
    "less than": string;
    "less than or equals": string;
    equals: string;
    "does not equal": string;
    "equals:number": string;
    "does not equal:number": string;
    matches: string;
    "does not match": string;
    "matches phrase": string;
    "does not match phrase": string;
};
export declare const ComparatorToi18nSymbolsMap: {
    "more than": string;
    "more than or equals": string;
    "less than": string;
    "less than or equals": string;
    equals: string;
    "does not equal": string;
    "equals:number": string;
    "does not equal:number": string;
    matches: string;
    "does not match": string;
    "matches phrase": string;
    "does not match phrase": string;
};
export declare enum AlertStates {
    OK = 0,
    ALERT = 1,
    NO_DATA = 2,
    ERROR = 3
}
export declare const ThresholdRT: rt.TypeC<{
    comparator: rt.KeyofC<{
        "more than": null;
        "more than or equals": null;
        "less than": null;
        "less than or equals": null;
        equals: null;
        "does not equal": null;
        matches: null;
        "does not match": null;
        "matches phrase": null;
        "does not match phrase": null;
    }>;
    value: rt.NumberC;
}>;
export type Threshold = rt.TypeOf<typeof ThresholdRT>;
export declare const criterionRT: rt.TypeC<{
    field: rt.StringC;
    comparator: rt.KeyofC<{
        "more than": null;
        "more than or equals": null;
        "less than": null;
        "less than or equals": null;
        equals: null;
        "does not equal": null;
        matches: null;
        "does not match": null;
        "matches phrase": null;
        "does not match phrase": null;
    }>;
    value: rt.UnionC<[rt.StringC, rt.NumberC]>;
}>;
export type Criterion = rt.TypeOf<typeof criterionRT>;
export declare const partialCriterionRT: rt.PartialC<{
    field: rt.StringC;
    comparator: rt.KeyofC<{
        "more than": null;
        "more than or equals": null;
        "less than": null;
        "less than or equals": null;
        equals: null;
        "does not equal": null;
        matches: null;
        "does not match": null;
        "matches phrase": null;
        "does not match phrase": null;
    }>;
    value: rt.UnionC<[rt.StringC, rt.NumberC]>;
}>;
export type PartialCriterion = rt.TypeOf<typeof partialCriterionRT>;
export declare const countCriteriaRT: rt.ArrayC<rt.TypeC<{
    field: rt.StringC;
    comparator: rt.KeyofC<{
        "more than": null;
        "more than or equals": null;
        "less than": null;
        "less than or equals": null;
        equals: null;
        "does not equal": null;
        matches: null;
        "does not match": null;
        "matches phrase": null;
        "does not match phrase": null;
    }>;
    value: rt.UnionC<[rt.StringC, rt.NumberC]>;
}>>;
export type CountCriteria = rt.TypeOf<typeof countCriteriaRT>;
export declare const partialCountCriteriaRT: rt.ArrayC<rt.PartialC<{
    field: rt.StringC;
    comparator: rt.KeyofC<{
        "more than": null;
        "more than or equals": null;
        "less than": null;
        "less than or equals": null;
        equals: null;
        "does not equal": null;
        matches: null;
        "does not match": null;
        "matches phrase": null;
        "does not match phrase": null;
    }>;
    value: rt.UnionC<[rt.StringC, rt.NumberC]>;
}>>;
export type PartialCountCriteria = rt.TypeOf<typeof partialCountCriteriaRT>;
export declare const ratioCriteriaRT: rt.TupleC<[rt.ArrayC<rt.TypeC<{
    field: rt.StringC;
    comparator: rt.KeyofC<{
        "more than": null;
        "more than or equals": null;
        "less than": null;
        "less than or equals": null;
        equals: null;
        "does not equal": null;
        matches: null;
        "does not match": null;
        "matches phrase": null;
        "does not match phrase": null;
    }>;
    value: rt.UnionC<[rt.StringC, rt.NumberC]>;
}>>, rt.ArrayC<rt.TypeC<{
    field: rt.StringC;
    comparator: rt.KeyofC<{
        "more than": null;
        "more than or equals": null;
        "less than": null;
        "less than or equals": null;
        equals: null;
        "does not equal": null;
        matches: null;
        "does not match": null;
        "matches phrase": null;
        "does not match phrase": null;
    }>;
    value: rt.UnionC<[rt.StringC, rt.NumberC]>;
}>>]>;
export type RatioCriteria = rt.TypeOf<typeof ratioCriteriaRT>;
export declare const partialRatioCriteriaRT: rt.TupleC<[rt.ArrayC<rt.PartialC<{
    field: rt.StringC;
    comparator: rt.KeyofC<{
        "more than": null;
        "more than or equals": null;
        "less than": null;
        "less than or equals": null;
        equals: null;
        "does not equal": null;
        matches: null;
        "does not match": null;
        "matches phrase": null;
        "does not match phrase": null;
    }>;
    value: rt.UnionC<[rt.StringC, rt.NumberC]>;
}>>, rt.ArrayC<rt.PartialC<{
    field: rt.StringC;
    comparator: rt.KeyofC<{
        "more than": null;
        "more than or equals": null;
        "less than": null;
        "less than or equals": null;
        equals: null;
        "does not equal": null;
        matches: null;
        "does not match": null;
        "matches phrase": null;
        "does not match phrase": null;
    }>;
    value: rt.UnionC<[rt.StringC, rt.NumberC]>;
}>>]>;
export type PartialRatioCriteria = rt.TypeOf<typeof partialRatioCriteriaRT>;
export declare const partialCriteriaRT: rt.UnionC<[rt.ArrayC<rt.PartialC<{
    field: rt.StringC;
    comparator: rt.KeyofC<{
        "more than": null;
        "more than or equals": null;
        "less than": null;
        "less than or equals": null;
        equals: null;
        "does not equal": null;
        matches: null;
        "does not match": null;
        "matches phrase": null;
        "does not match phrase": null;
    }>;
    value: rt.UnionC<[rt.StringC, rt.NumberC]>;
}>>, rt.TupleC<[rt.ArrayC<rt.PartialC<{
    field: rt.StringC;
    comparator: rt.KeyofC<{
        "more than": null;
        "more than or equals": null;
        "less than": null;
        "less than or equals": null;
        equals: null;
        "does not equal": null;
        matches: null;
        "does not match": null;
        "matches phrase": null;
        "does not match phrase": null;
    }>;
    value: rt.UnionC<[rt.StringC, rt.NumberC]>;
}>>, rt.ArrayC<rt.PartialC<{
    field: rt.StringC;
    comparator: rt.KeyofC<{
        "more than": null;
        "more than or equals": null;
        "less than": null;
        "less than or equals": null;
        equals: null;
        "does not equal": null;
        matches: null;
        "does not match": null;
        "matches phrase": null;
        "does not match phrase": null;
    }>;
    value: rt.UnionC<[rt.StringC, rt.NumberC]>;
}>>]>]>;
export type PartialCriteria = rt.TypeOf<typeof partialCriteriaRT>;
export declare const timeUnitRT: rt.UnionC<[rt.LiteralC<"s">, rt.LiteralC<"m">, rt.LiteralC<"h">, rt.LiteralC<"d">]>;
export type TimeUnit = rt.TypeOf<typeof timeUnitRT>;
export declare const timeSizeRT: rt.NumberC;
export declare const groupByRT: rt.ArrayC<rt.StringC>;
declare const partialRequiredRuleParamsRT: rt.PartialC<{
    count: rt.TypeC<{
        comparator: rt.KeyofC<{
            "more than": null;
            "more than or equals": null;
            "less than": null;
            "less than or equals": null;
            equals: null;
            "does not equal": null;
            matches: null;
            "does not match": null;
            "matches phrase": null;
            "does not match phrase": null;
        }>;
        value: rt.NumberC;
    }>;
    timeUnit: rt.UnionC<[rt.LiteralC<"s">, rt.LiteralC<"m">, rt.LiteralC<"h">, rt.LiteralC<"d">]>;
    timeSize: rt.NumberC;
    logView: rt.TypeC<{
        logViewId: rt.StringC;
        type: rt.LiteralC<"log-view-reference">;
    }>;
}>;
export type PartialRequiredRuleParams = rt.TypeOf<typeof partialRequiredRuleParamsRT>;
export declare const countRuleParamsRT: rt.IntersectionC<[rt.TypeC<{
    count: rt.TypeC<{
        comparator: rt.KeyofC<{
            "more than": null;
            "more than or equals": null;
            "less than": null;
            "less than or equals": null;
            equals: null;
            "does not equal": null;
            matches: null;
            "does not match": null;
            "matches phrase": null;
            "does not match phrase": null;
        }>;
        value: rt.NumberC;
    }>;
    timeUnit: rt.UnionC<[rt.LiteralC<"s">, rt.LiteralC<"m">, rt.LiteralC<"h">, rt.LiteralC<"d">]>;
    timeSize: rt.NumberC;
    logView: rt.TypeC<{
        logViewId: rt.StringC;
        type: rt.LiteralC<"log-view-reference">;
    }>;
    criteria: rt.ArrayC<rt.TypeC<{
        field: rt.StringC;
        comparator: rt.KeyofC<{
            "more than": null;
            "more than or equals": null;
            "less than": null;
            "less than or equals": null;
            equals: null;
            "does not equal": null;
            matches: null;
            "does not match": null;
            "matches phrase": null;
            "does not match phrase": null;
        }>;
        value: rt.UnionC<[rt.StringC, rt.NumberC]>;
    }>>;
}>, rt.PartialC<{
    groupBy: rt.ArrayC<rt.StringC>;
}>]>;
export type CountRuleParams = rt.TypeOf<typeof countRuleParamsRT>;
export declare const partialCountRuleParamsRT: rt.IntersectionC<[rt.TypeC<{
    count: rt.TypeC<{
        comparator: rt.KeyofC<{
            "more than": null;
            "more than or equals": null;
            "less than": null;
            "less than or equals": null;
            equals: null;
            "does not equal": null;
            matches: null;
            "does not match": null;
            "matches phrase": null;
            "does not match phrase": null;
        }>;
        value: rt.NumberC;
    }>;
    timeUnit: rt.UnionC<[rt.LiteralC<"s">, rt.LiteralC<"m">, rt.LiteralC<"h">, rt.LiteralC<"d">]>;
    timeSize: rt.NumberC;
    logView: rt.TypeC<{
        logViewId: rt.StringC;
        type: rt.LiteralC<"log-view-reference">;
    }>;
    criteria: rt.ArrayC<rt.PartialC<{
        field: rt.StringC;
        comparator: rt.KeyofC<{
            "more than": null;
            "more than or equals": null;
            "less than": null;
            "less than or equals": null;
            equals: null;
            "does not equal": null;
            matches: null;
            "does not match": null;
            "matches phrase": null;
            "does not match phrase": null;
        }>;
        value: rt.UnionC<[rt.StringC, rt.NumberC]>;
    }>>;
}>, rt.PartialC<{
    groupBy: rt.ArrayC<rt.StringC>;
}>]>;
export type PartialCountRuleParams = rt.TypeOf<typeof partialCountRuleParamsRT>;
export declare const ratioRuleParamsRT: rt.IntersectionC<[rt.TypeC<{
    count: rt.TypeC<{
        comparator: rt.KeyofC<{
            "more than": null;
            "more than or equals": null;
            "less than": null;
            "less than or equals": null;
            equals: null;
            "does not equal": null;
            matches: null;
            "does not match": null;
            "matches phrase": null;
            "does not match phrase": null;
        }>;
        value: rt.NumberC;
    }>;
    timeUnit: rt.UnionC<[rt.LiteralC<"s">, rt.LiteralC<"m">, rt.LiteralC<"h">, rt.LiteralC<"d">]>;
    timeSize: rt.NumberC;
    logView: rt.TypeC<{
        logViewId: rt.StringC;
        type: rt.LiteralC<"log-view-reference">;
    }>;
    criteria: rt.TupleC<[rt.ArrayC<rt.TypeC<{
        field: rt.StringC;
        comparator: rt.KeyofC<{
            "more than": null;
            "more than or equals": null;
            "less than": null;
            "less than or equals": null;
            equals: null;
            "does not equal": null;
            matches: null;
            "does not match": null;
            "matches phrase": null;
            "does not match phrase": null;
        }>;
        value: rt.UnionC<[rt.StringC, rt.NumberC]>;
    }>>, rt.ArrayC<rt.TypeC<{
        field: rt.StringC;
        comparator: rt.KeyofC<{
            "more than": null;
            "more than or equals": null;
            "less than": null;
            "less than or equals": null;
            equals: null;
            "does not equal": null;
            matches: null;
            "does not match": null;
            "matches phrase": null;
            "does not match phrase": null;
        }>;
        value: rt.UnionC<[rt.StringC, rt.NumberC]>;
    }>>]>;
}>, rt.PartialC<{
    groupBy: rt.ArrayC<rt.StringC>;
}>]>;
export type RatioRuleParams = rt.TypeOf<typeof ratioRuleParamsRT>;
export declare const partialRatioRuleParamsRT: rt.IntersectionC<[rt.TypeC<{
    count: rt.TypeC<{
        comparator: rt.KeyofC<{
            "more than": null;
            "more than or equals": null;
            "less than": null;
            "less than or equals": null;
            equals: null;
            "does not equal": null;
            matches: null;
            "does not match": null;
            "matches phrase": null;
            "does not match phrase": null;
        }>;
        value: rt.NumberC;
    }>;
    timeUnit: rt.UnionC<[rt.LiteralC<"s">, rt.LiteralC<"m">, rt.LiteralC<"h">, rt.LiteralC<"d">]>;
    timeSize: rt.NumberC;
    logView: rt.TypeC<{
        logViewId: rt.StringC;
        type: rt.LiteralC<"log-view-reference">;
    }>;
    criteria: rt.TupleC<[rt.ArrayC<rt.PartialC<{
        field: rt.StringC;
        comparator: rt.KeyofC<{
            "more than": null;
            "more than or equals": null;
            "less than": null;
            "less than or equals": null;
            equals: null;
            "does not equal": null;
            matches: null;
            "does not match": null;
            "matches phrase": null;
            "does not match phrase": null;
        }>;
        value: rt.UnionC<[rt.StringC, rt.NumberC]>;
    }>>, rt.ArrayC<rt.PartialC<{
        field: rt.StringC;
        comparator: rt.KeyofC<{
            "more than": null;
            "more than or equals": null;
            "less than": null;
            "less than or equals": null;
            equals: null;
            "does not equal": null;
            matches: null;
            "does not match": null;
            "matches phrase": null;
            "does not match phrase": null;
        }>;
        value: rt.UnionC<[rt.StringC, rt.NumberC]>;
    }>>]>;
}>, rt.PartialC<{
    groupBy: rt.ArrayC<rt.StringC>;
}>]>;
export type PartialRatioRuleParams = rt.TypeOf<typeof partialRatioRuleParamsRT>;
export declare const ruleParamsRT: rt.UnionC<[rt.IntersectionC<[rt.TypeC<{
    count: rt.TypeC<{
        comparator: rt.KeyofC<{
            "more than": null;
            "more than or equals": null;
            "less than": null;
            "less than or equals": null;
            equals: null;
            "does not equal": null;
            matches: null;
            "does not match": null;
            "matches phrase": null;
            "does not match phrase": null;
        }>;
        value: rt.NumberC;
    }>;
    timeUnit: rt.UnionC<[rt.LiteralC<"s">, rt.LiteralC<"m">, rt.LiteralC<"h">, rt.LiteralC<"d">]>;
    timeSize: rt.NumberC;
    logView: rt.TypeC<{
        logViewId: rt.StringC;
        type: rt.LiteralC<"log-view-reference">;
    }>;
    criteria: rt.ArrayC<rt.TypeC<{
        field: rt.StringC;
        comparator: rt.KeyofC<{
            "more than": null;
            "more than or equals": null;
            "less than": null;
            "less than or equals": null;
            equals: null;
            "does not equal": null;
            matches: null;
            "does not match": null;
            "matches phrase": null;
            "does not match phrase": null;
        }>;
        value: rt.UnionC<[rt.StringC, rt.NumberC]>;
    }>>;
}>, rt.PartialC<{
    groupBy: rt.ArrayC<rt.StringC>;
}>]>, rt.IntersectionC<[rt.TypeC<{
    count: rt.TypeC<{
        comparator: rt.KeyofC<{
            "more than": null;
            "more than or equals": null;
            "less than": null;
            "less than or equals": null;
            equals: null;
            "does not equal": null;
            matches: null;
            "does not match": null;
            "matches phrase": null;
            "does not match phrase": null;
        }>;
        value: rt.NumberC;
    }>;
    timeUnit: rt.UnionC<[rt.LiteralC<"s">, rt.LiteralC<"m">, rt.LiteralC<"h">, rt.LiteralC<"d">]>;
    timeSize: rt.NumberC;
    logView: rt.TypeC<{
        logViewId: rt.StringC;
        type: rt.LiteralC<"log-view-reference">;
    }>;
    criteria: rt.TupleC<[rt.ArrayC<rt.TypeC<{
        field: rt.StringC;
        comparator: rt.KeyofC<{
            "more than": null;
            "more than or equals": null;
            "less than": null;
            "less than or equals": null;
            equals: null;
            "does not equal": null;
            matches: null;
            "does not match": null;
            "matches phrase": null;
            "does not match phrase": null;
        }>;
        value: rt.UnionC<[rt.StringC, rt.NumberC]>;
    }>>, rt.ArrayC<rt.TypeC<{
        field: rt.StringC;
        comparator: rt.KeyofC<{
            "more than": null;
            "more than or equals": null;
            "less than": null;
            "less than or equals": null;
            equals: null;
            "does not equal": null;
            matches: null;
            "does not match": null;
            "matches phrase": null;
            "does not match phrase": null;
        }>;
        value: rt.UnionC<[rt.StringC, rt.NumberC]>;
    }>>]>;
}>, rt.PartialC<{
    groupBy: rt.ArrayC<rt.StringC>;
}>]>]>;
export type RuleParams = rt.TypeOf<typeof ruleParamsRT>;
export declare const partialRuleParamsRT: rt.UnionC<[rt.IntersectionC<[rt.TypeC<{
    count: rt.TypeC<{
        comparator: rt.KeyofC<{
            "more than": null;
            "more than or equals": null;
            "less than": null;
            "less than or equals": null;
            equals: null;
            "does not equal": null;
            matches: null;
            "does not match": null;
            "matches phrase": null;
            "does not match phrase": null;
        }>;
        value: rt.NumberC;
    }>;
    timeUnit: rt.UnionC<[rt.LiteralC<"s">, rt.LiteralC<"m">, rt.LiteralC<"h">, rt.LiteralC<"d">]>;
    timeSize: rt.NumberC;
    logView: rt.TypeC<{
        logViewId: rt.StringC;
        type: rt.LiteralC<"log-view-reference">;
    }>;
    criteria: rt.ArrayC<rt.PartialC<{
        field: rt.StringC;
        comparator: rt.KeyofC<{
            "more than": null;
            "more than or equals": null;
            "less than": null;
            "less than or equals": null;
            equals: null;
            "does not equal": null;
            matches: null;
            "does not match": null;
            "matches phrase": null;
            "does not match phrase": null;
        }>;
        value: rt.UnionC<[rt.StringC, rt.NumberC]>;
    }>>;
}>, rt.PartialC<{
    groupBy: rt.ArrayC<rt.StringC>;
}>]>, rt.IntersectionC<[rt.TypeC<{
    count: rt.TypeC<{
        comparator: rt.KeyofC<{
            "more than": null;
            "more than or equals": null;
            "less than": null;
            "less than or equals": null;
            equals: null;
            "does not equal": null;
            matches: null;
            "does not match": null;
            "matches phrase": null;
            "does not match phrase": null;
        }>;
        value: rt.NumberC;
    }>;
    timeUnit: rt.UnionC<[rt.LiteralC<"s">, rt.LiteralC<"m">, rt.LiteralC<"h">, rt.LiteralC<"d">]>;
    timeSize: rt.NumberC;
    logView: rt.TypeC<{
        logViewId: rt.StringC;
        type: rt.LiteralC<"log-view-reference">;
    }>;
    criteria: rt.TupleC<[rt.ArrayC<rt.PartialC<{
        field: rt.StringC;
        comparator: rt.KeyofC<{
            "more than": null;
            "more than or equals": null;
            "less than": null;
            "less than or equals": null;
            equals: null;
            "does not equal": null;
            matches: null;
            "does not match": null;
            "matches phrase": null;
            "does not match phrase": null;
        }>;
        value: rt.UnionC<[rt.StringC, rt.NumberC]>;
    }>>, rt.ArrayC<rt.PartialC<{
        field: rt.StringC;
        comparator: rt.KeyofC<{
            "more than": null;
            "more than or equals": null;
            "less than": null;
            "less than or equals": null;
            equals: null;
            "does not equal": null;
            matches: null;
            "does not match": null;
            "matches phrase": null;
            "does not match phrase": null;
        }>;
        value: rt.UnionC<[rt.StringC, rt.NumberC]>;
    }>>]>;
}>, rt.PartialC<{
    groupBy: rt.ArrayC<rt.StringC>;
}>]>]>;
export type PartialRuleParams = rt.TypeOf<typeof partialRuleParamsRT>;
export declare const isRatioRule: (criteria: PartialCriteria) => criteria is PartialRatioCriteria;
export declare const isRatioRuleParams: (params: RuleParams) => params is RatioRuleParams;
export declare const getNumerator: <C extends RatioCriteria | PartialRatioCriteria>(criteria: C) => C[0];
export declare const getDenominator: <C extends RatioCriteria | PartialRatioCriteria>(criteria: C) => C[1];
export declare const hasGroupBy: (params: RuleParams) => boolean;
export declare const UngroupedSearchQueryResponseRT: rt.IntersectionC<[rt.TypeC<{
    _shards: rt.TypeC<{
        total: rt.NumberC;
        successful: rt.NumberC;
        skipped: rt.NumberC;
        failed: rt.NumberC;
    }>;
    timed_out: rt.BooleanC;
    took: rt.NumberC;
}>, rt.IntersectionC<[rt.TypeC<{
    hits: rt.TypeC<{
        total: rt.TypeC<{
            value: rt.NumberC;
        }>;
    }>;
}>, rt.PartialC<{
    aggregations: rt.IntersectionC<[rt.PartialC<{
        histogramBuckets: rt.TypeC<{
            buckets: rt.ArrayC<rt.TypeC<{
                key: rt.NumberC;
                doc_count: rt.NumberC;
            }>>;
        }>;
    }>, rt.PartialC<{
        additionalContext: rt.TypeC<{
            hits: rt.TypeC<{
                hits: rt.ArrayC<rt.TypeC<{
                    fields: rt.RecordC<rt.StringC, rt.ArrayC<rt.UnknownC>>;
                }>>;
            }>;
        }>;
    }>]>;
}>]>]>;
export type UngroupedSearchQueryResponse = rt.TypeOf<typeof UngroupedSearchQueryResponseRT>;
export declare const UnoptimizedGroupedSearchQueryResponseRT: rt.IntersectionC<[rt.TypeC<{
    _shards: rt.TypeC<{
        total: rt.NumberC;
        successful: rt.NumberC;
        skipped: rt.NumberC;
        failed: rt.NumberC;
    }>;
    timed_out: rt.BooleanC;
    took: rt.NumberC;
}>, rt.TypeC<{
    aggregations: rt.TypeC<{
        groups: rt.IntersectionC<[rt.TypeC<{
            buckets: rt.ArrayC<rt.TypeC<{
                filtered_results: rt.IntersectionC<[rt.TypeC<{
                    doc_count: rt.NumberC;
                }>, rt.PartialC<{
                    histogramBuckets: rt.TypeC<{
                        buckets: rt.ArrayC<rt.TypeC<{
                            key: rt.NumberC;
                            doc_count: rt.NumberC;
                        }>>;
                    }>;
                }>, rt.PartialC<{
                    additionalContext: rt.TypeC<{
                        hits: rt.TypeC<{
                            hits: rt.ArrayC<rt.TypeC<{
                                fields: rt.RecordC<rt.StringC, rt.ArrayC<rt.UnknownC>>;
                            }>>;
                        }>;
                    }>;
                }>]>;
                key: rt.RecordC<rt.StringC, rt.StringC>;
                doc_count: rt.NumberC;
            }>>;
        }>, rt.PartialC<{
            after_key: rt.RecordC<rt.StringC, rt.StringC>;
        }>]>;
    }>;
    hits: rt.TypeC<{
        total: rt.TypeC<{
            value: rt.NumberC;
        }>;
    }>;
}>]>;
export type UnoptimizedGroupedSearchQueryResponse = rt.TypeOf<typeof UnoptimizedGroupedSearchQueryResponseRT>;
export declare const OptimizedGroupedSearchQueryResponseRT: rt.IntersectionC<[rt.TypeC<{
    _shards: rt.TypeC<{
        total: rt.NumberC;
        successful: rt.NumberC;
        skipped: rt.NumberC;
        failed: rt.NumberC;
    }>;
    timed_out: rt.BooleanC;
    took: rt.NumberC;
}>, rt.TypeC<{
    aggregations: rt.TypeC<{
        groups: rt.IntersectionC<[rt.TypeC<{
            buckets: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
                key: rt.RecordC<rt.StringC, rt.StringC>;
                doc_count: rt.NumberC;
            }>, rt.PartialC<{
                histogramBuckets: rt.TypeC<{
                    buckets: rt.ArrayC<rt.TypeC<{
                        key: rt.NumberC;
                        doc_count: rt.NumberC;
                    }>>;
                }>;
            }>, rt.PartialC<{
                additionalContext: rt.TypeC<{
                    hits: rt.TypeC<{
                        hits: rt.ArrayC<rt.TypeC<{
                            fields: rt.RecordC<rt.StringC, rt.ArrayC<rt.UnknownC>>;
                        }>>;
                    }>;
                }>;
            }>]>>;
        }>, rt.PartialC<{
            after_key: rt.RecordC<rt.StringC, rt.StringC>;
        }>]>;
    }>;
    hits: rt.TypeC<{
        total: rt.TypeC<{
            value: rt.NumberC;
        }>;
    }>;
}>]>;
export type OptimizedGroupedSearchQueryResponse = rt.TypeOf<typeof OptimizedGroupedSearchQueryResponseRT>;
export declare const GroupedSearchQueryResponseRT: rt.UnionC<[rt.IntersectionC<[rt.TypeC<{
    _shards: rt.TypeC<{
        total: rt.NumberC;
        successful: rt.NumberC;
        skipped: rt.NumberC;
        failed: rt.NumberC;
    }>;
    timed_out: rt.BooleanC;
    took: rt.NumberC;
}>, rt.TypeC<{
    aggregations: rt.TypeC<{
        groups: rt.IntersectionC<[rt.TypeC<{
            buckets: rt.ArrayC<rt.TypeC<{
                filtered_results: rt.IntersectionC<[rt.TypeC<{
                    doc_count: rt.NumberC;
                }>, rt.PartialC<{
                    histogramBuckets: rt.TypeC<{
                        buckets: rt.ArrayC<rt.TypeC<{
                            key: rt.NumberC;
                            doc_count: rt.NumberC;
                        }>>;
                    }>;
                }>, rt.PartialC<{
                    additionalContext: rt.TypeC<{
                        hits: rt.TypeC<{
                            hits: rt.ArrayC<rt.TypeC<{
                                fields: rt.RecordC<rt.StringC, rt.ArrayC<rt.UnknownC>>;
                            }>>;
                        }>;
                    }>;
                }>]>;
                key: rt.RecordC<rt.StringC, rt.StringC>;
                doc_count: rt.NumberC;
            }>>;
        }>, rt.PartialC<{
            after_key: rt.RecordC<rt.StringC, rt.StringC>;
        }>]>;
    }>;
    hits: rt.TypeC<{
        total: rt.TypeC<{
            value: rt.NumberC;
        }>;
    }>;
}>]>, rt.IntersectionC<[rt.TypeC<{
    _shards: rt.TypeC<{
        total: rt.NumberC;
        successful: rt.NumberC;
        skipped: rt.NumberC;
        failed: rt.NumberC;
    }>;
    timed_out: rt.BooleanC;
    took: rt.NumberC;
}>, rt.TypeC<{
    aggregations: rt.TypeC<{
        groups: rt.IntersectionC<[rt.TypeC<{
            buckets: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
                key: rt.RecordC<rt.StringC, rt.StringC>;
                doc_count: rt.NumberC;
            }>, rt.PartialC<{
                histogramBuckets: rt.TypeC<{
                    buckets: rt.ArrayC<rt.TypeC<{
                        key: rt.NumberC;
                        doc_count: rt.NumberC;
                    }>>;
                }>;
            }>, rt.PartialC<{
                additionalContext: rt.TypeC<{
                    hits: rt.TypeC<{
                        hits: rt.ArrayC<rt.TypeC<{
                            fields: rt.RecordC<rt.StringC, rt.ArrayC<rt.UnknownC>>;
                        }>>;
                    }>;
                }>;
            }>]>>;
        }>, rt.PartialC<{
            after_key: rt.RecordC<rt.StringC, rt.StringC>;
        }>]>;
    }>;
    hits: rt.TypeC<{
        total: rt.TypeC<{
            value: rt.NumberC;
        }>;
    }>;
}>]>]>;
export type GroupedSearchQueryResponse = rt.TypeOf<typeof GroupedSearchQueryResponseRT>;
export declare const isOptimizedGroupedSearchQueryResponse: (response: GroupedSearchQueryResponse["aggregations"]["groups"]["buckets"]) => response is OptimizedGroupedSearchQueryResponse["aggregations"]["groups"]["buckets"];
export declare const isOptimizableGroupedThreshold: (selectedComparator: RuleParams["count"]["comparator"], selectedValue?: RuleParams["count"]["value"]) => boolean;
export interface ExecutionTimeRange {
    gte?: number;
    lte: number;
}
