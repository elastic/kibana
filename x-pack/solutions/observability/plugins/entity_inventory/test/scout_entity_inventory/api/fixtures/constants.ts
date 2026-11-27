/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-oblt';

export const K8S_ARCHIVE =
  'x-pack/solutions/observability/plugins/entity_inventory/test/scout_entity_inventory/common/es_archives/k8s_deployment';

// The archive's time-series indices and the template that lets them be plain indices (see index.ts).
export const K8S_TSDS_INDEX = 'metrics-k8sclusterreceiver.otel-tsds';
export const K8S_STATE_TSDS_INDEX = 'metrics-kubernetes.state_deployment-tsds';
export const K8S_TSDS_INDEX_TEMPLATE = 'entity-inventory-scout-k8s-tsds-index';

// Templates the archive installs for its data streams. Scout-specific names and exact stream patterns
// keep them from overwriting or matching the Fleet integration's `metrics-kubernetes.*` templates.
export const K8S_FIXTURE_DATA_STREAM_TEMPLATES = {
  'metrics-kubernetes.state_deployment-default': 'entity-inventory-scout-state-deployment',
  'metrics-k8sclusterreceiver.otel-default': 'entity-inventory-scout-k8sclusterreceiver-otel',
} as const;

// Plain indices the archive creates. Deleting them also removes the `otel-filtered` alias.
export const K8S_FIXTURE_PLAIN_INDICES = [
  K8S_TSDS_INDEX,
  K8S_STATE_TSDS_INDEX,
  'entity-inventory-scout-aliased-standard',
  'entity-inventory-scout-aliased-tsds',
];

// Everything the archive creates that a source pattern reaches: data streams, plain indices and the
// filtered alias.
const K8S_FIXTURE_INDICES = [
  'metrics-kubernetes.state_deployment-default',
  K8S_STATE_TSDS_INDEX,
  'metrics-k8sclusterreceiver.otel-default',
  K8S_TSDS_INDEX,
  'metrics-k8sclusterreceiver.otel-filtered',
];

const readerRole = (names: string[]): KibanaRole => ({
  elasticsearch: {
    cluster: [],
    indices: [{ names, privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [{ base: ['read'], feature: {}, spaces: ['*'] }],
});

/** Reads only the archive, so indices other suites leave on the cluster cannot add rows. */
export const K8S_FIXTURE_READER_ROLE = readerRole(K8S_FIXTURE_INDICES);

/** Reads the archive except the Agent time-series index, so the Agent source has no `TS` plan. */
export const K8S_FIXTURE_READER_WITHOUT_AGENT_TSDS_ROLE = readerRole(
  K8S_FIXTURE_INDICES.filter((name) => name !== K8S_STATE_TSDS_INDEX)
);

export const TYPES_PATH = 'internal/entity_inventory/types';
export const LIST_PATH = 'internal/entity_inventory/entities/{type}/_list';
export const FILTER_VALUES_PATH = 'internal/entity_inventory/filters/_values';

export const listPath = (type: string): string => LIST_PATH.replace('{type}', type);

export const INTERNAL_HEADERS = {
  'x-elastic-internal-origin': 'kibana',
  'kbn-xsrf': 'true',
};
