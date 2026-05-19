import * as t from 'io-ts';
declare const DefaultEmailCodec: t.IntersectionC<[t.TypeC<{
    to: t.ArrayC<t.StringC>;
}>, t.PartialC<{
    cc: t.ArrayC<t.StringC>;
    bcc: t.ArrayC<t.StringC>;
}>]>;
export declare const DynamicSettingsSaveCodec: t.IntersectionC<[t.TypeC<{
    success: t.BooleanC;
}>, t.PartialC<{
    error: t.StringC;
}>]>;
export declare const DynamicSettingsCodec: t.IntersectionC<[t.ExactC<t.TypeC<{
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
}>]>;
export type DynamicSettings = t.TypeOf<typeof DynamicSettingsCodec>;
export type DefaultEmail = t.TypeOf<typeof DefaultEmailCodec>;
export type DynamicSettingsSaveResponse = t.TypeOf<typeof DynamicSettingsSaveCodec>;
export declare const LocationMonitorsType: t.TypeC<{
    status: t.NumberC;
    payload: t.ArrayC<t.TypeC<{
        id: t.StringC;
        count: t.NumberC;
    }>>;
}>;
export {};
