/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const METRICS_EXPLORER_API_MAX_METRICS = 20;

export const TIMESTAMP = '@timestamp';
export const HOST_NAME = 'host.name';
export const HOST_HOSTNAME = 'host.hostname';
export const CONTAINER_ID = 'container.id';
/** Metricbeat / ECS pod identity. */
export const KUBERNETES_POD_UID = 'kubernetes.pod.uid';
/** OpenTelemetry / SemConv pod identity. */
export const K8S_POD_UID = 'k8s.pod.uid';
export const K8S_POD_NAME = 'k8s.pod.name';
export const K8S_NAMESPACE_NAME = 'k8s.namespace.name';
export const K8S_NODE_NAME = 'k8s.node.name';
export const K8S_DEPLOYMENT_NAME = 'k8s.deployment.name';

export const HOST_OS_NAME = 'host.os.name';
export const CLOUD_PROVIDER = 'cloud.provider';
export const SERVICE_NAME = 'service.name';
export const EVENT_MODULE = 'event.module';

export const METRICSET_MODULE = 'metricset.module';
export const METRICSET_NAME = 'metricset.name';
export const DATASTREAM_DATASET = 'data_stream.dataset';
export const EVENT_DATASET = 'event.dataset';

// otel
export const OS_TYPE = 'os.type';

// integrations
export const SYSTEM_INTEGRATION = 'system';
export const HOST_METRICS_RECEIVER_OTEL = 'hostmetricsreceiver.otel';
export const KUBELET_STATS_RECEIVER_OTEL = 'kubeletstatsreceiver.otel';

export const SEMCONV_K8S_POD_CPU_LIMIT_UTILIZATION = 'metrics.k8s.pod.cpu_limit_utilization';
export const SEMCONV_K8S_POD_CPU_NODE_UTILIZATION = 'metrics.k8s.pod.cpu.node.utilization';
export const SEMCONV_K8S_POD_MEMORY_LIMIT_UTILIZATION = 'metrics.k8s.pod.memory_limit_utilization';
export const SEMCONV_K8S_POD_MEMORY_NODE_UTILIZATION = 'metrics.k8s.pod.memory.node.utilization';
export const SEMCONV_K8S_POD_MEMORY_WORKING_SET = 'metrics.k8s.pod.memory.working_set';
export const SEMCONV_K8S_POD_NETWORK_IO = 'metrics.k8s.pod.network.io';
