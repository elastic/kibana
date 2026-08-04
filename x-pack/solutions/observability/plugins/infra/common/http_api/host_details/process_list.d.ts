import * as rt from 'io-ts';
import { type MetricsAPIRow } from '@kbn/metrics-data-access-plugin/common';
export declare const ProcessListAPIRequestRT: rt.TypeC<{
    hostTerm: rt.RecordC<rt.StringC, rt.StringC>;
    sourceId: rt.StringC;
    to: rt.NumberC;
    sortBy: rt.TypeC<{
        name: rt.StringC;
        isAscending: rt.BooleanC;
    }>;
    searchFilter: rt.ArrayC<rt.RecordC<rt.StringC, rt.RecordC<rt.StringC, rt.UnknownC>>>;
    schema: rt.UnionC<[rt.KeyofC<{
        ecs: null;
        semconv: null;
    }>, rt.NullC]>;
}>;
export declare const ProcessListAPIResponseRT: rt.TypeC<{
    processList: rt.ArrayC<rt.TypeC<{
        cpu: rt.UnionC<[rt.NullC, rt.NumberC]>;
        memory: rt.UnionC<[rt.NullC, rt.NumberC]>;
        startTime: rt.UnionC<[rt.NullC, rt.NumberC]>;
        pid: rt.NumberC;
        state: rt.StringC;
        user: rt.StringC;
        command: rt.StringC;
    }>>;
    summary: rt.ExactC<rt.PartialC<{
        total: rt.UnionC<[rt.NumberC, rt.StringC]>;
        running: rt.UnionC<[rt.NumberC, rt.StringC]>;
        sleeping: rt.UnionC<[rt.NumberC, rt.StringC]>;
        dead: rt.UnionC<[rt.NumberC, rt.StringC]>;
        stopped: rt.UnionC<[rt.NumberC, rt.StringC]>;
        idle: rt.UnionC<[rt.NumberC, rt.StringC]>;
        zombie: rt.UnionC<[rt.NumberC, rt.StringC]>;
        unknown: rt.UnionC<[rt.NumberC, rt.StringC]>;
    }>>;
}>;
export type ProcessListAPIRequest = rt.TypeOf<typeof ProcessListAPIRequestRT>;
export type ProcessListAPIResponse = rt.TypeOf<typeof ProcessListAPIResponseRT>;
export declare const ProcessListAPIChartRequestRT: rt.TypeC<{
    hostTerm: rt.RecordC<rt.StringC, rt.StringC>;
    indexPattern: rt.StringC;
    to: rt.NumberC;
    command: rt.StringC;
    schema: rt.UnionC<[rt.KeyofC<{
        ecs: null;
        semconv: null;
    }>, rt.NullC]>;
}>;
export declare const ProcessListAPIChartResponseRT: rt.TypeC<{
    cpu: rt.IntersectionC<[rt.TypeC<{
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
    memory: rt.IntersectionC<[rt.TypeC<{
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
}>;
export type ProcessListAPIChartRequest = rt.TypeOf<typeof ProcessListAPIChartRequestRT>;
export type ProcessListAPIChartResponse = rt.TypeOf<typeof ProcessListAPIChartResponseRT>;
export type ProcessListAPIRow = MetricsAPIRow;
