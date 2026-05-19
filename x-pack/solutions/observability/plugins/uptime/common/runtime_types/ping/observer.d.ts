import * as t from 'io-ts';
export declare const ObserverCodec: t.PartialC<{
    hostname: t.StringC;
    ip: t.ArrayC<t.StringC>;
    mac: t.ArrayC<t.StringC>;
    name: t.UnionC<[t.StringC, t.UndefinedC]>;
    geo: t.PartialC<{
        name: t.StringC;
        continent_name: t.StringC;
        city_name: t.StringC;
        country_iso_code: t.StringC;
        location: t.UnionC<[t.StringC, t.PartialC<{
            lat: t.NumberC;
            lon: t.NumberC;
        }>, t.PartialC<{
            lat: t.StringC;
            lon: t.StringC;
        }>]>;
    }>;
}>;
