import * as rt from 'io-ts';
export declare const routeTimingMetadataRT: rt.TypeC<{
    spans: rt.ArrayC<rt.TypeC<{
        duration: rt.NumberC;
        id: rt.StringC;
        name: rt.StringC;
        start: rt.NumberC;
    }>>;
}>;
