/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiEndpointId } from './api_endpoints';

export const INGEST_RECEIPTS_DATA_STREAM = '.kibana-observability-onboarding-receipts';
export const INGEST_RECEIPTS_INDEX_TEMPLATE = 'kibana-observability-onboarding-receipts';
export const INGEST_RECEIPTS_RETENTION = '2d';
export const INGEST_RECEIPTS_SCHEMA_VERSION = 1;
export const INGEST_RECEIPTS_RECENCY_WINDOW = '15m';

// Field names are the contract with the managed OTel collector (HOC#3528). Change them here only.
export const INGEST_RECEIPT_FIELDS = {
  timestamp: '@timestamp',
  schemaVersion: 'schemaVersion',
  apiKeyId: 'apiKeyId',
  targetId: 'targetId',
  targetType: 'targetType',
  endpointId: 'endpointId',
  ingestPath: 'ingestPath',
  signal: 'signal',
} as const;

export type ReceiptSignal = 'logs' | 'metrics' | 'traces';

export interface ReceiptSelector {
  endpointId: string;
  ingestPath: string;
  signal?: ReceiptSignal;
}

// TODO(contract): collector classifier values are not pinned yet (HOC#3528). Nothing reads this map.
export const INGEST_RECEIPT_SELECTORS: Partial<Record<ApiEndpointId, readonly ReceiptSelector[]>> =
  {
    [ApiEndpointId.Elasticsearch]: [{ endpointId: 'TODO(contract)', ingestPath: 'TODO(contract)' }],
    [ApiEndpointId.Prometheus]: [{ endpointId: 'TODO(contract)', ingestPath: 'TODO(contract)' }],
    [ApiEndpointId.OpenTelemetry]: [
      { endpointId: 'TODO(contract)', ingestPath: 'TODO(contract)' },
      { endpointId: 'TODO(contract)', ingestPath: 'TODO(contract)' },
      { endpointId: 'TODO(contract)', ingestPath: 'TODO(contract)' },
    ],
  };
