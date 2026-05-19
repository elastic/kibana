import * as t from 'io-ts';
export declare const GetCertsParamsType: t.IntersectionC<[t.TypeC<{
    pageIndex: t.NumberC;
}>, t.PartialC<{
    search: t.StringC;
    notValidBefore: t.StringC;
    notValidAfter: t.StringC;
    from: t.StringC;
    to: t.StringC;
    sortBy: t.StringC;
    direction: t.StringC;
    size: t.NumberC;
    filters: t.UnknownC;
    monitorIds: t.ArrayC<t.StringC>;
}>]>;
export type GetCertsParams = t.TypeOf<typeof GetCertsParamsType>;
export declare const CertMonitorType: t.PartialC<{
    name: t.StringC;
    id: t.StringC;
    configId: t.StringC;
    url: t.StringC;
}>;
export declare const CertType: t.IntersectionC<[t.TypeC<{
    monitors: t.ArrayC<t.PartialC<{
        name: t.StringC;
        id: t.StringC;
        configId: t.StringC;
        url: t.StringC;
    }>>;
    sha256: t.StringC;
}>, t.PartialC<{
    not_after: t.StringC;
    not_before: t.StringC;
    common_name: t.StringC;
    issuer: t.StringC;
    sha1: t.StringC;
    monitorName: t.StringC;
    monitorType: t.StringC;
    monitorUrl: t.StringC;
    locationName: t.StringC;
}>]>;
export declare const CertResultType: t.TypeC<{
    certs: t.ArrayC<t.IntersectionC<[t.TypeC<{
        monitors: t.ArrayC<t.PartialC<{
            name: t.StringC;
            id: t.StringC;
            configId: t.StringC;
            url: t.StringC;
        }>>;
        sha256: t.StringC;
    }>, t.PartialC<{
        not_after: t.StringC;
        not_before: t.StringC;
        common_name: t.StringC;
        issuer: t.StringC;
        sha1: t.StringC;
        monitorName: t.StringC;
        monitorType: t.StringC;
        monitorUrl: t.StringC;
        locationName: t.StringC;
    }>]>>;
    total: t.NumberC;
}>;
export type Cert = t.TypeOf<typeof CertType>;
export type CertMonitor = t.TypeOf<typeof CertMonitorType>;
export type CertResult = t.TypeOf<typeof CertResultType>;
