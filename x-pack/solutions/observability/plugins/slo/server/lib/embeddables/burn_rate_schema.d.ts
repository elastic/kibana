import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import type { TypeOf } from '@kbn/config-schema';
declare const BurnRateCustomSchema: import("@kbn/config-schema").ObjectType<{
    slo_id: import("@kbn/config-schema").Type<string>;
    slo_instance_id: import("@kbn/config-schema").Type<string>;
    duration: import("@kbn/config-schema").Type<string>;
}>;
export declare const getBurnRateEmbeddableSchema: (getDrilldownsSchema: GetDrilldownsSchemaFnType) => import("@kbn/config-schema").ObjectType<{
    description: import("@kbn/config-schema").Type<string | undefined>;
    hide_title: import("@kbn/config-schema").Type<boolean | undefined>;
    title: import("@kbn/config-schema").Type<string | undefined>;
    hide_border: import("@kbn/config-schema").Type<boolean | undefined>;
    drilldowns: import("@kbn/config-schema").Type<import("@kbn/embeddable-plugin/server").DrilldownState[] | undefined>;
    slo_id: import("@kbn/config-schema").Type<string>;
    slo_instance_id: import("@kbn/config-schema").Type<string>;
    duration: import("@kbn/config-schema").Type<string>;
}>;
export type BurnRateCustomState = TypeOf<typeof BurnRateCustomSchema>;
export type BurnRateEmbeddableState = TypeOf<ReturnType<typeof getBurnRateEmbeddableSchema>>;
export {};
