import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { SLOConfig } from '../common/config';
import type { SLOPublicPluginsSetup, SLOPublicPluginsStart, SLOPublicSetup, SLOPublicStart } from './types';
export declare class SLOPlugin implements Plugin<SLOPublicSetup, SLOPublicStart, SLOPublicPluginsSetup, SLOPublicPluginsStart> {
    private readonly initContext;
    private readonly appUpdater$;
    private readonly telemetryService;
    private experimentalFeatures;
    constructor(initContext: PluginInitializerContext<SLOConfig>);
    setup(core: CoreSetup<SLOPublicPluginsStart, SLOPublicStart>, plugins: SLOPublicPluginsSetup): {
        sloDetailsLocator: import("@kbn/share-plugin/common").LocatorPublic<import("@kbn/deeplinks-observability").SloDetailsLocatorParams>;
        sloDetailsHistoryLocator: import("@kbn/share-plugin/common").LocatorPublic<import("@kbn/deeplinks-observability").SloDetailsHistoryLocatorParams>;
        sloEditLocator: import("@kbn/share-plugin/common").LocatorPublic<import("@elastic/charts").RecursivePartial<{
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
        } & {
            id?: string | undefined;
            settings?: {
                syncDelay?: string | undefined;
                frequency?: string | undefined;
                preventInitialBackfill?: boolean | undefined;
                syncField?: string | null | undefined;
            } | undefined;
            tags?: string[] | undefined;
            groupBy?: string | string[] | undefined;
            revision?: number | undefined;
            artifacts?: {
                dashboards?: {
                    id: string;
                }[] | undefined;
            } | undefined;
        }>>;
        sloListLocator: import("@kbn/share-plugin/common").LocatorPublic<import("@kbn/deeplinks-observability").SloListLocatorParams>;
    };
    start(core: CoreStart, plugins: SLOPublicPluginsStart): {
        getCreateSLOFormFlyout: import("react").FunctionComponent<{
            onClose: () => void;
            initialValues: import("@kbn/utility-types").RecursivePartial<import("@kbn/slo-schema").CreateSLOInput>;
            formSettings?: import("./pages/slo_edit/types").FormSettings;
        }>;
        getSLODetailsFlyout: import("react").FunctionComponent<import("./pages/slo_details/shared_flyout/slo_details_flyout").SLODetailsFlyoutProps>;
    };
    stop(): void;
}
