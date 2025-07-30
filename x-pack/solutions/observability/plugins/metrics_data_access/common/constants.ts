/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const METRICS_EXPLORER_API_MAX_METRICS = 20;

export const TIMESTAMP_FIELD = '@timestamp';
export const HOST_NAME_FIELD = 'host.name';
export const CONTAINER_ID_FIELD = 'container.id';
export const KUBERNETES_POD_UID_FIELD = 'kubernetes.pod.uid';

export const EVENT_MODULE = 'event.module';
export const METRICSET_MODULE = 'metricset.module';
export const METRICSET_NAME = 'metricset.name';
export const DATASTREAM_DATASET = 'data_stream.dataset';

// integrations
export const SYSTEM_INTEGRATION = 'system';
export const HOST_METRICS_RECEIVER_OTEL = 'hostmetricsreceiver.otel';
