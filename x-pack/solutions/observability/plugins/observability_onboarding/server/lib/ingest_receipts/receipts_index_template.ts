/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  INGEST_RECEIPTS_DATA_STREAM,
  INGEST_RECEIPTS_INDEX_TEMPLATE,
  INGEST_RECEIPTS_RETENTION,
  INGEST_RECEIPTS_SCHEMA_VERSION,
  INGEST_RECEIPT_FIELDS,
} from '../../../common/ingest_receipts';

export const getReceiptsIndexTemplate = (): IndicesPutIndexTemplateRequest => ({
  name: INGEST_RECEIPTS_INDEX_TEMPLATE,
  index_patterns: [INGEST_RECEIPTS_DATA_STREAM],
  data_stream: { hidden: true },
  priority: 500,
  _meta: {
    managed: true,
    managedBy: 'observability_onboarding',
    schemaVersion: INGEST_RECEIPTS_SCHEMA_VERSION,
  },
  template: {
    settings: {
      'index.hidden': true,
      'index.number_of_shards': 1,
    },
    lifecycle: { data_retention: INGEST_RECEIPTS_RETENTION },
    mappings: {
      dynamic: 'strict',
      properties: {
        [INGEST_RECEIPT_FIELDS.timestamp]: { type: 'date' },
        [INGEST_RECEIPT_FIELDS.schemaVersion]: { type: 'integer' },
        [INGEST_RECEIPT_FIELDS.apiKeyId]: { type: 'keyword' },
        [INGEST_RECEIPT_FIELDS.targetId]: { type: 'keyword' },
        [INGEST_RECEIPT_FIELDS.targetType]: { type: 'keyword' },
        [INGEST_RECEIPT_FIELDS.endpointId]: { type: 'keyword' },
        [INGEST_RECEIPT_FIELDS.ingestPath]: { type: 'keyword' },
        [INGEST_RECEIPT_FIELDS.signal]: { type: 'keyword' },
      },
    },
  },
});
