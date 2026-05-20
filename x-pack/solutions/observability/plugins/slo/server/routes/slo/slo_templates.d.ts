import { type FindSLOTemplatesResponse, type FindSLOTemplateTagsResponse } from '@kbn/slo-schema';
export declare const getSLOTemplateRoute: Record<"GET /api/observability/slo_templates/{templateId}", import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/observability/slo_templates/{templateId}", import("io-ts").TypeC<{
    path: import("io-ts").TypeC<{
        templateId: import("io-ts").StringC;
    }>;
}>, import("../types").SLORouteHandlerResources, {
    templateId: string;
} & {
    name?: string | undefined;
    description?: string | undefined;
    indicator?: {
        type: "sli.apm.transactionDuration";
        params: {
            environment: string;
            service: string;
            transactionType: string;
            transactionName: string;
            threshold: number;
            index: string;
        } & {
            filter?: string | {
                kqlQuery: string;
                filters: ({
                    meta: {
                        alias?: string | null | undefined;
                        disabled?: boolean | undefined;
                        negate?: boolean | undefined;
                        controlledBy?: string | undefined;
                        group?: string | undefined;
                        index?: string | undefined;
                        isMultiIndex?: boolean | undefined;
                        type?: string | undefined;
                        key?: string | undefined;
                        field?: string | undefined;
                        params?: any;
                        value?: string | undefined;
                    };
                    query: {
                        [x: string]: any;
                    };
                } & {
                    $state?: any;
                })[];
            } | undefined;
            dataViewId?: string | undefined;
        };
    } | {
        type: "sli.apm.transactionErrorRate";
        params: {
            environment: string;
            service: string;
            transactionType: string;
            transactionName: string;
            index: string;
        } & {
            filter?: string | {
                kqlQuery: string;
                filters: ({
                    meta: {
                        alias?: string | null | undefined;
                        disabled?: boolean | undefined;
                        negate?: boolean | undefined;
                        controlledBy?: string | undefined;
                        group?: string | undefined;
                        index?: string | undefined;
                        isMultiIndex?: boolean | undefined;
                        type?: string | undefined;
                        key?: string | undefined;
                        field?: string | undefined;
                        params?: any;
                        value?: string | undefined;
                    };
                    query: {
                        [x: string]: any;
                    };
                } & {
                    $state?: any;
                })[];
            } | undefined;
            dataViewId?: string | undefined;
        };
    } | {
        type: "sli.synthetics.availability";
        params: {
            monitorIds: {
                value: string;
                label: string;
            }[];
            index: string;
        } & {
            tags?: {
                value: string;
                label: string;
            }[] | undefined;
            projects?: {
                value: string;
                label: string;
            }[] | undefined;
            filter?: string | {
                kqlQuery: string;
                filters: ({
                    meta: {
                        alias?: string | null | undefined;
                        disabled?: boolean | undefined;
                        negate?: boolean | undefined;
                        controlledBy?: string | undefined;
                        group?: string | undefined;
                        index?: string | undefined;
                        isMultiIndex?: boolean | undefined;
                        type?: string | undefined;
                        key?: string | undefined;
                        field?: string | undefined;
                        params?: any;
                        value?: string | undefined;
                    };
                    query: {
                        [x: string]: any;
                    };
                } & {
                    $state?: any;
                })[];
            } | undefined;
            dataViewId?: string | undefined;
        };
    } | {
        type: "sli.kql.custom";
        params: {
            index: string;
            good: string | {
                kqlQuery: string;
                filters: ({
                    meta: {
                        alias?: string | null | undefined;
                        disabled?: boolean | undefined;
                        negate?: boolean | undefined;
                        controlledBy?: string | undefined;
                        group?: string | undefined;
                        index?: string | undefined;
                        isMultiIndex?: boolean | undefined;
                        type?: string | undefined;
                        key?: string | undefined;
                        field?: string | undefined;
                        params?: any;
                        value?: string | undefined;
                    };
                    query: {
                        [x: string]: any;
                    };
                } & {
                    $state?: any;
                })[];
            };
            total: string | {
                kqlQuery: string;
                filters: ({
                    meta: {
                        alias?: string | null | undefined;
                        disabled?: boolean | undefined;
                        negate?: boolean | undefined;
                        controlledBy?: string | undefined;
                        group?: string | undefined;
                        index?: string | undefined;
                        isMultiIndex?: boolean | undefined;
                        type?: string | undefined;
                        key?: string | undefined;
                        field?: string | undefined;
                        params?: any;
                        value?: string | undefined;
                    };
                    query: {
                        [x: string]: any;
                    };
                } & {
                    $state?: any;
                })[];
            };
            timestampField: string;
        } & {
            filter?: string | {
                kqlQuery: string;
                filters: ({
                    meta: {
                        alias?: string | null | undefined;
                        disabled?: boolean | undefined;
                        negate?: boolean | undefined;
                        controlledBy?: string | undefined;
                        group?: string | undefined;
                        index?: string | undefined;
                        isMultiIndex?: boolean | undefined;
                        type?: string | undefined;
                        key?: string | undefined;
                        field?: string | undefined;
                        params?: any;
                        value?: string | undefined;
                    };
                    query: {
                        [x: string]: any;
                    };
                } & {
                    $state?: any;
                })[];
            } | undefined;
            dataViewId?: string | undefined;
        };
    } | {
        type: "sli.metric.custom";
        params: {
            index: string;
            good: {
                metrics: (({
                    name: string;
                    aggregation: "sum";
                    field: string;
                } & {
                    filter?: string | {
                        kqlQuery: string;
                        filters: ({
                            meta: {
                                alias?: string | null | undefined;
                                disabled?: boolean | undefined;
                                negate?: boolean | undefined;
                                controlledBy?: string | undefined;
                                group?: string | undefined;
                                index?: string | undefined;
                                isMultiIndex?: boolean | undefined;
                                type?: string | undefined;
                                key?: string | undefined;
                                field?: string | undefined;
                                params?: any;
                                value?: string | undefined;
                            };
                            query: {
                                [x: string]: any;
                            };
                        } & {
                            $state?: any;
                        })[];
                    } | undefined;
                }) | ({
                    name: string;
                    aggregation: "doc_count";
                } & {
                    filter?: string | {
                        kqlQuery: string;
                        filters: ({
                            meta: {
                                alias?: string | null | undefined;
                                disabled?: boolean | undefined;
                                negate?: boolean | undefined;
                                controlledBy?: string | undefined;
                                group?: string | undefined;
                                index?: string | undefined;
                                isMultiIndex?: boolean | undefined;
                                type?: string | undefined;
                                key?: string | undefined;
                                field?: string | undefined;
                                params?: any;
                                value?: string | undefined;
                            };
                            query: {
                                [x: string]: any;
                            };
                        } & {
                            $state?: any;
                        })[];
                    } | undefined;
                }))[];
                equation: string;
            };
            total: {
                metrics: (({
                    name: string;
                    aggregation: "sum";
                    field: string;
                } & {
                    filter?: string | {
                        kqlQuery: string;
                        filters: ({
                            meta: {
                                alias?: string | null | undefined;
                                disabled?: boolean | undefined;
                                negate?: boolean | undefined;
                                controlledBy?: string | undefined;
                                group?: string | undefined;
                                index?: string | undefined;
                                isMultiIndex?: boolean | undefined;
                                type?: string | undefined;
                                key?: string | undefined;
                                field?: string | undefined;
                                params?: any;
                                value?: string | undefined;
                            };
                            query: {
                                [x: string]: any;
                            };
                        } & {
                            $state?: any;
                        })[];
                    } | undefined;
                }) | ({
                    name: string;
                    aggregation: "doc_count";
                } & {
                    filter?: string | {
                        kqlQuery: string;
                        filters: ({
                            meta: {
                                alias?: string | null | undefined;
                                disabled?: boolean | undefined;
                                negate?: boolean | undefined;
                                controlledBy?: string | undefined;
                                group?: string | undefined;
                                index?: string | undefined;
                                isMultiIndex?: boolean | undefined;
                                type?: string | undefined;
                                key?: string | undefined;
                                field?: string | undefined;
                                params?: any;
                                value?: string | undefined;
                            };
                            query: {
                                [x: string]: any;
                            };
                        } & {
                            $state?: any;
                        })[];
                    } | undefined;
                }))[];
                equation: string;
            };
            timestampField: string;
        } & {
            filter?: string | {
                kqlQuery: string;
                filters: ({
                    meta: {
                        alias?: string | null | undefined;
                        disabled?: boolean | undefined;
                        negate?: boolean | undefined;
                        controlledBy?: string | undefined;
                        group?: string | undefined;
                        index?: string | undefined;
                        isMultiIndex?: boolean | undefined;
                        type?: string | undefined;
                        key?: string | undefined;
                        field?: string | undefined;
                        params?: any;
                        value?: string | undefined;
                    };
                    query: {
                        [x: string]: any;
                    };
                } & {
                    $state?: any;
                })[];
            } | undefined;
            dataViewId?: string | undefined;
        };
    } | {
        type: "sli.metric.timeslice";
        params: {
            index: string;
            metric: {
                metrics: (({
                    name: string;
                    aggregation: "min" | "max" | "sum" | "avg" | "cardinality" | "last_value" | "std_deviation";
                    field: string;
                } & {
                    filter?: string | {
                        kqlQuery: string;
                        filters: ({
                            meta: {
                                alias?: string | null | undefined;
                                disabled?: boolean | undefined;
                                negate?: boolean | undefined;
                                controlledBy?: string | undefined;
                                group?: string | undefined;
                                index?: string | undefined;
                                isMultiIndex?: boolean | undefined;
                                type?: string | undefined;
                                key?: string | undefined;
                                field?: string | undefined;
                                params?: any;
                                value?: string | undefined;
                            };
                            query: {
                                [x: string]: any;
                            };
                        } & {
                            $state?: any;
                        })[];
                    } | undefined;
                }) | ({
                    name: string;
                    aggregation: "doc_count";
                } & {
                    filter?: string | {
                        kqlQuery: string;
                        filters: ({
                            meta: {
                                alias?: string | null | undefined;
                                disabled?: boolean | undefined;
                                negate?: boolean | undefined;
                                controlledBy?: string | undefined;
                                group?: string | undefined;
                                index?: string | undefined;
                                isMultiIndex?: boolean | undefined;
                                type?: string | undefined;
                                key?: string | undefined;
                                field?: string | undefined;
                                params?: any;
                                value?: string | undefined;
                            };
                            query: {
                                [x: string]: any;
                            };
                        } & {
                            $state?: any;
                        })[];
                    } | undefined;
                }) | ({
                    name: string;
                    aggregation: "percentile";
                    field: string;
                    percentile: number;
                } & {
                    filter?: string | {
                        kqlQuery: string;
                        filters: ({
                            meta: {
                                alias?: string | null | undefined;
                                disabled?: boolean | undefined;
                                negate?: boolean | undefined;
                                controlledBy?: string | undefined;
                                group?: string | undefined;
                                index?: string | undefined;
                                isMultiIndex?: boolean | undefined;
                                type?: string | undefined;
                                key?: string | undefined;
                                field?: string | undefined;
                                params?: any;
                                value?: string | undefined;
                            };
                            query: {
                                [x: string]: any;
                            };
                        } & {
                            $state?: any;
                        })[];
                    } | undefined;
                }))[];
                equation: string;
                threshold: number;
                comparator: "GT" | "GTE" | "LT" | "LTE";
            };
            timestampField: string;
        } & {
            filter?: string | {
                kqlQuery: string;
                filters: ({
                    meta: {
                        alias?: string | null | undefined;
                        disabled?: boolean | undefined;
                        negate?: boolean | undefined;
                        controlledBy?: string | undefined;
                        group?: string | undefined;
                        index?: string | undefined;
                        isMultiIndex?: boolean | undefined;
                        type?: string | undefined;
                        key?: string | undefined;
                        field?: string | undefined;
                        params?: any;
                        value?: string | undefined;
                    };
                    query: {
                        [x: string]: any;
                    };
                } & {
                    $state?: any;
                })[];
            } | undefined;
            dataViewId?: string | undefined;
        };
    } | {
        type: "sli.histogram.custom";
        params: {
            index: string;
            timestampField: string;
            good: ({
                field: string;
                aggregation: "value_count";
            } & {
                filter?: string | {
                    kqlQuery: string;
                    filters: ({
                        meta: {
                            alias?: string | null | undefined;
                            disabled?: boolean | undefined;
                            negate?: boolean | undefined;
                            controlledBy?: string | undefined;
                            group?: string | undefined;
                            index?: string | undefined;
                            isMultiIndex?: boolean | undefined;
                            type?: string | undefined;
                            key?: string | undefined;
                            field?: string | undefined;
                            params?: any;
                            value?: string | undefined;
                        };
                        query: {
                            [x: string]: any;
                        };
                    } & {
                        $state?: any;
                    })[];
                } | undefined;
            }) | ({
                field: string;
                aggregation: "range";
                from: number;
                to: number;
            } & {
                filter?: string | {
                    kqlQuery: string;
                    filters: ({
                        meta: {
                            alias?: string | null | undefined;
                            disabled?: boolean | undefined;
                            negate?: boolean | undefined;
                            controlledBy?: string | undefined;
                            group?: string | undefined;
                            index?: string | undefined;
                            isMultiIndex?: boolean | undefined;
                            type?: string | undefined;
                            key?: string | undefined;
                            field?: string | undefined;
                            params?: any;
                            value?: string | undefined;
                        };
                        query: {
                            [x: string]: any;
                        };
                    } & {
                        $state?: any;
                    })[];
                } | undefined;
            });
            total: ({
                field: string;
                aggregation: "value_count";
            } & {
                filter?: string | {
                    kqlQuery: string;
                    filters: ({
                        meta: {
                            alias?: string | null | undefined;
                            disabled?: boolean | undefined;
                            negate?: boolean | undefined;
                            controlledBy?: string | undefined;
                            group?: string | undefined;
                            index?: string | undefined;
                            isMultiIndex?: boolean | undefined;
                            type?: string | undefined;
                            key?: string | undefined;
                            field?: string | undefined;
                            params?: any;
                            value?: string | undefined;
                        };
                        query: {
                            [x: string]: any;
                        };
                    } & {
                        $state?: any;
                    })[];
                } | undefined;
            }) | ({
                field: string;
                aggregation: "range";
                from: number;
                to: number;
            } & {
                filter?: string | {
                    kqlQuery: string;
                    filters: ({
                        meta: {
                            alias?: string | null | undefined;
                            disabled?: boolean | undefined;
                            negate?: boolean | undefined;
                            controlledBy?: string | undefined;
                            group?: string | undefined;
                            index?: string | undefined;
                            isMultiIndex?: boolean | undefined;
                            type?: string | undefined;
                            key?: string | undefined;
                            field?: string | undefined;
                            params?: any;
                            value?: string | undefined;
                        };
                        query: {
                            [x: string]: any;
                        };
                    } & {
                        $state?: any;
                    })[];
                } | undefined;
            });
        } & {
            filter?: string | {
                kqlQuery: string;
                filters: ({
                    meta: {
                        alias?: string | null | undefined;
                        disabled?: boolean | undefined;
                        negate?: boolean | undefined;
                        controlledBy?: string | undefined;
                        group?: string | undefined;
                        index?: string | undefined;
                        isMultiIndex?: boolean | undefined;
                        type?: string | undefined;
                        key?: string | undefined;
                        field?: string | undefined;
                        params?: any;
                        value?: string | undefined;
                    };
                    query: {
                        [x: string]: any;
                    };
                } & {
                    $state?: any;
                })[];
            } | undefined;
            dataViewId?: string | undefined;
        };
    } | undefined;
    budgetingMethod?: "occurrences" | "timeslices" | undefined;
    objective?: ({
        target: number;
    } & {
        timesliceTarget?: number | undefined;
        timesliceWindow?: string | undefined;
    }) | undefined;
    timeWindow?: {
        duration: string;
        type: "rolling";
    } | {
        duration: string;
        type: "calendarAligned";
    } | undefined;
    tags?: string[] | undefined;
    settings?: {
        syncDelay?: string | undefined;
        frequency?: string | undefined;
        preventInitialBackfill?: boolean | undefined;
        syncField?: string | null | undefined;
    } | undefined;
    groupBy?: string[] | undefined;
    artifacts?: {
        dashboards?: {
            id: string;
        }[] | undefined;
    } | undefined;
}, undefined>>;
export declare const findSLOTemplatesRoute: Record<"GET /api/observability/slo_templates", import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/observability/slo_templates", import("io-ts").TypeC<{
    query: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").PartialC<{
        search: import("io-ts").StringC;
        tags: import("io-ts").Type<string[], string, unknown>;
        page: import("io-ts").Type<number, number, unknown>;
        perPage: import("io-ts").Type<number, number, unknown>;
    }>]>;
}>, import("../types").SLORouteHandlerResources, FindSLOTemplatesResponse, undefined>>;
export declare const findSLOTemplateTagsRoute: Record<"GET /api/observability/slo_templates/_tags", {
    endpoint: "GET /api/observability/slo_templates/_tags";
    handler: (options: import("../types").SLORoutesDependencies & import("@kbn/server-route-repository-utils").DefaultRouteHandlerResources) => Promise<FindSLOTemplateTagsResponse>;
    security: import("@kbn/core/server").RouteSecurity;
}>;
