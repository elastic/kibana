export declare const getDiagnosisRoute: Record<"GET /internal/observability/slos/_diagnosis", {
    endpoint: "GET /internal/observability/slos/_diagnosis";
    handler: (options: import("../types").SLORoutesDependencies & import("@kbn/server-route-repository-utils").DefaultRouteHandlerResources) => Promise<{
        licenseAndFeatures: import("@kbn/licensing-types").PublicLicenseJSON;
        userPrivileges: {
            write: import("@elastic/elasticsearch/lib/api/types").SecurityHasPrivilegesResponse;
            read: import("@elastic/elasticsearch/lib/api/types").SecurityHasPrivilegesResponse;
        };
    }>;
    security: import("@kbn/core/server").RouteSecurity;
}>;
