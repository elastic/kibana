import * as rt from 'io-ts';
export declare const badRequestErrorRT: rt.IntersectionC<[rt.TypeC<{
    statusCode: rt.LiteralC<400>;
    error: rt.LiteralC<"Bad Request">;
    message: rt.StringC;
}>, rt.PartialC<{
    attributes: rt.UnknownC;
}>]>;
export declare const forbiddenErrorRT: rt.IntersectionC<[rt.TypeC<{
    statusCode: rt.LiteralC<403>;
    error: rt.LiteralC<"Forbidden">;
    message: rt.StringC;
}>, rt.PartialC<{
    attributes: rt.UnknownC;
}>]>;
export declare const conflictErrorRT: rt.IntersectionC<[rt.TypeC<{
    statusCode: rt.LiteralC<409>;
    error: rt.LiteralC<"Conflict">;
    message: rt.StringC;
}>, rt.PartialC<{
    attributes: rt.UnknownC;
}>]>;
