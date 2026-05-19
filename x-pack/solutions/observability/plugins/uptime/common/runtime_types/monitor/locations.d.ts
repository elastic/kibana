import * as t from 'io-ts';
export declare const MonitorLocationType: t.TypeC<{
    up_history: t.NumberC;
    down_history: t.NumberC;
    timestamp: t.StringC;
    summary: t.PartialC<{
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
    geo: t.IntersectionC<[t.TypeC<{
        name: t.StringC;
    }>, t.PartialC<{
        location: t.TypeC<{
            lat: t.StringC;
            lon: t.StringC;
        }>;
    }>]>;
}>;
export type MonitorLocation = t.TypeOf<typeof MonitorLocationType>;
export declare const MonitorLocationsType: t.IntersectionC<[t.TypeC<{
    monitorId: t.StringC;
    up_history: t.NumberC;
    down_history: t.NumberC;
}>, t.PartialC<{
    locations: t.ArrayC<t.TypeC<{
        up_history: t.NumberC;
        down_history: t.NumberC;
        timestamp: t.StringC;
        summary: t.PartialC<{
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
        geo: t.IntersectionC<[t.TypeC<{
            name: t.StringC;
        }>, t.PartialC<{
            location: t.TypeC<{
                lat: t.StringC;
                lon: t.StringC;
            }>;
        }>]>;
    }>>;
}>]>;
export type MonitorLocations = t.TypeOf<typeof MonitorLocationsType>;
