import * as rt from 'io-ts';
export declare const commonSearchSuccessResponseFieldsRT: rt.TypeC<{
    _shards: rt.TypeC<{
        total: rt.NumberC;
        successful: rt.NumberC;
        skipped: rt.NumberC;
        failed: rt.NumberC;
    }>;
    timed_out: rt.BooleanC;
    took: rt.NumberC;
}>;
