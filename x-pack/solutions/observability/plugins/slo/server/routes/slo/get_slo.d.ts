export declare const getSLORoute: Record<"GET /api/observability/slos/{id} 2023-10-31", import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/observability/slos/{id} 2023-10-31", import("io-ts").IntersectionC<[import("io-ts").TypeC<{
    path: import("io-ts").TypeC<{
        id: import("io-ts").Type<string, string, unknown>;
    }>;
}>, import("io-ts").PartialC<{
    query: import("io-ts").PartialC<{
        instanceId: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>;
        remoteName: import("io-ts").StringC;
    }>;
}>]>, import("../types").SLORouteHandlerResources, {
    id: string;
    name: string;
    description: string;
    indicator: {
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
    };
    timeWindow: {
        duration: string;
        type: "rolling";
    } | {
        duration: string;
        type: "calendarAligned";
    };
    budgetingMethod: "occurrences" | "timeslices";
    objective: {
        target: number;
    } & {
        timesliceTarget?: number | undefined;
        timesliceWindow?: string | undefined;
    };
    settings: {
        syncDelay: string;
        frequency: string;
        preventInitialBackfill: boolean;
    } & {
        syncField?: string | null | undefined;
    };
    revision: number;
    enabled: boolean;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    groupBy: string | string[];
    version: number;
} & {
    createdBy?: string | undefined;
    updatedBy?: string | undefined;
} & {
    artifacts?: {
        dashboards?: {
            id: string;
        }[] | undefined;
    } | undefined;
} & {
    summary: {
        status: "NO_DATA" | "HEALTHY" | "DEGRADING" | "VIOLATED";
        sliValue: number;
        errorBudget: {
            initial: number;
            consumed: number;
            remaining: number;
            isEstimated: boolean;
        };
        fiveMinuteBurnRate: number;
        oneHourBurnRate: number;
        oneDayBurnRate: number;
    } & {
        summaryUpdatedAt?: string | null | undefined;
    };
    groupings: {
        [x: string]: string | number;
    };
    instanceId: string;
} & {
    meta?: {
        synthetics?: {
            monitorId: string;
            locationId: string;
            configId: string;
        } | undefined;
    } | undefined;
    remote?: {
        remoteName: string;
        kibanaUrl: string;
    } | undefined;
}, undefined>>;
