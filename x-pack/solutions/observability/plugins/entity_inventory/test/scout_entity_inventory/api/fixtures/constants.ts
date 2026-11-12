/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const K8S_ARCHIVE =
  'x-pack/solutions/observability/plugins/entity_inventory/test/scout_entity_inventory/common/es_archives/k8s_deployment';

// The archive's time-series index and the template that lets it be a plain index (see index.ts).
export const K8S_TSDS_INDEX = 'metrics-k8sclusterreceiver.otel-tsds';
export const K8S_TSDS_INDEX_TEMPLATE = 'entity-inventory-scout-k8s-tsds-index';

export const TYPES_PATH = 'internal/entity_inventory/types';
export const LIST_PATH = 'internal/entity_inventory/entities/{type}/_list';

export const listPath = (type: string): string => LIST_PATH.replace('{type}', type);

export const INTERNAL_HEADERS = {
  'x-elastic-internal-origin': 'kibana',
  'kbn-xsrf': 'true',
};
