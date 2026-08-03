import * as rt from 'io-ts';
export declare const mappingRuntimeFieldTypeRT: rt.KeyofC<{
    boolean: null;
    date: null;
    double: null;
    geo_point: null;
    ip: null;
    keyword: null;
    long: null;
}>;
export declare const mappingRuntimeFieldRT: rt.IntersectionC<[rt.PartialC<{
    format: rt.StringC;
    script: rt.UnionC<[rt.IntersectionC<[rt.PartialC<{
        params: rt.RecordC<rt.StringC, rt.AnyC>;
    }>, rt.PartialC<{
        lang: rt.StringC;
        options: rt.RecordC<rt.StringC, rt.StringC>;
    }>, rt.TypeC<{
        source: rt.StringC;
    }>]>, rt.StringC, rt.IntersectionC<[rt.PartialC<{
        params: rt.RecordC<rt.StringC, rt.AnyC>;
    }>, rt.TypeC<{
        id: rt.StringC;
    }>]>]>;
}>, rt.TypeC<{
    type: rt.KeyofC<{
        boolean: null;
        date: null;
        double: null;
        geo_point: null;
        ip: null;
        keyword: null;
        long: null;
    }>;
}>]>;
