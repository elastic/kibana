import * as rt from 'io-ts';
export declare const tracingSpanRT: rt.TypeC<{
    duration: rt.NumberC;
    id: rt.StringC;
    name: rt.StringC;
    start: rt.NumberC;
}>;
export type TracingSpan = rt.TypeOf<typeof tracingSpanRT>;
export type ActiveTrace = (endTime?: number) => TracingSpan;
export declare const startTracingSpan: (name: string) => ActiveTrace;
