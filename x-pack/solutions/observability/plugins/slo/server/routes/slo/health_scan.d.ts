import { type GetHealthScanResultsResponse, type ListHealthScanResponse, type PostHealthScanResponse } from '@kbn/slo-schema';
export declare const postHealthScanRoute: Record<"POST /internal/observability/slos/_health/scans", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability/slos/_health/scans", import("io-ts").PartialC<{
    body: import("io-ts").PartialC<{
        force: import("io-ts").Type<boolean, boolean, unknown>;
    }>;
}>, import("../types").SLORouteHandlerResources, PostHealthScanResponse, undefined>>;
export declare const listHealthScanRoute: Record<"GET /internal/observability/slos/_health/scans", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability/slos/_health/scans", import("io-ts").PartialC<{
    query: import("io-ts").PartialC<{
        size: import("io-ts").Type<number, number, unknown>;
    }>;
}>, import("../types").SLORouteHandlerResources, ListHealthScanResponse, undefined>>;
export declare const getHealthScanRoute: Record<"GET /internal/observability/slos/_health/scans/{scanId}", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability/slos/_health/scans/{scanId}", import("io-ts").IntersectionC<[import("io-ts").TypeC<{
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
}>]>, import("../types").SLORouteHandlerResources, GetHealthScanResultsResponse, undefined>>;
export declare const healthScanRoutes: {
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
    }>]>, import("../types").SLORouteHandlerResources, GetHealthScanResultsResponse, undefined>;
    "GET /internal/observability/slos/_health/scans": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability/slos/_health/scans", import("io-ts").PartialC<{
        query: import("io-ts").PartialC<{
            size: import("io-ts").Type<number, number, unknown>;
        }>;
    }>, import("../types").SLORouteHandlerResources, ListHealthScanResponse, undefined>;
    "POST /internal/observability/slos/_health/scans": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability/slos/_health/scans", import("io-ts").PartialC<{
        body: import("io-ts").PartialC<{
            force: import("io-ts").Type<boolean, boolean, unknown>;
        }>;
    }>, import("../types").SLORouteHandlerResources, PostHealthScanResponse, undefined>;
};
