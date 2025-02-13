/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidFeatureId } from '@kbn/rule-data-utils';
import { AlertConsumers } from '@kbn/rule-data-utils';

export const METRICS_INDEX_PATTERN = 'metrics-*,metricbeat-*';
export const LOGS_INDEX_PATTERN = 'logs-*,filebeat-*,kibana_sample_data_logs*';
export const METRICS_APP = 'metrics';
export const LOGS_APP = 'logs';

export const METRICS_FEATURE_ID = AlertConsumers.INFRASTRUCTURE;
export const INFRA_ALERT_FEATURE_ID = AlertConsumers.INFRASTRUCTURE;
export const LOGS_FEATURE_ID = AlertConsumers.LOGS;

export const INFRA_ALERT_CONSUMERS: ValidFeatureId[] = [
  AlertConsumers.INFRASTRUCTURE,
  AlertConsumers.OBSERVABILITY,
  AlertConsumers.LOGS,
  AlertConsumers.SLO,
  AlertConsumers.APM,
  AlertConsumers.ALERTS,
];

export type InfraFeatureId = typeof METRICS_FEATURE_ID | typeof LOGS_FEATURE_ID;

export const TIMESTAMP_FIELD = '@timestamp';
export const TIEBREAKER_FIELD = '_doc';

// system
export const HOST_NAME_FIELD = 'host.name';
export const CONTAINER_ID_FIELD = 'container.id';
export const KUBERNETES_POD_UID_FIELD = 'kubernetes.pod.uid';
export const PROCESS_COMMANDLINE_FIELD = 'process.command_line';
export const EVENT_MODULE = 'event.module';
export const METRICSET_MODULE = 'metricset.module';
export const METRICSET_NAME = 'metricset.name';

// integrations
export const SYSTEM_INTEGRATION = 'system';

// logs
export const MESSAGE_FIELD = 'message';

export const O11Y_AAD_FIELDS = [
  'cloud.*',
  'host.*',
  'orchestrator.*',
  'container.*',
  'labels.*',
  'tags',
];

export const fifteenMinutesInMilliseconds = 15 * 60 * 1000;

export const DEFAULT_METRICS_VIEW_ATTRIBUTES = {
  name: 'Metrics View',
  timeFieldName: TIMESTAMP_FIELD,
};

export const SNAPSHOT_API_MAX_METRICS = 20;
