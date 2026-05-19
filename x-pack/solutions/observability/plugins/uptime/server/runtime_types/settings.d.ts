import * as t from 'io-ts';
export declare const DynamicSettingsAttributesCodec: t.IntersectionC<[t.ExactC<t.TypeC<{
    heartbeatIndices: t.StringC;
    certAgeThreshold: t.NumberC;
    certExpirationThreshold: t.NumberC;
    defaultConnectors: t.ArrayC<t.StringC>;
}>>, t.PartialC<{
    defaultEmail: t.IntersectionC<[t.TypeC<{
        to: t.ArrayC<t.StringC>;
    }>, t.PartialC<{
        cc: t.ArrayC<t.StringC>;
        bcc: t.ArrayC<t.StringC>;
    }>]>;
    syntheticsIndexRemoved: t.BooleanC;
}>]>;
export type DynamicSettingsAttributes = t.TypeOf<typeof DynamicSettingsAttributesCodec>;
