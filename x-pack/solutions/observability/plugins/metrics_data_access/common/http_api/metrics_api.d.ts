import * as rt from 'io-ts';
import type { estypes } from '@elastic/elasticsearch';
import { timeRangeRT } from './metrics_explorer';
import type { MetricsUIAggregation } from '../inventory_models/types';
export interface MetricsAPIMetric {
    id: string;
    aggregations: MetricsUIAggregation;
}
export declare const MetricsAPIMetricRT: rt.TypeC<{
    id: rt.StringC;
    aggregations: rt.UnknownRecordC;
}>;
export declare const MetricsAPIRequestRT: rt.IntersectionC<[rt.TypeC<{
    timerange: rt.TypeC<{
        from: rt.NumberC;
        to: rt.NumberC;
        interval: rt.StringC;
    }>;
    indexPattern: rt.StringC;
    metrics: rt.ArrayC<rt.TypeC<{
        id: rt.StringC;
        aggregations: rt.UnknownRecordC;
    }>>;
    includeTimeseries: rt.UnionC<[rt.BooleanC, rt.Type<true, undefined, unknown>]>;
}>, rt.PartialC<{
    groupBy: rt.ArrayC<rt.UnionC<[rt.StringC, rt.NullC, rt.UndefinedC]>>;
    groupInstance: rt.ArrayC<rt.UnionC<[rt.StringC, rt.NullC, rt.UndefinedC]>>;
    modules: rt.ArrayC<rt.StringC>;
    afterKey: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NullC]>>]>;
    limit: rt.UnionC<[rt.NumberC, rt.NullC]>;
    filters: rt.UnknownRecordC;
    dropPartialBuckets: rt.BooleanC;
    alignDataToEnd: rt.BooleanC;
}>]>;
export declare const MetricsAPIPageInfoRT: rt.IntersectionC<[rt.TypeC<{
    afterKey: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NullC]>>, rt.UndefinedC]>;
}>, rt.PartialC<{
    interval: rt.NumberC;
}>]>;
export declare const MetricsAPIColumnTypeRT: rt.KeyofC<{
    date: null;
    number: null;
    string: null;
}>;
export declare const MetricsAPIColumnRT: rt.TypeC<{
    name: rt.StringC;
    type: rt.KeyofC<{
        date: null;
        number: null;
        string: null;
    }>;
}>;
export declare const MetricsAPIRowRT: rt.IntersectionC<[rt.TypeC<{
    timestamp: rt.NumberC;
}>, rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NumberC, rt.NullC, rt.UndefinedC, rt.ArrayC<rt.ObjectC>]>>]>;
export declare const MetricsAPISeriesRT: rt.IntersectionC<[rt.TypeC<{
    id: rt.StringC;
    columns: rt.ArrayC<rt.TypeC<{
        name: rt.StringC;
        type: rt.KeyofC<{
            date: null;
            number: null;
            string: null;
        }>;
    }>>;
    rows: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
        timestamp: rt.NumberC;
    }>, rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NumberC, rt.NullC, rt.UndefinedC, rt.ArrayC<rt.ObjectC>]>>]>>;
}>, rt.PartialC<{
    keys: rt.ArrayC<rt.StringC>;
}>]>;
export declare const MetricsAPIResponseSeriesRT: rt.IntersectionC<[rt.IntersectionC<[rt.TypeC<{
    id: rt.StringC;
    columns: rt.ArrayC<rt.TypeC<{
        name: rt.StringC;
        type: rt.KeyofC<{
            date: null;
            number: null;
            string: null;
        }>;
    }>>;
    rows: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
        timestamp: rt.NumberC;
    }>, rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NumberC, rt.NullC, rt.UndefinedC, rt.ArrayC<rt.ObjectC>]>>]>>;
}>, rt.PartialC<{
    keys: rt.ArrayC<rt.StringC>;
}>]>, rt.PartialC<{
    metricsets: rt.ArrayC<rt.StringC>;
}>]>;
export declare const MetricsAPIResponseRT: rt.TypeC<{
    series: rt.ArrayC<rt.IntersectionC<[rt.IntersectionC<[rt.TypeC<{
        id: rt.StringC;
        columns: rt.ArrayC<rt.TypeC<{
            name: rt.StringC;
            type: rt.KeyofC<{
                date: null;
                number: null;
                string: null;
            }>;
        }>>;
        rows: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
            timestamp: rt.NumberC;
        }>, rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NumberC, rt.NullC, rt.UndefinedC, rt.ArrayC<rt.ObjectC>]>>]>>;
    }>, rt.PartialC<{
        keys: rt.ArrayC<rt.StringC>;
    }>]>, rt.PartialC<{
        metricsets: rt.ArrayC<rt.StringC>;
    }>]>>;
    info: rt.IntersectionC<[rt.TypeC<{
        afterKey: rt.UnionC<[rt.NullC, rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NullC]>>, rt.UndefinedC]>;
    }>, rt.PartialC<{
        interval: rt.NumberC;
    }>]>;
}>;
export type MetricsAPIRequest = Omit<rt.OutputOf<typeof MetricsAPIRequestRT>, 'metrics' | 'filters'> & {
    metrics: MetricsAPIMetric[];
    filters?: {
        bool: estypes.QueryDslBoolQuery;
    };
};
export type MetricsAPITimerange = rt.TypeOf<typeof timeRangeRT>;
export type MetricsAPIColumnType = rt.TypeOf<typeof MetricsAPIColumnTypeRT>;
export type MetricsAPIPageInfo = rt.TypeOf<typeof MetricsAPIPageInfoRT>;
export type MetricsAPIColumn = rt.TypeOf<typeof MetricsAPIColumnRT>;
export type MetricsAPIRow = rt.TypeOf<typeof MetricsAPIRowRT>;
export type MetricsAPISeries = rt.TypeOf<typeof MetricsAPISeriesRT>;
export type MetricsAPIResponse = rt.TypeOf<typeof MetricsAPIResponseRT>;
