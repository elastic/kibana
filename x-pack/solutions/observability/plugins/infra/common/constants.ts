/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidFeatureId } from '@kbn/rule-data-utils';
import { AlertConsumers } from '@kbn/rule-data-utils';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
export {
  HOST_NAME as HOST_NAME_FIELD,
  HOST_HOSTNAME as HOST_HOSTNAME_FIELD,
  CONTAINER_ID as CONTAINER_ID_FIELD,
  KUBERNETES_POD_UID as KUBERNETES_POD_UID_FIELD,
} from '@kbn/metrics-data-access-plugin/common';

export const DEFAULT_SCHEMA: DataSchemaFormat = 'semconv';

export const METRICS_INDEX_PATTERN = 'metrics-*,metricbeat-*';
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

export const MAX_HOST_COUNT_LIMIT = 10000;

// P10 — page-size contract shared by the Phase A `/host/list` and Phase B
// `/host/metrics` endpoints and the Hosts UI table.
//
// `HOSTS_TABLE_PAGE_SIZE_OPTIONS` is the source of truth for what page
// sizes the UI offers; the table's EuiBasicTable picks one of these for the
// "rows per page" dropdown and sends the chosen value down to Phase A in
// `page.size` and (transitively) to Phase B via `names.length`. Phase B's
// per-host work scales linearly with `names.length`, so this list is also
// what bounds the maximum query cost a single Phase B call can incur —
// `MAX_HOSTS_PER_METRICS_REQUEST` below is derived from it so the two can
// never drift.
//
// Order matters: smallest first; `HOSTS_TABLE_DEFAULT_PAGE_SIZE` is the
// initial selection for a fresh URL state.
export const HOSTS_TABLE_PAGE_SIZE_OPTIONS = [5, 10, 20] as const;
export const HOSTS_TABLE_DEFAULT_PAGE_SIZE = 10;

// Defence-in-depth upper bound on `names.length` for Phase B. Derived from
// the UI's page-size options so a future product change (e.g. adding a "50
// rows per page" option) automatically widens the server cap without a
// second edit. Sending more than this is treated as a malformed client and
// rejected at the route validator — Phase B's cost model assumes the page
// bound holds.
export const MAX_HOSTS_PER_METRICS_REQUEST = Math.max(...HOSTS_TABLE_PAGE_SIZE_OPTIONS);
