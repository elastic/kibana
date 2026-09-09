/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INGEST_RECEIPTS_DATA_STREAM,
  INGEST_RECEIPTS_INDEX_TEMPLATE,
  INGEST_RECEIPTS_RETENTION,
  INGEST_RECEIPTS_SCHEMA_VERSION,
} from '../../../common/ingest_receipts';
import { getReceiptsIndexTemplate } from './receipts_index_template';

describe('getReceiptsIndexTemplate', () => {
  const template = getReceiptsIndexTemplate();

  it('targets only the receipts data stream by exact name', () => {
    expect(template.name).toBe(INGEST_RECEIPTS_INDEX_TEMPLATE);
    expect(template.index_patterns).toEqual([INGEST_RECEIPTS_DATA_STREAM]);
  });

  it('hides the data stream and its backing indices', () => {
    expect(template.data_stream).toEqual({ hidden: true });
    expect(template.template?.settings).toEqual({
      'index.hidden': true,
      'index.number_of_shards': 1,
    });
  });

  it('uses data stream lifecycle retention only', () => {
    expect(template.template?.lifecycle).toEqual({ data_retention: INGEST_RECEIPTS_RETENTION });
  });

  it('rejects unmapped fields and maps every receipt field', () => {
    expect(template.template?.mappings).toEqual({
      dynamic: 'strict',
      properties: {
        '@timestamp': { type: 'date' },
        schemaVersion: { type: 'integer' },
        apiKeyId: { type: 'keyword' },
        targetId: { type: 'keyword' },
        targetType: { type: 'keyword' },
        endpointId: { type: 'keyword' },
        ingestPath: { type: 'keyword' },
        signal: { type: 'keyword' },
      },
    });
  });

  it('sets priority and ownership metadata', () => {
    expect(template.priority).toBe(500);
    expect(template._meta).toEqual({
      managed: true,
      managedBy: 'observability_onboarding',
      schemaVersion: INGEST_RECEIPTS_SCHEMA_VERSION,
    });
  });

  it('matches the agreed template exactly', () => {
    expect(template).toEqual({
      name: 'kibana-observability-onboarding-receipts',
      index_patterns: ['.kibana-observability-onboarding-receipts'],
      data_stream: { hidden: true },
      priority: 500,
      _meta: { managed: true, managedBy: 'observability_onboarding', schemaVersion: 1 },
      template: {
        settings: { 'index.hidden': true, 'index.number_of_shards': 1 },
        lifecycle: { data_retention: '2d' },
        mappings: {
          dynamic: 'strict',
          properties: {
            '@timestamp': { type: 'date' },
            schemaVersion: { type: 'integer' },
            apiKeyId: { type: 'keyword' },
            targetId: { type: 'keyword' },
            targetType: { type: 'keyword' },
            endpointId: { type: 'keyword' },
            ingestPath: { type: 'keyword' },
            signal: { type: 'keyword' },
          },
        },
      },
    });
  });
});
