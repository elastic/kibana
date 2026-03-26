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
export const KUBERNETES_POD_UID = 'kubernetes.pod.uid';

export const HOST_OS_NAME = 'host.os.name';
export const CLOUD_PROVIDER = 'cloud.provider';
export const SERVICE_NAME = 'service.name';
export const EVENT_MODULE = 'event.module';

export const METRICSET_MODULE = 'metricset.module';
export const METRICSET_NAME = 'metricset.name';
export const DATASTREAM_DATASET = 'data_stream.dataset';
export const EVENT_DATASET = 'event.dataset';

// otel
export const OS_NAME = 'os.name';

// integrations
export const SYSTEM_INTEGRATION = 'system';
export const HOST_METRICS_RECEIVER_OTEL = 'hostmetricsreceiver.otel';
export const KUBELET_STATS_RECEIVER_OTEL = 'kubeletstatsreceiver.otel';
