import * as rt from 'io-ts';
export declare const MetricIndicesAPIResponseRT: rt.TypeC<{
    metricIndices: rt.StringC;
    metricIndicesExist: rt.BooleanC;
}>;
export type MetricIndicesAPIResponse = rt.TypeOf<typeof MetricIndicesAPIResponseRT>;
