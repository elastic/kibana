export declare const BUILT_IN_ENTITY_TYPES: {
    readonly HOST_V2: "built_in_hosts_from_ecs_data";
    readonly CONTAINER_V2: "built_in_containers_from_ecs_data";
    readonly SERVICE_V2: "built_in_services_from_ecs_data";
    readonly KUBERNETES_V2: {
        readonly CLUSTER: {
            ecs: "built_in_kubernetes_cluster_ecs";
            semconv: "built_in_kubernetes_cluster_semconv";
        };
        readonly CRON_JOB: {
            ecs: "built_in_kubernetes_cron_job_ecs";
            semconv: "built_in_kubernetes_cron_job_semconv";
        };
        readonly DAEMON_SET: {
            ecs: "built_in_kubernetes_daemon_set_ecs";
            semconv: "built_in_kubernetes_daemon_set_semconv";
        };
        readonly DEPLOYMENT: {
            ecs: "built_in_kubernetes_deployment_ecs";
            semconv: "built_in_kubernetes_deployment_semconv";
        };
        readonly JOB: {
            ecs: "built_in_kubernetes_job_ecs";
            semconv: "built_in_kubernetes_job_semconv";
        };
        readonly NODE: {
            ecs: "built_in_kubernetes_node_ecs";
            semconv: "built_in_kubernetes_node_semconv";
        };
        readonly POD: {
            ecs: "built_in_kubernetes_pod_ecs";
            semconv: "built_in_kubernetes_pod_semconv";
        };
        readonly REPLICA_SET: {
            ecs: "built_in_kubernetes_replica_set_ecs";
            semconv: "built_in_kubernetes_replica_set_semconv";
        };
        readonly STATEFUL_SET: {
            ecs: "built_in_kubernetes_stateful_set_ecs";
            semconv: "built_in_kubernetes_stateful_set_semconv";
        };
        readonly SERVICE: "built_in_kubernetes_service_ecs";
    };
    readonly HOST: "host";
    readonly CONTAINER: "container";
    readonly SERVICE: "service";
    readonly KUBERNETES: {
        readonly CLUSTER: {
            ecs: "k8s.cluster.ecs";
            semconv: "k8s.cluster.semconv";
        };
        readonly CONTAINER: {
            ecs: "k8s.container.ecs";
            semconv: "k8s.container.semconv";
        };
        readonly CRONJOB: {
            ecs: "k8s.cron_job.ecs";
            semconv: "k8s.cron_job.semconv";
        };
        readonly DAEMONSET: {
            ecs: "k8s.daemonset.ecs";
            semconv: "k8s.daemonset.semconv";
        };
        readonly DEPLOYMENT: {
            ecs: "k8s.deployment.ecs";
            semconv: "k8s.deployment.semconv";
        };
        readonly JOB: {
            ecs: "k8s.job.ecs";
            semconv: "k8s.job.semconv";
        };
        readonly NAMESPACE: {
            ecs: "k8s.namespace.ecs";
            semconv: "k8s.namespace.semconv";
        };
        readonly NODE: {
            ecs: "k8s.node.ecs";
            semconv: "k8s.node.semconv";
        };
        readonly POD: {
            ecs: "k8s.pod.ecs";
            semconv: "k8s.pod.semconv";
        };
        readonly SERVICE: {
            ecs: "k8s.service.ecs";
            semconv: "k8s.service.semconv";
        };
        readonly STATEFULSET: {
            ecs: "k8s.statefulset.ecs";
            semconv: "k8s.statefulset.semconv";
        };
    };
};
