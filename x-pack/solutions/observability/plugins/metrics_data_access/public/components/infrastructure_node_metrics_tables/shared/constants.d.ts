/** ECS (Elastic Common Schema) container metric field names */
export declare const ECS_CONTAINER_CPU_USAGE_LIMIT_PCT = "kubernetes.container.cpu.usage.limit.pct";
export declare const ECS_CONTAINER_MEMORY_USAGE_BYTES = "kubernetes.container.memory.usage.bytes";
/** SemConv K8s (Kubernetes container) metric field names — require resource limits to be set */
export declare const SEMCONV_K8S_CONTAINER_CPU_LIMIT_UTILIZATION = "metrics.k8s.container.cpu_limit_utilization";
export declare const SEMCONV_K8S_CONTAINER_MEMORY_LIMIT_UTILIZATION = "metrics.k8s.container.memory_limit_utilization";
/** SemConv container metrics always emitted by kubeletstats (no limits required) */
export declare const SEMCONV_CONTAINER_CPU_USAGE = "metrics.container.cpu.usage";
export declare const SEMCONV_CONTAINER_MEMORY_WORKING_SET = "metrics.container.memory.working_set";
/** SemConv container metric names used in UI tooltips (generic / display) */
export declare const SEMCONV_DOCKER_CONTAINER_CPU_UTILIZATION = "metrics.container.cpu.utilization";
export declare const SEMCONV_DOCKER_CONTAINER_MEMORY_PERCENT = "metrics.container.memory.percent";
/** ECS / system host metric field names */
export declare const SYSTEM_CPU_CORES = "system.cpu.cores";
export declare const SYSTEM_CPU_TOTAL_NORM_PCT = "system.cpu.total.norm.pct";
export declare const SYSTEM_MEMORY_TOTAL = "system.memory.total";
export declare const SYSTEM_MEMORY_USED_PCT = "system.memory.used.pct";
/** SemConv (OpenTelemetry) host metric field names */
export declare const SEMCONV_SYSTEM_CPU_LOGICAL_COUNT = "metrics.system.cpu.logical.count";
export declare const SEMCONV_SYSTEM_CPU_UTILIZATION = "metrics.system.cpu.utilization";
export declare const SEMCONV_SYSTEM_MEMORY_TOTAL = "metrics.system.memory.total";
export declare const SEMCONV_SYSTEM_MEMORY_USAGE = "metrics.system.memory.usage";
export declare const SEMCONV_SYSTEM_MEMORY_UTILIZATION = "metrics.system.memory.utilization";
/** ECS (Elastic Common Schema) pod metric field names */
export declare const ECS_POD_CPU_USAGE_LIMIT_PCT = "kubernetes.pod.cpu.usage.limit.pct";
/** Derived/custom metric name used in both ECS and SemConv */
export declare const MEMORY_LIMIT_UTILIZATION = "memory_limit_utilization";
/** ECS custom metric sub-fields (node memory for equation) */
export declare const KUBERNETES_NODE_MEMORY_ALLOCATABLE_BYTES = "kubernetes.node.memory.allocatable.bytes";
export declare const KUBERNETES_NODE_MEMORY_USAGE_BYTES = "kubernetes.node.memory.usage.bytes";
/** SemConv K8s pod metric field names — require resource limits to be set */
export declare const SEMCONV_K8S_POD_CPU_LIMIT_UTILIZATION = "metrics.k8s.pod.cpu_limit_utilization";
export declare const SEMCONV_K8S_POD_MEMORY_LIMIT_UTILIZATION = "metrics.k8s.pod.memory_limit_utilization";
/** SemConv K8s pod metrics always emitted by kubeletstats (no limits required) */
export declare const SEMCONV_K8S_POD_CPU_NODE_UTILIZATION = "metrics.k8s.pod.cpu.node.utilization";
export declare const SEMCONV_K8S_POD_MEMORY_WORKING_SET = "metrics.k8s.pod.memory.working_set";
/**
 * Builds a KQL source filter that matches OTel data regardless of whether the
 * dataset value is stored under `data_stream.dataset` or `event.dataset`.
 */
export declare const otelDatasetFilter: (dataset: string) => string;
