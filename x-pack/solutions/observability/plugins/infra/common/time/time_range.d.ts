import * as rt from 'io-ts';
export declare const timeRangeRT: rt.TypeC<{
    startTime: rt.NumberC;
    endTime: rt.NumberC;
}>;
export type TimeRange = rt.TypeOf<typeof timeRangeRT>;
