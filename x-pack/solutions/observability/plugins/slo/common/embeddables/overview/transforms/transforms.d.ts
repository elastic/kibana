import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
export declare const getTransforms: (drilldownTransforms: DrilldownTransforms) => {
    transformOut: (storedState: import("../types").OverviewEmbeddableState, panelReferences?: import("@kbn/content-management-utils").Reference[]) => import("@kbn/config-schema/src/types").ObjectResultUnionType<{
        description: import("@kbn/config-schema").Type<string | undefined>;
        hide_title: import("@kbn/config-schema").Type<boolean | undefined>;
        title: import("@kbn/config-schema").Type<string | undefined>;
        hide_border: import("@kbn/config-schema").Type<boolean | undefined>;
        drilldowns: import("@kbn/config-schema").Type<import("@kbn/embeddable-plugin/server").DrilldownState[] | undefined>;
        slo_id: import("@kbn/config-schema").Type<string>;
        slo_instance_id: import("@kbn/config-schema").Type<string>;
        remote_name: import("@kbn/config-schema").Type<string | undefined>;
        overview_mode: import("@kbn/config-schema").Type<"single">;
    } | {
        description: import("@kbn/config-schema").Type<string | undefined>;
        hide_title: import("@kbn/config-schema").Type<boolean | undefined>;
        title: import("@kbn/config-schema").Type<string | undefined>;
        hide_border: import("@kbn/config-schema").Type<boolean | undefined>;
        drilldowns: import("@kbn/config-schema").Type<import("@kbn/embeddable-plugin/server").DrilldownState[] | undefined>;
        group_filters: import("@kbn/config-schema").ObjectType<{
            group_by: import("@kbn/config-schema").Type<"status" | "_index" | "slo.tags" | "slo.indicator.type">;
            groups: import("@kbn/config-schema").Type<string[] | undefined>;
            filters: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "condition"> & {
                type: import("@kbn/config-schema").Type<"condition">;
                condition: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<string | number | boolean>;
                    operator: import("@kbn/config-schema").Type<"is">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").Type<string[] | number[] | boolean[]>;
                    operator: import("@kbn/config-schema").Type<"is_one_of">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "value" | "operator"> & {
                    value: import("@kbn/config-schema").ObjectType<{
                        gte: import("@kbn/config-schema").Type<string | number | undefined>;
                        lte: import("@kbn/config-schema").Type<string | number | undefined>;
                        gt: import("@kbn/config-schema").Type<string | number | undefined>;
                        lt: import("@kbn/config-schema").Type<string | number | undefined>;
                        format: import("@kbn/config-schema").Type<string | undefined>;
                    }>;
                    operator: import("@kbn/config-schema").Type<"range">;
                }) | (Omit<{
                    field: import("@kbn/config-schema").Type<string>;
                    negate: import("@kbn/config-schema").Type<boolean | undefined>;
                }, "operator"> & {
                    operator: import("@kbn/config-schema").Type<"exists">;
                })>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "group"> & {
                type: import("@kbn/config-schema").Type<"group">;
                group: import("@kbn/config-schema").ObjectType<{
                    operator: import("@kbn/config-schema").Type<"and" | "or">;
                    conditions: import("@kbn/config-schema").Type<(import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<string | number | boolean>;
                        operator: import("@kbn/config-schema").Type<"is">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").Type<string[] | number[] | boolean[]>;
                        operator: import("@kbn/config-schema").Type<"is_one_of">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "value" | "operator"> & {
                        value: import("@kbn/config-schema").ObjectType<{
                            gte: import("@kbn/config-schema").Type<string | number | undefined>;
                            lte: import("@kbn/config-schema").Type<string | number | undefined>;
                            gt: import("@kbn/config-schema").Type<string | number | undefined>;
                            lt: import("@kbn/config-schema").Type<string | number | undefined>;
                            format: import("@kbn/config-schema").Type<string | undefined>;
                        }>;
                        operator: import("@kbn/config-schema").Type<"range">;
                    }) | (Omit<{
                        field: import("@kbn/config-schema").Type<string>;
                        negate: import("@kbn/config-schema").Type<boolean | undefined>;
                    }, "operator"> & {
                        operator: import("@kbn/config-schema").Type<"exists">;
                    })> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[]>;
                }>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "field" | "params" | "dsl"> & {
                type: import("@kbn/config-schema").Type<"dsl">;
                field: import("@kbn/config-schema").Type<string | undefined>;
                params: import("@kbn/config-schema").Type<any>;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            }) | (Omit<{
                disabled: import("@kbn/config-schema").Type<boolean | undefined>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
                controlled_by: import("@kbn/config-schema").Type<string | undefined>;
                data_view_id: import("@kbn/config-schema").Type<string | undefined>;
                label: import("@kbn/config-schema").Type<string | undefined>;
                is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "type" | "dsl"> & {
                type: import("@kbn/config-schema").Type<"spatial">;
                dsl: import("@kbn/config-schema").Type<Record<string, any>>;
            })>[] | undefined>;
            kql_query: import("@kbn/config-schema").Type<string | undefined>;
        }>;
        overview_mode: import("@kbn/config-schema").Type<"groups">;
    }> & {
        drilldowns?: Array<{
            label: string;
            trigger: string;
            type: string;
        }>;
    };
    transformIn: <State extends import("@kbn/embeddable-plugin/server").SerializedDrilldowns>(state: State) => {
        state: State;
        references: never[];
    } | {
        state: State & {
            drilldowns: import("@kbn/embeddable-plugin/server").DrilldownState[];
        };
        references: import("@kbn/content-management-utils").Reference[];
    };
};
