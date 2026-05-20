import type { batchGetCompositeSLORoute } from './slo/composite_slo/batch_get_composite_slo';
import type { createCompositeSLORoute } from './slo/composite_slo/create_composite_slo';
import type { getCompositeSLORoute } from './slo/composite_slo/get_composite_slo';
import type { getCompositeSLOSuggestionsRoute } from './slo/composite_slo/get_composite_slo_suggestions';
import type { findCompositeSLORoute } from './slo/composite_slo/find_composite_slo';
import type { updateCompositeSLORoute } from './slo/composite_slo/update_composite_slo';
import type { deleteCompositeSLORoute } from './slo/composite_slo/delete_composite_slo';
import type { fetchCompositeHistoricalSummaryRoute } from './slo/composite_slo/fetch_composite_historical_summary';
import type { postCompositeSloSummaryRefreshRoute } from './slo/composite_slo/post_composite_slo_summary_refresh';
interface RouteRepositoryOptions {
    isServerless?: boolean;
    isCompositeSloEnabled?: boolean;
}
export declare function getSloServerRouteRepository({ isServerless, isCompositeSloEnabled, }?: RouteRepositoryOptions): {
    "POST /internal/observability/slo_composites/_summary_refresh"?: import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability/slo_composites/_summary_refresh", import("zod").ZodObject<{}, import("zod/v4/core").$strip>, import("./types").SLORouteHandlerResources, import("@kbn/slo-schema").PostCompositeSloSummaryRefreshResponse, undefined> | undefined;
    "GET /internal/observability/slo_composites/suggestions"?: {
        endpoint: "GET /internal/observability/slo_composites/suggestions";
        handler: (options: import("./types").SLORoutesDependencies & import("@kbn/server-route-repository-utils").DefaultRouteHandlerResources) => Promise<import("../services").CompositeSLOSuggestionsResponse>;
        security: import("@kbn/core/server").RouteSecurity;
    } | undefined;
    "POST /internal/observability/slo_composites/_batch_get"?: import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability/slo_composites/_batch_get", import("zod").ZodObject<{
        body: import("zod").ZodObject<{
            ids: import("zod").ZodArray<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").SLORouteHandlerResources, {
        id: string;
        name: string;
        description: string;
        compositeMethod: "weightedAverage";
        timeWindow: {
            duration: string;
            type: "rolling";
        };
        budgetingMethod: "occurrences";
        objective: {
            target: number;
        };
        tags: string[];
        enabled: boolean;
        createdAt: string;
        updatedAt: string;
        createdBy: string;
        updatedBy: string;
        version: number;
        summary: {
            sliValue: number;
            errorBudget: {
                initial: number;
                consumed: number;
                remaining: number;
                isEstimated: boolean;
            };
            status: "NO_DATA" | "HEALTHY" | "DEGRADING" | "VIOLATED";
            fiveMinuteBurnRate: number;
            oneHourBurnRate: number;
            oneDayBurnRate: number;
        };
        members: {
            id: string;
            name: string;
            weight: number;
            normalisedWeight: number;
            sliValue: number;
            status: "NO_DATA" | "HEALTHY" | "DEGRADING" | "VIOLATED";
            errorBudget?: {
                initial: number;
                consumed: number;
                remaining: number;
                isEstimated: boolean;
            } | undefined;
            fiveMinuteBurnRate?: number | undefined;
            oneHourBurnRate?: number | undefined;
            oneDayBurnRate?: number | undefined;
            instanceId?: string | undefined;
        }[];
    }[], undefined> | undefined;
    "POST /internal/observability/slo_composites/_historical_summary"?: import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability/slo_composites/_historical_summary", import("zod").ZodObject<{
        body: import("zod").ZodObject<{
            list: import("zod").ZodArray<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").SLORouteHandlerResources, {
        compositeId: string;
        data: {
            date: string;
            status: "NO_DATA" | "HEALTHY" | "DEGRADING" | "VIOLATED";
            sliValue: number;
            errorBudget: {
                initial: number;
                consumed: number;
                remaining: number;
                isEstimated: boolean;
            };
        }[];
    }[], undefined> | undefined;
    "DELETE /api/observability/slo_composites/{id} 2023-10-31"?: import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /api/observability/slo_composites/{id} 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            id: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").SLORouteHandlerResources, import("@kbn/core/server").IKibanaResponse<any>, undefined> | undefined;
    "PUT /api/observability/slo_composites/{id} 2023-10-31"?: import("@kbn/server-route-repository-utils").ServerRoute<"PUT /api/observability/slo_composites/{id} 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            id: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
        body: import("zod").ZodObject<{
            name: import("zod").ZodOptional<import("zod").ZodString>;
            description: import("zod").ZodOptional<import("zod").ZodString>;
            members: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                sloId: import("zod").ZodString;
                weight: import("zod").ZodNumber;
                instanceId: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>>;
            compositeMethod: import("zod").ZodOptional<import("zod").ZodLiteral<"weightedAverage">>;
            timeWindow: import("zod").ZodOptional<import("zod").ZodObject<{
                duration: import("zod").ZodString;
                type: import("zod").ZodLiteral<"rolling">;
            }, import("zod/v4/core").$strip>>;
            budgetingMethod: import("zod").ZodOptional<import("zod").ZodLiteral<"occurrences">>;
            objective: import("zod").ZodOptional<import("zod").ZodObject<{
                target: import("zod").ZodNumber;
            }, import("zod/v4/core").$strip>>;
            tags: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").SLORouteHandlerResources, {
        id: string;
        name: string;
        description: string;
        compositeMethod: "weightedAverage";
        timeWindow: {
            duration: string;
            type: "rolling";
        };
        budgetingMethod: "occurrences";
        objective: {
            target: number;
        };
        tags: string[];
        enabled: boolean;
        createdAt: string;
        updatedAt: string;
        createdBy: string;
        updatedBy: string;
        version: number;
        members: {
            sloId: string;
            weight: number;
            instanceId?: string | undefined;
        }[];
    }, undefined> | undefined;
    "GET /api/observability/slo_composites 2023-10-31"?: import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/observability/slo_composites 2023-10-31", import("zod").ZodObject<{
        query: import("zod").ZodOptional<import("zod").ZodObject<{
            search: import("zod").ZodOptional<import("zod").ZodString>;
            page: import("zod").ZodOptional<import("zod").ZodString>;
            perPage: import("zod").ZodOptional<import("zod").ZodString>;
            sortBy: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"name">, import("zod").ZodLiteral<"createdAt">, import("zod").ZodLiteral<"updatedAt">]>>;
            sortDirection: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"asc">, import("zod").ZodLiteral<"desc">]>>;
            tags: import("zod").ZodOptional<import("zod").ZodString>;
            status: import("zod").ZodOptional<import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<string[], string>>, import("zod").ZodArray<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"NO_DATA">, import("zod").ZodLiteral<"HEALTHY">, import("zod").ZodLiteral<"DEGRADING">, import("zod").ZodLiteral<"VIOLATED">]>>>>;
        }, import("zod/v4/core").$strip>>;
    }, import("zod/v4/core").$strip>, import("./types").SLORouteHandlerResources, import("@kbn/slo-schema").Paginated<{
        id: string;
        name: string;
        description: string;
        compositeMethod: "weightedAverage";
        timeWindow: {
            duration: string;
            type: "rolling";
        };
        budgetingMethod: "occurrences";
        objective: {
            target: number;
        };
        tags: string[];
        enabled: boolean;
        createdAt: string;
        updatedAt: string;
        createdBy: string;
        updatedBy: string;
        version: number;
        members: {
            sloId: string;
            weight: number;
            instanceId?: string | undefined;
        }[];
    }>, undefined> | undefined;
    "GET /api/observability/slo_composites/{id} 2023-10-31"?: import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/observability/slo_composites/{id} 2023-10-31", import("zod").ZodObject<{
        path: import("zod").ZodObject<{
            id: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").SLORouteHandlerResources, {
        id: string;
        name: string;
        description: string;
        compositeMethod: "weightedAverage";
        timeWindow: {
            duration: string;
            type: "rolling";
        };
        budgetingMethod: "occurrences";
        objective: {
            target: number;
        };
        tags: string[];
        enabled: boolean;
        createdAt: string;
        updatedAt: string;
        createdBy: string;
        updatedBy: string;
        version: number;
        summary: {
            sliValue: number;
            errorBudget: {
                initial: number;
                consumed: number;
                remaining: number;
                isEstimated: boolean;
            };
            status: "NO_DATA" | "HEALTHY" | "DEGRADING" | "VIOLATED";
            fiveMinuteBurnRate: number;
            oneHourBurnRate: number;
            oneDayBurnRate: number;
        };
        members: {
            id: string;
            name: string;
            weight: number;
            normalisedWeight: number;
            sliValue: number;
            status: "NO_DATA" | "HEALTHY" | "DEGRADING" | "VIOLATED";
            errorBudget?: {
                initial: number;
                consumed: number;
                remaining: number;
                isEstimated: boolean;
            } | undefined;
            fiveMinuteBurnRate?: number | undefined;
            oneHourBurnRate?: number | undefined;
            oneDayBurnRate?: number | undefined;
            instanceId?: string | undefined;
        }[];
    }, undefined> | undefined;
    "POST /api/observability/slo_composites 2023-10-31"?: import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/observability/slo_composites 2023-10-31", import("zod").ZodObject<{
        body: import("zod").ZodObject<{
            name: import("zod").ZodString;
            description: import("zod").ZodString;
            members: import("zod").ZodArray<import("zod").ZodObject<{
                sloId: import("zod").ZodString;
                weight: import("zod").ZodNumber;
                instanceId: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>;
            compositeMethod: import("zod").ZodLiteral<"weightedAverage">;
            timeWindow: import("zod").ZodObject<{
                duration: import("zod").ZodString;
                type: import("zod").ZodLiteral<"rolling">;
            }, import("zod/v4/core").$strip>;
            budgetingMethod: import("zod").ZodLiteral<"occurrences">;
            objective: import("zod").ZodObject<{
                target: import("zod").ZodNumber;
            }, import("zod/v4/core").$strip>;
            id: import("zod").ZodOptional<import("zod").ZodString>;
            tags: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
            enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").SLORouteHandlerResources, {
        id: string;
        name: string;
        description: string;
        compositeMethod: "weightedAverage";
        timeWindow: {
            duration: string;
            type: "rolling";
        };
        budgetingMethod: "occurrences";
        objective: {
            target: number;
        };
        tags: string[];
        enabled: boolean;
        createdAt: string;
        updatedAt: string;
        createdBy: string;
        updatedBy: string;
        version: number;
        members: {
            sloId: string;
            weight: number;
            instanceId?: string | undefined;
        }[];
    }, undefined> | undefined;
    "GET /internal/observability/slos/_search_definitions": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability/slos/_search_definitions", import("io-ts").PartialC<{
        query: import("io-ts").PartialC<{
            search: import("io-ts").StringC;
            size: import("io-ts").Type<number, number, unknown>;
            searchAfter: import("io-ts").StringC;
            remoteName: import("io-ts").StringC;
        }>;
    }>, import("./types").SLORouteHandlerResources, import("@kbn/slo-schema").SearchSLODefinitionResponse, undefined>;
    "GET /internal/observability/slos/_health/scans/{scanId}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability/slos/_health/scans/{scanId}", import("io-ts").IntersectionC<[import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            scanId: import("io-ts").StringC;
        }>;
    }>, import("io-ts").PartialC<{
        query: import("io-ts").PartialC<{
            size: import("io-ts").Type<number, number, unknown>;
            searchAfter: import("io-ts").StringC;
            problematic: import("io-ts").Type<boolean, boolean, unknown>;
            allSpaces: import("io-ts").Type<boolean, boolean, unknown>;
        }>;
    }>]>, import("./types").SLORouteHandlerResources, import("@kbn/slo-schema").GetHealthScanResultsResponse, undefined>;
    "GET /internal/observability/slos/_health/scans": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability/slos/_health/scans", import("io-ts").PartialC<{
        query: import("io-ts").PartialC<{
            size: import("io-ts").Type<number, number, unknown>;
        }>;
    }>, import("./types").SLORouteHandlerResources, import("@kbn/slo-schema").ListHealthScanResponse, undefined>;
    "POST /internal/observability/slos/_health/scans": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability/slos/_health/scans", import("io-ts").PartialC<{
        body: import("io-ts").PartialC<{
            force: import("io-ts").Type<boolean, boolean, unknown>;
        }>;
    }>, import("./types").SLORouteHandlerResources, import("@kbn/slo-schema").PostHealthScanResponse, undefined>;
    "GET /api/observability/slo_templates/_tags": {
        endpoint: "GET /api/observability/slo_templates/_tags";
        handler: (options: import("./types").SLORoutesDependencies & import("@kbn/server-route-repository-utils").DefaultRouteHandlerResources) => Promise<import("@kbn/slo-schema").FindSLOTemplateTagsResponse>;
        security: import("@kbn/core/server").RouteSecurity;
    };
    "GET /api/observability/slo_templates": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/observability/slo_templates", import("io-ts").TypeC<{
        query: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").PartialC<{
            search: import("io-ts").StringC;
            tags: import("io-ts").Type<string[], string, unknown>;
            page: import("io-ts").Type<number, number, unknown>;
            perPage: import("io-ts").Type<number, number, unknown>;
        }>]>;
    }>, import("./types").SLORouteHandlerResources, import("@kbn/slo-schema").FindSLOTemplatesResponse, undefined>;
    "GET /api/observability/slo_templates/{templateId}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/observability/slo_templates/{templateId}", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            templateId: import("io-ts").StringC;
        }>;
    }>, import("./types").SLORouteHandlerResources, {
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
    }, undefined>;
    "GET /internal/observability/slos/{id}/_instances": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability/slos/{id}/_instances", import("io-ts").IntersectionC<[import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            id: import("io-ts").StringC;
        }>;
    }>, import("io-ts").PartialC<{
        query: import("io-ts").PartialC<{
            search: import("io-ts").StringC;
            size: import("io-ts").Type<number, number, unknown>;
            searchAfter: import("io-ts").StringC;
            remoteName: import("io-ts").StringC;
        }>;
    }>]>, import("./types").SLORouteHandlerResources, import("@kbn/slo-schema").FindSLOInstancesResponse, undefined>;
    "GET /api/observability/slos/_purge_instances/{taskId}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/observability/slos/_purge_instances/{taskId}", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            taskId: import("io-ts").StringC;
        }>;
    }>, import("./types").SLORouteHandlerResources, {
        completed: false;
        error: string;
        status?: undefined;
    } | {
        completed: false;
        status: {
            total: number;
            deleted: number;
            batches: number;
            start_time_in_millis: number;
            running_time_in_nanos: number;
        } | undefined;
        error?: undefined;
    } | {
        completed: true;
        status: {
            total: number;
            deleted: number;
            batches: number;
            start_time_in_millis: number;
            running_time_in_nanos: number;
        } | undefined;
        error?: undefined;
    }, undefined>;
    "POST /api/observability/slos/_purge_instances": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/observability/slos/_purge_instances", import("io-ts").TypeC<{
        body: import("io-ts").PartialC<{
            list: import("io-ts").ArrayC<import("io-ts").Type<string, string, unknown>>;
            staleDuration: import("io-ts").Type<import("@kbn/slo-schema").Duration, string, unknown>;
            force: import("io-ts").BooleanC;
        }>;
    }>, import("./types").SLORouteHandlerResources, import("@kbn/slo-schema").PurgeInstancesResponse, undefined>;
    "POST /api/observability/slos/_repair": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/observability/slos/_repair", import("io-ts").TypeC<{
        body: import("io-ts").TypeC<{
            list: import("io-ts").ArrayC<import("io-ts").Type<string, string, unknown>>;
        }>;
    }>, import("./types").SLORouteHandlerResources, import("@kbn/core/server").IKibanaResponse<any>, undefined>;
    "GET /api/observability/slos/_bulk_delete/{taskId} 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/observability/slos/_bulk_delete/{taskId} 2023-10-31", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            taskId: import("io-ts").StringC;
        }>;
    }>, import("./types").SLORouteHandlerResources, import("@kbn/slo-schema").BulkDeleteStatusResponse, undefined>;
    "POST /api/observability/slos/_bulk_delete 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/observability/slos/_bulk_delete 2023-10-31", import("io-ts").TypeC<{
        body: import("io-ts").TypeC<{
            list: import("io-ts").ArrayC<import("io-ts").Type<string, string, unknown>>;
        }>;
    }>, import("./types").SLORouteHandlerResources, {
        taskId: string;
    }, undefined>;
    "POST /internal/slos/_grouped_stats": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/slos/_grouped_stats", import("io-ts").TypeC<{
        body: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            type: import("io-ts").LiteralC<"apm">;
        }>, import("io-ts").PartialC<{
            size: import("io-ts").NumberC;
            serviceNames: import("io-ts").ArrayC<import("io-ts").StringC>;
            environment: import("io-ts").StringC;
            kqlQuery: import("io-ts").StringC;
            statusFilters: import("io-ts").ArrayC<import("io-ts").StringC>;
        }>]>;
    }>, import("./types").SLORouteHandlerResources, import("@kbn/slo-schema").GetSLOGroupedStatsResponse, undefined>;
    "GET /internal/observability/slos/overview": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability/slos/overview", import("io-ts").PartialC<{
        query: import("io-ts").PartialC<{
            kqlQuery: import("io-ts").StringC;
            filters: import("io-ts").StringC;
        }>;
    }>, import("./types").SLORouteHandlerResources, {
        violated: number;
        degrading: number;
        stale: number;
        healthy: number;
        noData: number;
        burnRateRules: number;
        burnRateActiveAlerts: number;
        burnRateRecoveredAlerts: number;
    }, undefined>;
    "GET /internal/observability/slos/suggestions": {
        endpoint: "GET /internal/observability/slos/suggestions";
        handler: (options: import("./types").SLORoutesDependencies & import("@kbn/server-route-repository-utils").DefaultRouteHandlerResources) => Promise<{
            tags: {
                label: string;
                value: string;
                count: number;
            }[];
        }>;
        security: import("@kbn/core/server").RouteSecurity;
    };
    "GET /internal/observability/slos/_groups": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability/slos/_groups", import("io-ts").PartialC<{
        query: import("io-ts").PartialC<{
            page: import("io-ts").StringC;
            perPage: import("io-ts").StringC;
            groupBy: import("io-ts").UnionC<[import("io-ts").LiteralC<"ungrouped">, import("io-ts").LiteralC<"slo.tags">, import("io-ts").LiteralC<"status">, import("io-ts").LiteralC<"slo.indicator.type">, import("io-ts").LiteralC<"slo.instanceId">, import("io-ts").LiteralC<"_index">, import("io-ts").LiteralC<"slo.id">]>;
            groupsFilter: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").StringC>, import("io-ts").StringC]>;
            kqlQuery: import("io-ts").StringC;
            filters: import("io-ts").StringC;
        }>;
    }>, import("./types").SLORouteHandlerResources, {
        page: number;
        perPage: number;
        total: number;
        results: {
            group: string;
            groupBy: "status" | "_index" | "ungrouped" | "slo.id" | "slo.instanceId" | "slo.tags" | "slo.indicator.type";
            summary: {
                total: number;
                worst: {
                    sliValue: number;
                    status: string;
                    slo: {
                        id: string;
                        instanceId: string;
                        name: string;
                    } & {
                        groupings?: {
                            [x: string]: unknown;
                        } | undefined;
                    };
                };
                violated: number;
                healthy: number;
                degrading: number;
                noData: number;
            };
        }[];
    }, undefined>;
    "POST /api/observability/slos/{id}/_reset 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/observability/slos/{id}/_reset 2023-10-31", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            id: import("io-ts").Type<string, string, unknown>;
        }>;
    }>, import("./types").SLORouteHandlerResources, {
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
    }, undefined>;
    "POST /internal/observability/slos/_preview": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability/slos/_preview", import("io-ts").TypeC<{
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
    }>, import("./types").SLORouteHandlerResources, {
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
    }, undefined>;
    "POST /internal/observability/slos/{id}/_burn_rates": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability/slos/{id}/_burn_rates", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            id: import("io-ts").StringC;
        }>;
        body: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            instanceId: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>;
            windows: import("io-ts").ArrayC<import("io-ts").TypeC<{
                name: import("io-ts").StringC;
                duration: import("io-ts").Type<import("@kbn/slo-schema").Duration, string, unknown>;
            }>>;
        }>, import("io-ts").PartialC<{
            remoteName: import("io-ts").StringC;
        }>]>;
    }>, import("./types").SLORouteHandlerResources, {
        burnRates: {
            name: string;
            burnRate: number;
            sli: number;
        }[];
    }, undefined>;
    "GET /internal/observability/slos/_diagnosis": {
        endpoint: "GET /internal/observability/slos/_diagnosis";
        handler: (options: import("./types").SLORoutesDependencies & import("@kbn/server-route-repository-utils").DefaultRouteHandlerResources) => Promise<{
            licenseAndFeatures: import("@kbn/licensing-types").PublicLicenseJSON;
            userPrivileges: {
                write: import("@elastic/elasticsearch/lib/api/types").SecurityHasPrivilegesResponse;
                read: import("@elastic/elasticsearch/lib/api/types").SecurityHasPrivilegesResponse;
            };
        }>;
        security: import("@kbn/core/server").RouteSecurity;
    };
    "PUT /api/observability/slos/{id} 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /api/observability/slos/{id} 2023-10-31", import("io-ts").TypeC<{
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
    }>, import("./types").SLORouteHandlerResources, {
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
    }, undefined>;
    "GET /api/observability/slos/{id} 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/observability/slos/{id} 2023-10-31", import("io-ts").IntersectionC<[import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            id: import("io-ts").Type<string, string, unknown>;
        }>;
    }>, import("io-ts").PartialC<{
        query: import("io-ts").PartialC<{
            instanceId: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>;
            remoteName: import("io-ts").StringC;
        }>;
    }>]>, import("./types").SLORouteHandlerResources, {
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
    }, undefined>;
    "GET /api/observability/slos 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/observability/slos 2023-10-31", import("io-ts").PartialC<{
        query: import("io-ts").PartialC<{
            filters: import("io-ts").StringC;
            kqlQuery: import("io-ts").StringC;
            page: import("io-ts").StringC;
            perPage: import("io-ts").StringC;
            sortBy: import("io-ts").UnionC<[import("io-ts").LiteralC<"error_budget_consumed">, import("io-ts").LiteralC<"error_budget_remaining">, import("io-ts").LiteralC<"sli_value">, import("io-ts").LiteralC<"status">, import("io-ts").LiteralC<"burn_rate_5m">, import("io-ts").LiteralC<"burn_rate_1h">, import("io-ts").LiteralC<"burn_rate_1d">]>;
            sortDirection: import("io-ts").UnionC<[import("io-ts").LiteralC<"asc">, import("io-ts").LiteralC<"desc">]>;
            hideStale: import("io-ts").Type<boolean, boolean, unknown>;
            searchAfter: import("io-ts").Type<(string | number)[], string, unknown>;
            size: import("io-ts").StringC;
        }>;
    }>, import("./types").SLORouteHandlerResources, {
        page: number;
        perPage: number;
        total: number;
        results: ({
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
        })[];
    } & {
        searchAfter?: (string | number)[] | undefined;
        size?: number | undefined;
    }, undefined>;
    "GET /api/observability/slos/_definitions 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/observability/slos/_definitions 2023-10-31", import("io-ts").PartialC<{
        query: import("io-ts").PartialC<{
            search: import("io-ts").StringC;
            includeOutdatedOnly: import("io-ts").Type<boolean, boolean, unknown>;
            includeHealth: import("io-ts").Type<boolean, boolean, unknown>;
            tags: import("io-ts").StringC;
            page: import("io-ts").StringC;
            perPage: import("io-ts").StringC;
        }>;
    }>, import("./types").SLORouteHandlerResources, {
        page: number;
        perPage: number;
        total: number;
        results: ({
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
            health?: {
                isProblematic: boolean;
                rollup: {
                    isProblematic: boolean;
                    missing: boolean;
                    status: "unavailable" | "healthy" | "unhealthy";
                    state: "unavailable" | "failed" | "started" | "stopping" | "stopped" | "aborting" | "indexing";
                } & {
                    stateMatches?: boolean | undefined;
                };
                summary: {
                    isProblematic: boolean;
                    missing: boolean;
                    status: "unavailable" | "healthy" | "unhealthy";
                    state: "unavailable" | "failed" | "started" | "stopping" | "stopped" | "aborting" | "indexing";
                } & {
                    stateMatches?: boolean | undefined;
                };
            } | undefined;
        })[];
    }, undefined>;
    "POST /internal/observability/slos/_historical_summary": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability/slos/_historical_summary", import("io-ts").TypeC<{
        body: import("io-ts").TypeC<{
            list: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                sloId: import("io-ts").Type<string, string, unknown>;
                instanceId: import("io-ts").StringC;
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
                groupBy: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC, import("io-ts").ArrayC<import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>>]>;
                revision: import("io-ts").NumberC;
            }>, import("io-ts").PartialC<{
                remoteName: import("io-ts").StringC;
                range: import("io-ts").TypeC<{
                    from: import("io-ts").Type<Date, string, unknown>;
                    to: import("io-ts").Type<Date, string, unknown>;
                }>;
            }>]>>;
        }>;
    }>, import("./types").SLORouteHandlerResources, {
        sloId: string;
        instanceId: string;
        data: {
            date: string;
            status: "NO_DATA" | "HEALTHY" | "DEGRADING" | "VIOLATED";
            sliValue: number;
            errorBudget: {
                initial: number;
                consumed: number;
                remaining: number;
                isEstimated: boolean;
            };
        }[];
    }[], undefined>;
    "POST /api/observability/slos/{id}/enable 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/observability/slos/{id}/enable 2023-10-31", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            id: import("io-ts").Type<string, string, unknown>;
        }>;
    }>, import("./types").SLORouteHandlerResources, import("@kbn/core/server").IKibanaResponse<any>, undefined>;
    "POST /api/observability/slos/{id}/disable 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/observability/slos/{id}/disable 2023-10-31", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            id: import("io-ts").Type<string, string, unknown>;
        }>;
    }>, import("./types").SLORouteHandlerResources, import("@kbn/core/server").IKibanaResponse<any>, undefined>;
    "POST /api/observability/slos/_bulk_purge_rollup 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/observability/slos/_bulk_purge_rollup 2023-10-31", import("io-ts").TypeC<{
        body: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            list: import("io-ts").ArrayC<import("io-ts").StringC>;
            purgePolicy: import("io-ts").UnionC<[import("io-ts").TypeC<{
                purgeType: import("io-ts").LiteralC<"fixed_age">;
                age: import("io-ts").Type<import("@kbn/slo-schema").Duration, string, unknown>;
            }>, import("io-ts").TypeC<{
                purgeType: import("io-ts").LiteralC<"fixed_time">;
                timestamp: import("io-ts").Type<Date, string, unknown>;
            }>]>;
        }>, import("io-ts").PartialC<{
            force: import("io-ts").BooleanC;
        }>]>;
    }>, import("./types").SLORouteHandlerResources, import("@kbn/slo-schema").BulkPurgeRollupResponse, undefined>;
    "POST /api/observability/slos/_delete_instances 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/observability/slos/_delete_instances 2023-10-31", import("io-ts").TypeC<{
        body: import("io-ts").TypeC<{
            list: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                sloId: import("io-ts").Type<string, string, unknown>;
                instanceId: import("io-ts").StringC;
            }>, import("io-ts").PartialC<{
                excludeRollup: import("io-ts").BooleanC;
            }>]>>;
        }>;
    }>, import("./types").SLORouteHandlerResources, import("@kbn/core/server").IKibanaResponse<any>, undefined>;
    "DELETE /api/observability/slos/{id} 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /api/observability/slos/{id} 2023-10-31", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            id: import("io-ts").Type<string, string, unknown>;
        }>;
    }>, import("./types").SLORouteHandlerResources, import("@kbn/core/server").IKibanaResponse<any>, undefined>;
    "POST /internal/observability/slos/_inspect": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability/slos/_inspect", import("io-ts").TypeC<{
        body: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
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
        }>, import("io-ts").PartialC<{
            id: import("io-ts").Type<string, string, unknown>;
            settings: import("io-ts").PartialC<{
                syncDelay: import("io-ts").Type<import("@kbn/slo-schema").Duration, string, unknown>;
                frequency: import("io-ts").Type<import("@kbn/slo-schema").Duration, string, unknown>;
                preventInitialBackfill: import("io-ts").BooleanC;
                syncField: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>;
            tags: import("io-ts").ArrayC<import("io-ts").StringC>;
            groupBy: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC, import("io-ts").ArrayC<import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>>]>;
            revision: import("io-ts").NumberC;
            artifacts: import("io-ts").PartialC<{
                dashboards: import("io-ts").ArrayC<import("io-ts").TypeC<{
                    id: import("io-ts").StringC;
                }>>;
            }>;
        }>]>;
    }>, import("./types").SLORouteHandlerResources, {
        slo: import("@kbn/slo-schema").CreateSLOParams;
        rollUpPipeline: Record<string, any>;
        summaryPipeline: Record<string, any>;
        rollUpTransform: import("@elastic/elasticsearch/lib/api/types").TransformPutTransformRequest;
        summaryTransform: import("@elastic/elasticsearch/lib/api/types").TransformPutTransformRequest;
        temporaryDoc: Record<string, any>;
        rollUpTransformCompositeQuery: string;
        summaryTransformCompositeQuery: string;
    }, undefined>;
    "POST /api/observability/slos 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/observability/slos 2023-10-31", import("io-ts").TypeC<{
        body: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
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
        }>, import("io-ts").PartialC<{
            id: import("io-ts").Type<string, string, unknown>;
            settings: import("io-ts").PartialC<{
                syncDelay: import("io-ts").Type<import("@kbn/slo-schema").Duration, string, unknown>;
                frequency: import("io-ts").Type<import("@kbn/slo-schema").Duration, string, unknown>;
                preventInitialBackfill: import("io-ts").BooleanC;
                syncField: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NullC]>;
            }>;
            tags: import("io-ts").ArrayC<import("io-ts").StringC>;
            groupBy: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC, import("io-ts").ArrayC<import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>>]>;
            revision: import("io-ts").NumberC;
            artifacts: import("io-ts").PartialC<{
                dashboards: import("io-ts").ArrayC<import("io-ts").TypeC<{
                    id: import("io-ts").StringC;
                }>>;
            }>;
        }>]>;
    }>, import("./types").SLORouteHandlerResources, {
        id: string;
    }, undefined>;
    "PUT /internal/slo/settings": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /internal/slo/settings", import("io-ts").TypeC<{
        body: import("io-ts").TypeC<{
            useAllRemoteClusters: import("io-ts").BooleanC;
            selectedRemoteClusters: import("io-ts").ArrayC<import("io-ts").StringC>;
            staleThresholdInHours: import("io-ts").NumberC;
            staleInstancesCleanupEnabled: import("io-ts").BooleanC;
        }>;
    }> | import("io-ts").TypeC<{
        body: import("io-ts").TypeC<{
            staleThresholdInHours: import("io-ts").NumberC;
            staleInstancesCleanupEnabled: import("io-ts").BooleanC;
        }>;
    }>, import("./types").SLORouteHandlerResources, {
        useAllRemoteClusters: boolean;
        selectedRemoteClusters: string[];
        staleThresholdInHours: number;
        staleInstancesCleanupEnabled: boolean;
    }, undefined>;
    "GET /internal/slo/settings": {
        endpoint: "GET /internal/slo/settings";
        handler: (options: import("./types").SLORoutesDependencies & import("@kbn/server-route-repository-utils").DefaultRouteHandlerResources) => Promise<{
            useAllRemoteClusters: boolean;
            selectedRemoteClusters: string[];
            staleThresholdInHours: number;
            staleInstancesCleanupEnabled: boolean;
        }>;
        security: import("@kbn/core/server").RouteSecurity;
    };
    "POST /internal/observability/slos/_health": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability/slos/_health", import("io-ts").TypeC<{
        body: import("io-ts").TypeC<{
            list: import("io-ts").ArrayC<import("io-ts").TypeC<{
                id: import("io-ts").Type<string, string, unknown>;
                instanceId: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>;
            }>>;
        }>;
    }>, import("./types").SLORouteHandlerResources, {
        id: string;
        instanceId: string;
        revision: number;
        name: string;
        health: {
            isProblematic: boolean;
            rollup: {
                isProblematic: boolean;
                missing: boolean;
                status: "unavailable" | "healthy" | "unhealthy";
                state: "unavailable" | "failed" | "started" | "stopping" | "stopped" | "aborting" | "indexing";
            } & {
                stateMatches?: boolean | undefined;
            };
            summary: {
                isProblematic: boolean;
                missing: boolean;
                status: "unavailable" | "healthy" | "unhealthy";
                state: "unavailable" | "failed" | "started" | "stopping" | "stopped" | "aborting" | "indexing";
            } & {
                stateMatches?: boolean | undefined;
            };
        };
    }[], undefined>;
};
type CompositeRoutes = typeof batchGetCompositeSLORoute & typeof createCompositeSLORoute & typeof getCompositeSLORoute & typeof getCompositeSLOSuggestionsRoute & typeof findCompositeSLORoute & typeof updateCompositeSLORoute & typeof deleteCompositeSLORoute & typeof fetchCompositeHistoricalSummaryRoute & typeof postCompositeSloSummaryRefreshRoute;
export type SLORouteRepository = ReturnType<typeof getSloServerRouteRepository> & CompositeRoutes;
export {};
