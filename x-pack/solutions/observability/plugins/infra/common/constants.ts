/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidFeatureId } from '@kbn/rule-data-utils';
import { AlertConsumers } from '@kbn/rule-data-utils';
export {
  HOST_NAME as HOST_NAME_FIELD,
  HOST_HOSTNAME as HOST_HOSTNAME_FIELD,
  CONTAINER_ID as CONTAINER_ID_FIELD,
  KUBERNETES_POD_UID as KUBERNETES_POD_UID_FIELD,
} from '@kbn/metrics-data-access-plugin/common';

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

// processes
export const TOP_N = 10;
export const MANDATORY_PROCESS_FIELDS_ECS = [
  'system.process.cpu.total.pct',
  'system.process.memory.rss.pct',
  'system.process.cpu.start_time',
  'system.process.state',
  'user.name',
  'process.pid',
  'process.command_line',
];
export const MANDATORY_PROCESS_FIELDS_SEMCONV = [
  'process.pid',
  'process.command_line',
  'process.owner',
];
export const PROCESS_COMMANDLINE_FIELD = 'process.command_line';

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

export const SCHEMA_SELECTOR_DOCS_LINK = 'https://ela.st/schema-selector-hosts';
