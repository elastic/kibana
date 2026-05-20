export declare const updateSLORoute: Record<"PUT /api/observability/slos/{id} 2023-10-31", import("@kbn/server-route-repository-utils").ServerRoute<"PUT /api/observability/slos/{id} 2023-10-31", import("io-ts").TypeC<{
    path: import("io-ts").TypeC<{
        id: import("io-ts").Type<string, string, unknown>;
    }>;
    body: import("io-ts").PartialC<{
        name: import("io-ts").StringC;
        description: import("io-ts").StringC;
        indicator: import("io-ts").UnionC<[import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<"sli.apm.transactionDuration">;
            params: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>;
                service: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>;
                transactionType: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>;
                transactionName: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>;
                threshold: import("io-ts").NumberC;
                index: import("io-ts").StringC;
            }>, import("io-ts").PartialC<{
                filter: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").TypeC<{
                    kqlQuery: import("io-ts").StringC;
                    filters: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                        meta: import("io-ts").PartialC<{
                            alias: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                            disabled: import("io-ts").BooleanC;
                            negate: import("io-ts").BooleanC;
                            controlledBy: import("io-ts").StringC;
                            group: import("io-ts").StringC;
                            index: import("io-ts").StringC;
                            isMultiIndex: import("io-ts").BooleanC;
                            type: import("io-ts").StringC;
                            key: import("io-ts").StringC;
                            field: import("io-ts").StringC;
                            params: import("io-ts").AnyC;
                            value: import("io-ts").StringC;
                        }>;
                        query: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").AnyC>;
                    }>, import("io-ts").PartialC<{
                        $state: import("io-ts").AnyC;
                    }>]>>;
                }>]>;
                dataViewId: import("io-ts").StringC;
            }>]>;
        }>, import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<"sli.apm.transactionErrorRate">;
            params: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>;
                service: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>;
                transactionType: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>;
                transactionName: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>;
                index: import("io-ts").StringC;
            }>, import("io-ts").PartialC<{
                filter: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").TypeC<{
                    kqlQuery: import("io-ts").StringC;
                    filters: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                        meta: import("io-ts").PartialC<{
                            alias: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                            disabled: import("io-ts").BooleanC;
                            negate: import("io-ts").BooleanC;
                            controlledBy: import("io-ts").StringC;
                            group: import("io-ts").StringC;
                            index: import("io-ts").StringC;
                            isMultiIndex: import("io-ts").BooleanC;
                            type: import("io-ts").StringC;
                            key: import("io-ts").StringC;
                            field: import("io-ts").StringC;
                            params: import("io-ts").AnyC;
                            value: import("io-ts").StringC;
                        }>;
                        query: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").AnyC>;
                    }>, import("io-ts").PartialC<{
                        $state: import("io-ts").AnyC;
                    }>]>>;
                }>]>;
                dataViewId: import("io-ts").StringC;
            }>]>;
        }>, import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<"sli.synthetics.availability">;
            params: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                monitorIds: import("io-ts").ArrayC<import("io-ts").TypeC<{
                    value: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>;
                    label: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>;
                }>>;
                index: import("io-ts").StringC;
            }>, import("io-ts").PartialC<{
                tags: import("io-ts").ArrayC<import("io-ts").TypeC<{
                    value: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>;
                    label: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>;
                }>>;
                projects: import("io-ts").ArrayC<import("io-ts").TypeC<{
                    value: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>;
                    label: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>;
                }>>;
                filter: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").TypeC<{
                    kqlQuery: import("io-ts").StringC;
                    filters: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                        meta: import("io-ts").PartialC<{
                            alias: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                            disabled: import("io-ts").BooleanC;
                            negate: import("io-ts").BooleanC;
                            controlledBy: import("io-ts").StringC;
                            group: import("io-ts").StringC;
                            index: import("io-ts").StringC;
                            isMultiIndex: import("io-ts").BooleanC;
                            type: import("io-ts").StringC;
                            key: import("io-ts").StringC;
                            field: import("io-ts").StringC;
                            params: import("io-ts").AnyC;
                            value: import("io-ts").StringC;
                        }>;
                        query: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").AnyC>;
                    }>, import("io-ts").PartialC<{
                        $state: import("io-ts").AnyC;
                    }>]>>;
                }>]>;
                dataViewId: import("io-ts").StringC;
            }>]>;
        }>, import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<"sli.kql.custom">;
            params: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                index: import("io-ts").StringC;
                good: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").TypeC<{
                    kqlQuery: import("io-ts").StringC;
                    filters: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                        meta: import("io-ts").PartialC<{
                            alias: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                            disabled: import("io-ts").BooleanC;
                            negate: import("io-ts").BooleanC;
                            controlledBy: import("io-ts").StringC;
                            group: import("io-ts").StringC;
                            index: import("io-ts").StringC;
                            isMultiIndex: import("io-ts").BooleanC;
                            type: import("io-ts").StringC;
                            key: import("io-ts").StringC;
                            field: import("io-ts").StringC;
                            params: import("io-ts").AnyC;
                            value: import("io-ts").StringC;
                        }>;
                        query: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").AnyC>;
                    }>, import("io-ts").PartialC<{
                        $state: import("io-ts").AnyC;
                    }>]>>;
                }>]>;
                total: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").TypeC<{
                    kqlQuery: import("io-ts").StringC;
                    filters: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                        meta: import("io-ts").PartialC<{
                            alias: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                            disabled: import("io-ts").BooleanC;
                            negate: import("io-ts").BooleanC;
                            controlledBy: import("io-ts").StringC;
                            group: import("io-ts").StringC;
                            index: import("io-ts").StringC;
                            isMultiIndex: import("io-ts").BooleanC;
                            type: import("io-ts").StringC;
                            key: import("io-ts").StringC;
                            field: import("io-ts").StringC;
                            params: import("io-ts").AnyC;
                            value: import("io-ts").StringC;
                        }>;
                        query: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").AnyC>;
                    }>, import("io-ts").PartialC<{
                        $state: import("io-ts").AnyC;
                    }>]>>;
                }>]>;
                timestampField: import("io-ts").StringC;
            }>, import("io-ts").PartialC<{
                filter: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").TypeC<{
                    kqlQuery: import("io-ts").StringC;
                    filters: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                        meta: import("io-ts").PartialC<{
                            alias: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                            disabled: import("io-ts").BooleanC;
                            negate: import("io-ts").BooleanC;
                            controlledBy: import("io-ts").StringC;
                            group: import("io-ts").StringC;
                            index: import("io-ts").StringC;
                            isMultiIndex: import("io-ts").BooleanC;
                            type: import("io-ts").StringC;
                            key: import("io-ts").StringC;
                            field: import("io-ts").StringC;
                            params: import("io-ts").AnyC;
                            value: import("io-ts").StringC;
                        }>;
                        query: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").AnyC>;
                    }>, import("io-ts").PartialC<{
                        $state: import("io-ts").AnyC;
                    }>]>>;
                }>]>;
                dataViewId: import("io-ts").StringC;
            }>]>;
        }>, import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<"sli.metric.custom">;
            params: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                index: import("io-ts").StringC;
                good: import("io-ts").TypeC<{
                    metrics: import("io-ts").ArrayC<import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                        name: import("io-ts").StringC;
                        aggregation: import("io-ts").LiteralC<"sum">;
                        field: import("io-ts").StringC;
                    }>, import("io-ts").PartialC<{
                        filter: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").TypeC<{
                            kqlQuery: import("io-ts").StringC;
                            filters: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                                meta: import("io-ts").PartialC<{
                                    alias: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                                    disabled: import("io-ts").BooleanC;
                                    negate: import("io-ts").BooleanC;
                                    controlledBy: import("io-ts").StringC;
                                    group: import("io-ts").StringC;
                                    index: import("io-ts").StringC;
                                    isMultiIndex: import("io-ts").BooleanC;
                                    type: import("io-ts").StringC;
                                    key: import("io-ts").StringC;
                                    field: import("io-ts").StringC;
                                    params: import("io-ts").AnyC;
                                    value: import("io-ts").StringC;
                                }>;
                                query: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").AnyC>;
                            }>, import("io-ts").PartialC<{
                                $state: import("io-ts").AnyC;
                            }>]>>;
                        }>]>;
                    }>]>, import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                        name: import("io-ts").StringC;
                        aggregation: import("io-ts").LiteralC<"doc_count">;
                    }>, import("io-ts").PartialC<{
                        filter: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").TypeC<{
                            kqlQuery: import("io-ts").StringC;
                            filters: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                                meta: import("io-ts").PartialC<{
                                    alias: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                                    disabled: import("io-ts").BooleanC;
                                    negate: import("io-ts").BooleanC;
                                    controlledBy: import("io-ts").StringC;
                                    group: import("io-ts").StringC;
                                    index: import("io-ts").StringC;
                                    isMultiIndex: import("io-ts").BooleanC;
                                    type: import("io-ts").StringC;
                                    key: import("io-ts").StringC;
                                    field: import("io-ts").StringC;
                                    params: import("io-ts").AnyC;
                                    value: import("io-ts").StringC;
                                }>;
                                query: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").AnyC>;
                            }>, import("io-ts").PartialC<{
                                $state: import("io-ts").AnyC;
                            }>]>>;
                        }>]>;
                    }>]>]>>;
                    equation: import("io-ts").StringC;
                }>;
                total: import("io-ts").TypeC<{
                    metrics: import("io-ts").ArrayC<import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                        name: import("io-ts").StringC;
                        aggregation: import("io-ts").LiteralC<"sum">;
                        field: import("io-ts").StringC;
                    }>, import("io-ts").PartialC<{
                        filter: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").TypeC<{
                            kqlQuery: import("io-ts").StringC;
                            filters: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                                meta: import("io-ts").PartialC<{
                                    alias: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                                    disabled: import("io-ts").BooleanC;
                                    negate: import("io-ts").BooleanC;
                                    controlledBy: import("io-ts").StringC;
                                    group: import("io-ts").StringC;
                                    index: import("io-ts").StringC;
                                    isMultiIndex: import("io-ts").BooleanC;
                                    type: import("io-ts").StringC;
                                    key: import("io-ts").StringC;
                                    field: import("io-ts").StringC;
                                    params: import("io-ts").AnyC;
                                    value: import("io-ts").StringC;
                                }>;
                                query: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").AnyC>;
                            }>, import("io-ts").PartialC<{
                                $state: import("io-ts").AnyC;
                            }>]>>;
                        }>]>;
                    }>]>, import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                        name: import("io-ts").StringC;
                        aggregation: import("io-ts").LiteralC<"doc_count">;
                    }>, import("io-ts").PartialC<{
                        filter: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").TypeC<{
                            kqlQuery: import("io-ts").StringC;
                            filters: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                                meta: import("io-ts").PartialC<{
                                    alias: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                                    disabled: import("io-ts").BooleanC;
                                    negate: import("io-ts").BooleanC;
                                    controlledBy: import("io-ts").StringC;
                                    group: import("io-ts").StringC;
                                    index: import("io-ts").StringC;
                                    isMultiIndex: import("io-ts").BooleanC;
                                    type: import("io-ts").StringC;
                                    key: import("io-ts").StringC;
                                    field: import("io-ts").StringC;
                                    params: import("io-ts").AnyC;
                                    value: import("io-ts").StringC;
                                }>;
                                query: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").AnyC>;
                            }>, import("io-ts").PartialC<{
                                $state: import("io-ts").AnyC;
                            }>]>>;
                        }>]>;
                    }>]>]>>;
                    equation: import("io-ts").StringC;
                }>;
                timestampField: import("io-ts").StringC;
            }>, import("io-ts").PartialC<{
                filter: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").TypeC<{
                    kqlQuery: import("io-ts").StringC;
                    filters: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                        meta: import("io-ts").PartialC<{
                            alias: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                            disabled: import("io-ts").BooleanC;
                            negate: import("io-ts").BooleanC;
                            controlledBy: import("io-ts").StringC;
                            group: import("io-ts").StringC;
                            index: import("io-ts").StringC;
                            isMultiIndex: import("io-ts").BooleanC;
                            type: import("io-ts").StringC;
                            key: import("io-ts").StringC;
                            field: import("io-ts").StringC;
                            params: import("io-ts").AnyC;
                            value: import("io-ts").StringC;
                        }>;
                        query: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").AnyC>;
                    }>, import("io-ts").PartialC<{
                        $state: import("io-ts").AnyC;
                    }>]>>;
                }>]>;
                dataViewId: import("io-ts").StringC;
            }>]>;
        }>, import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<"sli.metric.timeslice">;
            params: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                index: import("io-ts").StringC;
                metric: import("io-ts").TypeC<{
                    metrics: import("io-ts").ArrayC<import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                        name: import("io-ts").StringC;
                        aggregation: import("io-ts").KeyofC<{
                            avg: boolean;
                            max: boolean;
                            min: boolean;
                            sum: boolean;
                            cardinality: boolean;
                            last_value: boolean;
                            std_deviation: boolean;
                        }>;
                        field: import("io-ts").StringC;
                    }>, import("io-ts").PartialC<{
                        filter: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").TypeC<{
                            kqlQuery: import("io-ts").StringC;
                            filters: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                                meta: import("io-ts").PartialC<{
                                    alias: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                                    disabled: import("io-ts").BooleanC;
                                    negate: import("io-ts").BooleanC;
                                    controlledBy: import("io-ts").StringC;
                                    group: import("io-ts").StringC;
                                    index: import("io-ts").StringC;
                                    isMultiIndex: import("io-ts").BooleanC;
                                    type: import("io-ts").StringC;
                                    key: import("io-ts").StringC;
                                    field: import("io-ts").StringC;
                                    params: import("io-ts").AnyC;
                                    value: import("io-ts").StringC;
                                }>;
                                query: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").AnyC>;
                            }>, import("io-ts").PartialC<{
                                $state: import("io-ts").AnyC;
                            }>]>>;
                        }>]>;
                    }>]>, import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                        name: import("io-ts").StringC;
                        aggregation: import("io-ts").LiteralC<"doc_count">;
                    }>, import("io-ts").PartialC<{
                        filter: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").TypeC<{
                            kqlQuery: import("io-ts").StringC;
                            filters: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                                meta: import("io-ts").PartialC<{
                                    alias: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                                    disabled: import("io-ts").BooleanC;
                                    negate: import("io-ts").BooleanC;
                                    controlledBy: import("io-ts").StringC;
                                    group: import("io-ts").StringC;
                                    index: import("io-ts").StringC;
                                    isMultiIndex: import("io-ts").BooleanC;
                                    type: import("io-ts").StringC;
                                    key: import("io-ts").StringC;
                                    field: import("io-ts").StringC;
                                    params: import("io-ts").AnyC;
                                    value: import("io-ts").StringC;
                                }>;
                                query: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").AnyC>;
                            }>, import("io-ts").PartialC<{
                                $state: import("io-ts").AnyC;
                            }>]>>;
                        }>]>;
                    }>]>, import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                        name: import("io-ts").StringC;
                        aggregation: import("io-ts").LiteralC<"percentile">;
                        field: import("io-ts").StringC;
                        percentile: import("io-ts").NumberC;
                    }>, import("io-ts").PartialC<{
                        filter: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").TypeC<{
                            kqlQuery: import("io-ts").StringC;
                            filters: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                                meta: import("io-ts").PartialC<{
                                    alias: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                                    disabled: import("io-ts").BooleanC;
                                    negate: import("io-ts").BooleanC;
                                    controlledBy: import("io-ts").StringC;
                                    group: import("io-ts").StringC;
                                    index: import("io-ts").StringC;
                                    isMultiIndex: import("io-ts").BooleanC;
                                    type: import("io-ts").StringC;
                                    key: import("io-ts").StringC;
                                    field: import("io-ts").StringC;
                                    params: import("io-ts").AnyC;
                                    value: import("io-ts").StringC;
                                }>;
                                query: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").AnyC>;
                            }>, import("io-ts").PartialC<{
                                $state: import("io-ts").AnyC;
                            }>]>>;
                        }>]>;
                    }>]>]>>;
                    equation: import("io-ts").StringC;
                    threshold: import("io-ts").NumberC;
                    comparator: import("io-ts").KeyofC<{
                        GT: string;
                        GTE: string;
                        LT: string;
                        LTE: string;
                    }>;
                }>;
                timestampField: import("io-ts").StringC;
            }>, import("io-ts").PartialC<{
                filter: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").TypeC<{
                    kqlQuery: import("io-ts").StringC;
                    filters: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                        meta: import("io-ts").PartialC<{
                            alias: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                            disabled: import("io-ts").BooleanC;
                            negate: import("io-ts").BooleanC;
                            controlledBy: import("io-ts").StringC;
                            group: import("io-ts").StringC;
                            index: import("io-ts").StringC;
                            isMultiIndex: import("io-ts").BooleanC;
                            type: import("io-ts").StringC;
                            key: import("io-ts").StringC;
                            field: import("io-ts").StringC;
                            params: import("io-ts").AnyC;
                            value: import("io-ts").StringC;
                        }>;
                        query: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").AnyC>;
                    }>, import("io-ts").PartialC<{
                        $state: import("io-ts").AnyC;
                    }>]>>;
                }>]>;
                dataViewId: import("io-ts").StringC;
            }>]>;
        }>, import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<"sli.histogram.custom">;
            params: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                index: import("io-ts").StringC;
                timestampField: import("io-ts").StringC;
                good: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                    field: import("io-ts").StringC;
                    aggregation: import("io-ts").LiteralC<"value_count">;
                }>, import("io-ts").PartialC<{
                    filter: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").TypeC<{
                        kqlQuery: import("io-ts").StringC;
                        filters: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                            meta: import("io-ts").PartialC<{
                                alias: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                                disabled: import("io-ts").BooleanC;
                                negate: import("io-ts").BooleanC;
                                controlledBy: import("io-ts").StringC;
                                group: import("io-ts").StringC;
                                index: import("io-ts").StringC;
                                isMultiIndex: import("io-ts").BooleanC;
                                type: import("io-ts").StringC;
                                key: import("io-ts").StringC;
                                field: import("io-ts").StringC;
                                params: import("io-ts").AnyC;
                                value: import("io-ts").StringC;
                            }>;
                            query: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").AnyC>;
                        }>, import("io-ts").PartialC<{
                            $state: import("io-ts").AnyC;
                        }>]>>;
                    }>]>;
                }>]>, import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                    field: import("io-ts").StringC;
                    aggregation: import("io-ts").LiteralC<"range">;
                    from: import("io-ts").NumberC;
                    to: import("io-ts").NumberC;
                }>, import("io-ts").PartialC<{
                    filter: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").TypeC<{
                        kqlQuery: import("io-ts").StringC;
                        filters: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                            meta: import("io-ts").PartialC<{
                                alias: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                                disabled: import("io-ts").BooleanC;
                                negate: import("io-ts").BooleanC;
                                controlledBy: import("io-ts").StringC;
                                group: import("io-ts").StringC;
                                index: import("io-ts").StringC;
                                isMultiIndex: import("io-ts").BooleanC;
                                type: import("io-ts").StringC;
                                key: import("io-ts").StringC;
                                field: import("io-ts").StringC;
                                params: import("io-ts").AnyC;
                                value: import("io-ts").StringC;
                            }>;
                            query: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").AnyC>;
                        }>, import("io-ts").PartialC<{
                            $state: import("io-ts").AnyC;
                        }>]>>;
                    }>]>;
                }>]>]>;
                total: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                    field: import("io-ts").StringC;
                    aggregation: import("io-ts").LiteralC<"value_count">;
                }>, import("io-ts").PartialC<{
                    filter: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").TypeC<{
                        kqlQuery: import("io-ts").StringC;
                        filters: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                            meta: import("io-ts").PartialC<{
                                alias: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                                disabled: import("io-ts").BooleanC;
                                negate: import("io-ts").BooleanC;
                                controlledBy: import("io-ts").StringC;
                                group: import("io-ts").StringC;
                                index: import("io-ts").StringC;
                                isMultiIndex: import("io-ts").BooleanC;
                                type: import("io-ts").StringC;
                                key: import("io-ts").StringC;
                                field: import("io-ts").StringC;
                                params: import("io-ts").AnyC;
                                value: import("io-ts").StringC;
                            }>;
                            query: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").AnyC>;
                        }>, import("io-ts").PartialC<{
                            $state: import("io-ts").AnyC;
                        }>]>>;
                    }>]>;
                }>]>, import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                    field: import("io-ts").StringC;
                    aggregation: import("io-ts").LiteralC<"range">;
                    from: import("io-ts").NumberC;
                    to: import("io-ts").NumberC;
                }>, import("io-ts").PartialC<{
                    filter: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").TypeC<{
                        kqlQuery: import("io-ts").StringC;
                        filters: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                            meta: import("io-ts").PartialC<{
                                alias: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                                disabled: import("io-ts").BooleanC;
                                negate: import("io-ts").BooleanC;
                                controlledBy: import("io-ts").StringC;
                                group: import("io-ts").StringC;
                                index: import("io-ts").StringC;
                                isMultiIndex: import("io-ts").BooleanC;
                                type: import("io-ts").StringC;
                                key: import("io-ts").StringC;
                                field: import("io-ts").StringC;
                                params: import("io-ts").AnyC;
                                value: import("io-ts").StringC;
                            }>;
                            query: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").AnyC>;
                        }>, import("io-ts").PartialC<{
                            $state: import("io-ts").AnyC;
                        }>]>>;
                    }>]>;
                }>]>]>;
            }>, import("io-ts").PartialC<{
                filter: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").TypeC<{
                    kqlQuery: import("io-ts").StringC;
                    filters: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                        meta: import("io-ts").PartialC<{
                            alias: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
                            disabled: import("io-ts").BooleanC;
                            negate: import("io-ts").BooleanC;
                            controlledBy: import("io-ts").StringC;
                            group: import("io-ts").StringC;
                            index: import("io-ts").StringC;
                            isMultiIndex: import("io-ts").BooleanC;
                            type: import("io-ts").StringC;
                            key: import("io-ts").StringC;
                            field: import("io-ts").StringC;
                            params: import("io-ts").AnyC;
                            value: import("io-ts").StringC;
                        }>;
                        query: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").AnyC>;
                    }>, import("io-ts").PartialC<{
                        $state: import("io-ts").AnyC;
                    }>]>>;
                }>]>;
                dataViewId: import("io-ts").StringC;
            }>]>;
        }>]>;
        timeWindow: import("io-ts").UnionC<[import("io-ts").TypeC<{
            duration: import("io-ts").Type<import("@kbn/slo-schema").Duration, string, unknown>;
            type: import("io-ts").LiteralC<"rolling">;
        }>, import("io-ts").TypeC<{
            duration: import("io-ts").Type<import("@kbn/slo-schema").Duration, string, unknown>;
            type: import("io-ts").LiteralC<"calendarAligned">;
        }>]>;
        budgetingMethod: import("io-ts").UnionC<[import("io-ts").LiteralC<"occurrences">, import("io-ts").LiteralC<"timeslices">]>;
        objective: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            target: import("io-ts").NumberC;
        }>, import("io-ts").PartialC<{
            timesliceTarget: import("io-ts").NumberC;
            timesliceWindow: import("io-ts").Type<import("@kbn/slo-schema").Duration, string, unknown>;
        }>]>;
        settings: import("io-ts").PartialC<{
            syncDelay: import("io-ts").Type<import("@kbn/slo-schema").Duration, string, unknown>;
            frequency: import("io-ts").Type<import("@kbn/slo-schema").Duration, string, unknown>;
            preventInitialBackfill: import("io-ts").BooleanC;
            syncField: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
        }>;
        tags: import("io-ts").ArrayC<import("io-ts").StringC>;
        groupBy: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC, import("io-ts").ArrayC<import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>>]>;
        artifacts: import("io-ts").PartialC<{
            dashboards: import("io-ts").ArrayC<import("io-ts").TypeC<{
                id: import("io-ts").StringC;
            }>>;
        }>;
    }>;
}>, import("../types").SLORouteHandlerResources, {
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
}, undefined>>;
