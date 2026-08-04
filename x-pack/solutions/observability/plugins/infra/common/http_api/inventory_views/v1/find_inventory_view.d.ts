import * as rt from 'io-ts';
export declare const findInventoryViewResponsePayloadRT: rt.TypeC<{
    data: rt.ArrayC<rt.ExactC<rt.IntersectionC<[rt.TypeC<{
        id: rt.StringC;
        attributes: rt.ExactC<rt.IntersectionC<[rt.TypeC<{
            name: rt.BrandC<rt.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>;
        }>, rt.PartialC<{
            isDefault: rt.BooleanC;
            isStatic: rt.BooleanC;
        }>]>>;
    }>, rt.PartialC<{
        updatedAt: rt.Type<number, string, unknown>;
        version: rt.StringC;
    }>]>>>;
}>;
export type FindInventoryViewResponsePayload = rt.TypeOf<typeof findInventoryViewResponsePayloadRT>;
