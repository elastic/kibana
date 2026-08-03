import * as rt from 'io-ts';
export declare const SupportedEntityTypesRT: rt.KeyofC<{
    host: null;
    pod: null;
}>;
export declare const EntityTypeRT: rt.TypeC<{
    entityType: rt.KeyofC<{
        host: null;
        pod: null;
    }>;
}>;
export type EntityTypes = rt.TypeOf<typeof SupportedEntityTypesRT>;
