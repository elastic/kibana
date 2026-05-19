import type { Logger } from '@kbn/core/server';
import type { ScanDashboardsResult, DashboardReadResponseBody } from '@kbn/dashboard-plugin/server';
import type { SuggestedDashboard, LinkedDashboard } from '@kbn/observability-schema';
import type { InvestigateAlertsClient } from './investigate_alerts_client';
import type { ReferencedPanelManager } from './referenced_panel_manager';
export declare class RelatedDashboardsClient {
    private logger;
    private getDashboard;
    private scanDashboards;
    private alertsClient;
    private alertId;
    private referencedPanelManager;
    dashboardsById: Map<string, Pick<import("@kbn/utility-types").Writable<Readonly<{
        tags?: string[] | undefined;
        filters?: import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
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
        }, "type" | "params" | "field" | "dsl"> & {
            type: import("@kbn/config-schema").Type<"dsl">;
            params: import("@kbn/config-schema").Type<any>;
            field: import("@kbn/config-schema").Type<string | undefined>;
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
        })>[] | undefined;
        query?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        description?: string | undefined;
        project_routing?: string | undefined;
        time_range?: Readonly<{
            mode?: "absolute" | "relative" | undefined;
        } & {
            from: string;
            to: string;
        }> | undefined;
        refresh_interval?: Readonly<{} & {
            value: number;
            pause: boolean;
        }> | undefined;
        access_control?: Readonly<{
            access_mode?: "default" | "write_restricted" | undefined;
        } & {}> | undefined;
    } & {
        options: Readonly<{} & {
            auto_apply_filters: boolean;
            hide_panel_titles: boolean;
            hide_panel_borders: boolean;
            use_margins: boolean;
            sync_colors: boolean;
            sync_tooltips: boolean;
            sync_cursor: boolean;
        }>;
        title: string;
        panels: (Readonly<{
            id?: string | undefined;
        } & {
            config: Readonly<{} & {}>;
            type: string;
            grid: Readonly<{} & {
                y: number;
                w: number;
                h: number;
                x: number;
            }>;
        }> | Readonly<{
            id?: string | undefined;
        } & {
            title: string;
            grid: Readonly<{} & {
                y: number;
            }>;
            panels: Readonly<{
                id?: string | undefined;
            } & {
                config: Readonly<{} & {}>;
                type: string;
                grid: Readonly<{} & {
                    y: number;
                    w: number;
                    h: number;
                    x: number;
                }>;
            }>[];
            collapsed: boolean;
        }>)[];
        pinned_panels: import("@kbn/config-schema/src/types").ObjectResultUnionType<{
            id: import("@kbn/config-schema").Type<string | undefined>;
            width: import("@kbn/config-schema").Type<"small" | "medium" | "large">;
            grow: import("@kbn/config-schema").Type<boolean>;
            type: import("@kbn/config-schema").Type<"esql_control">;
            config: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
                control_type: import("@kbn/config-schema").Type<"STATIC_VALUES">;
                available_options: import("@kbn/config-schema").Type<string[]>;
                selected_options: import("@kbn/config-schema").Type<string[]>;
                single_select: import("@kbn/config-schema").Type<boolean>;
                variable_name: import("@kbn/config-schema").Type<string>;
                variable_type: import("@kbn/config-schema").Type<"fields" | "values" | "functions" | "time_literal" | "multi_values">;
                display_settings: import("@kbn/config-schema").Type<Readonly<{
                    placeholder?: string | undefined;
                    hide_action_bar?: boolean | undefined;
                    hide_exclude?: boolean | undefined;
                    hide_exists?: boolean | undefined;
                    hide_sort?: boolean | undefined;
                } & {}> | undefined>;
                title: import("@kbn/config-schema").Type<string | undefined>;
            } | {
                control_type: import("@kbn/config-schema").Type<"VALUES_FROM_QUERY">;
                esql_query: import("@kbn/config-schema").Type<string>;
                selected_options: import("@kbn/config-schema").Type<string[]>;
                single_select: import("@kbn/config-schema").Type<boolean>;
                variable_name: import("@kbn/config-schema").Type<string>;
                variable_type: import("@kbn/config-schema").Type<"fields" | "values" | "functions" | "time_literal" | "multi_values">;
                display_settings: import("@kbn/config-schema").Type<Readonly<{
                    placeholder?: string | undefined;
                    hide_action_bar?: boolean | undefined;
                    hide_exclude?: boolean | undefined;
                    hide_exists?: boolean | undefined;
                    hide_sort?: boolean | undefined;
                } & {}> | undefined>;
                title: import("@kbn/config-schema").Type<string | undefined>;
            }>>;
        } | {
            id: import("@kbn/config-schema").Type<string | undefined>;
            width: import("@kbn/config-schema").Type<"small" | "medium" | "large">;
            grow: import("@kbn/config-schema").Type<boolean>;
            type: import("@kbn/config-schema").Type<"options_list_control">;
            config: import("@kbn/config-schema").ObjectType<{
                exclude: import("@kbn/config-schema").Type<boolean>;
                exists_selected: import("@kbn/config-schema").Type<boolean>;
                run_past_timeout: import("@kbn/config-schema").Type<boolean>;
                search_technique: import("@kbn/config-schema").Type<"prefix" | "exact" | "wildcard">;
                selected_options: import("@kbn/config-schema").Type<(string | number)[]>;
                single_select: import("@kbn/config-schema").Type<boolean>;
                sort: import("@kbn/config-schema").ObjectType<{
                    by: import("@kbn/config-schema").Type<"_count" | "_key">;
                    direction: import("@kbn/config-schema").Type<"asc" | "desc">;
                }>;
                data_view_id: import("@kbn/config-schema").Type<string>;
                field_name: import("@kbn/config-schema").Type<string>;
                use_global_filters: import("@kbn/config-schema").Type<boolean>;
                ignore_validations: import("@kbn/config-schema").Type<boolean>;
                title: import("@kbn/config-schema").Type<string | undefined>;
                display_settings: import("@kbn/config-schema").Type<Readonly<{
                    placeholder?: string | undefined;
                    hide_action_bar?: boolean | undefined;
                    hide_exclude?: boolean | undefined;
                    hide_exists?: boolean | undefined;
                    hide_sort?: boolean | undefined;
                } & {}> | undefined>;
            }>;
        } | {
            id: import("@kbn/config-schema").Type<string | undefined>;
            width: import("@kbn/config-schema").Type<"small" | "medium" | "large">;
            grow: import("@kbn/config-schema").Type<boolean>;
            type: import("@kbn/config-schema").Type<"range_slider_control">;
            config: import("@kbn/config-schema").ObjectType<{
                value: import("@kbn/config-schema").Type<string[] | undefined>;
                step: import("@kbn/config-schema").Type<number>;
                data_view_id: import("@kbn/config-schema").Type<string>;
                field_name: import("@kbn/config-schema").Type<string>;
                use_global_filters: import("@kbn/config-schema").Type<boolean>;
                ignore_validations: import("@kbn/config-schema").Type<boolean>;
                title: import("@kbn/config-schema").Type<string | undefined>;
            }>;
        } | {
            id: import("@kbn/config-schema").Type<string | undefined>;
            width: import("@kbn/config-schema").Type<"small" | "medium" | "large">;
            grow: import("@kbn/config-schema").Type<boolean>;
            type: import("@kbn/config-schema").Type<"time_slider_control">;
            config: import("@kbn/config-schema").ObjectType<{
                start_percentage_of_time_range: import("@kbn/config-schema").Type<number>;
                end_percentage_of_time_range: import("@kbn/config-schema").Type<number>;
                is_anchored: import("@kbn/config-schema").Type<boolean>;
            }>;
        }>[];
    }>>, "tags" | "description" | "title" | "panels">>;
    private alert;
    constructor(logger: Logger, getDashboard: (id: string) => Promise<DashboardReadResponseBody>, scanDashboards: (page: number, perPage: number) => Promise<ScanDashboardsResult>, alertsClient: InvestigateAlertsClient, alertId: string, referencedPanelManager: ReferencedPanelManager);
    fetchRelatedDashboards(): Promise<{
        suggestedDashboards: SuggestedDashboard[];
        linkedDashboards: LinkedDashboard[];
    }>;
    private getPanelIndicesMap;
    private getPanelFieldsMap;
    private hasSourceField;
    private isLensAttributesState;
    private setAlert;
    private checkAlert;
    private fetchSuggestedDashboards;
    private fetchDashboards;
    private fetchFirst500Dashboards;
    private getDashboardsByIndex;
    private getDashboardsByField;
    private getPanelsByIndex;
    private getPanelsByField;
    private getPanelIndices;
    private getPanelFields;
    private isLensVizAttributes;
    private getRuleQueryIndex;
    private getLinkedDashboards;
    private getLinkedDashboardsByIds;
    private getLinkedDashboardById;
    private getMatchingFields;
    private getScore;
}
