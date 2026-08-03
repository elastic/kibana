import * as rt from 'io-ts';
export declare const metricStatisticsRT: rt.TypeC<{
    avg: rt.UnionC<[rt.NumberC, rt.NullC]>;
    count: rt.NumberC;
    max: rt.UnionC<[rt.NumberC, rt.NullC]>;
    min: rt.UnionC<[rt.NumberC, rt.NullC]>;
    sum: rt.NumberC;
}>;
