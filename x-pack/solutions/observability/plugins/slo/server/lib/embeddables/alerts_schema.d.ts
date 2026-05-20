import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import type { TypeOf } from '@kbn/config-schema';
declare const sloItemSchema: import("@kbn/config-schema").ObjectType<{
    slo_id: import("@kbn/config-schema").Type<string>;
    slo_instance_id: import("@kbn/config-schema").Type<string>;
}>;
declare const AlertsCustomSchema: import("@kbn/config-schema").ObjectType<{
    slos: import("@kbn/config-schema").Type<Readonly<{} & {
        slo_id: string;
        slo_instance_id: string;
    }>[]>;
}>;
export declare const getAlertsEmbeddableSchema: (getDrilldownsSchema: GetDrilldownsSchemaFnType) => import("@kbn/config-schema").ObjectType<{
    description: import("@kbn/config-schema").Type<string | undefined>;
    hide_title: import("@kbn/config-schema").Type<boolean | undefined>;
    title: import("@kbn/config-schema").Type<string | undefined>;
    hide_border: import("@kbn/config-schema").Type<boolean | undefined>;
    drilldowns: import("@kbn/config-schema").Type<import("@kbn/embeddable-plugin/server").DrilldownState[] | undefined>;
    slos: import("@kbn/config-schema").Type<Readonly<{} & {
        slo_id: string;
        slo_instance_id: string;
    }>[]>;
}>;
export type SloItem = TypeOf<typeof sloItemSchema>;
export type AlertsCustomState = TypeOf<typeof AlertsCustomSchema>;
export type AlertsEmbeddableState = TypeOf<ReturnType<typeof getAlertsEmbeddableSchema>>;
export {};
