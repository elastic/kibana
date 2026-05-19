import * as t from 'io-ts';
export declare const StateEndsCodec: t.TypeC<{
    duration_ms: t.UnionC<[t.StringC, t.NumberC]>;
    checks: t.NumberC;
    ends: t.UnionC<[t.StringC, t.NullC]>;
    started_at: t.StringC;
    id: t.StringC;
    up: t.NumberC;
    down: t.NumberC;
    status: t.StringC;
}>;
export declare const ErrorStateCodec: t.TypeC<{
    duration_ms: t.UnionC<[t.StringC, t.NumberC]>;
    checks: t.NumberC;
    ends: t.UnionC<[t.TypeC<{
        duration_ms: t.UnionC<[t.StringC, t.NumberC]>;
        checks: t.NumberC;
        ends: t.UnionC<[t.StringC, t.NullC]>;
        started_at: t.StringC;
        id: t.StringC;
        up: t.NumberC;
        down: t.NumberC;
        status: t.StringC;
    }>, t.NullC]>;
    started_at: t.StringC;
    id: t.StringC;
    up: t.NumberC;
    down: t.NumberC;
    status: t.StringC;
}>;
export type ErrorState = t.TypeOf<typeof ErrorStateCodec>;
