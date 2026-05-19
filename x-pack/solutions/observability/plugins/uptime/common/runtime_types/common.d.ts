import * as t from 'io-ts';
export declare const LocationType: t.TypeC<{
    lat: t.StringC;
    lon: t.StringC;
}>;
export declare const CheckGeoType: t.IntersectionC<[t.TypeC<{
    name: t.StringC;
}>, t.PartialC<{
    location: t.TypeC<{
        lat: t.StringC;
        lon: t.StringC;
    }>;
}>]>;
export declare const SummaryType: t.PartialC<{
    up: t.NumberC;
    down: t.NumberC;
    geo: t.IntersectionC<[t.TypeC<{
        name: t.StringC;
    }>, t.PartialC<{
        location: t.TypeC<{
            lat: t.StringC;
            lon: t.StringC;
        }>;
    }>]>;
}>;
export declare const StatesIndexStatusType: t.TypeC<{
    indexExists: t.BooleanC;
    indices: t.StringC;
}>;
export declare const DateRangeType: t.TypeC<{
    from: t.StringC;
    to: t.StringC;
}>;
export type Summary = t.TypeOf<typeof SummaryType>;
export type Location = t.TypeOf<typeof LocationType>;
export type GeoPoint = t.TypeOf<typeof CheckGeoType>;
export type StatesIndexStatus = t.TypeOf<typeof StatesIndexStatusType>;
export type DateRange = t.TypeOf<typeof DateRangeType>;
