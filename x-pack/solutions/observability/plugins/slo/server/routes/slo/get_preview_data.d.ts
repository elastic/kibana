export declare const getPreviewData: Record<"POST /internal/observability/slos/_preview", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability/slos/_preview", import("io-ts").TypeC<{
    body: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
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
        range: import("io-ts").TypeC<{
            from: import("io-ts").Type<Date, string, unknown>;
            to: import("io-ts").Type<Date, string, unknown>;
        }>;
    }>, import("io-ts").PartialC<{
        objective: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            target: import("io-ts").NumberC;
        }>, import("io-ts").PartialC<{
            timesliceTarget: import("io-ts").NumberC;
            timesliceWindow: import("io-ts").Type<import("@kbn/slo-schema").Duration, string, unknown>;
        }>]>;
        remoteName: import("io-ts").StringC;
        groupings: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NumberC]>>;
        groupBy: import("io-ts").ArrayC<import("io-ts").StringC>;
    }>]>;
}>, import("../types").SLORouteHandlerResources, {
    results: ({
        date: string;
        sliValue: number | null;
    } & {
        events?: {
            good: number;
            bad: number;
            total: number;
        } | undefined;
    })[];
} & {
    groups?: {
        [x: string]: ({
            date: string;
            sliValue: number | null;
        } & {
            events?: {
                good: number;
                bad: number;
                total: number;
            } | undefined;
        })[];
    } | undefined;
}, undefined>>;
