import * as t from 'io-ts';
export declare const aiAssistantRouteRepository: {
    "GET /internal/observability/assistant/alert_details_contextual_insights": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability/assistant/alert_details_contextual_insights", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            alert_started_at: t.StringC;
        }>, t.PartialC<{
            alert_rule_parameter_time_size: t.StringC;
            alert_rule_parameter_time_unit: t.StringC;
            'service.name': t.StringC;
            'service.environment': t.StringC;
            'transaction.type': t.StringC;
            'transaction.name': t.StringC;
            'host.name': t.StringC;
            'container.id': t.StringC;
            'kubernetes.pod.name': t.StringC;
        }>]>;
    }>, import("../types").ObservabilityRouteHandlerResources, {
        alertContext: import("../../services").AlertDetailsContextualInsight[];
    }, import("../types").ObservabilityRouteCreateOptions>;
};
