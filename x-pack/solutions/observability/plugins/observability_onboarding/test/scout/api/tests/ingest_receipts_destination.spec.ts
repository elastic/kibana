/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import {
  INGEST_RECEIPTS_DATA_STREAM,
  INGEST_RECEIPTS_INDEX_TEMPLATE,
  INGEST_RECEIPTS_RETENTION,
} from '../../../../common/ingest_receipts';
import { apiTest } from '../fixtures';

// The installer is fire and forget, so Kibana can serve HTTP before it has finished on a slow boot.
const INSTALL_TIMEOUT_MS = 30_000;

// Stateful Scout runs have no managed OTLP service URL, so the installer correctly does nothing there.
apiTest.describe(
  'Ingest receipts destination',
  { tag: [...tags.serverless.observability.complete] },
  () => {
    apiTest('installs a hidden index template for the receipts stream', async ({ esClient }) => {
      const getIndexTemplate = () =>
        esClient.indices.getIndexTemplate({ name: INGEST_RECEIPTS_INDEX_TEMPLATE });
      await expect
        .poll(() => getIndexTemplate().catch(() => undefined), { timeout: INSTALL_TIMEOUT_MS })
        .toBeDefined();
      const response = await getIndexTemplate();

      expect(response.index_templates).toHaveLength(1);
      const [{ index_template: indexTemplate }] = response.index_templates;
      expect(indexTemplate.index_patterns).toStrictEqual([INGEST_RECEIPTS_DATA_STREAM]);
      expect(indexTemplate.data_stream?.hidden).toBe(true);
      expect(indexTemplate.template?.mappings?.dynamic).toBe('strict');
      expect(indexTemplate.template?.lifecycle?.data_retention).toBe(INGEST_RECEIPTS_RETENTION);
    });

    apiTest('creates the hidden receipts data stream with retention', async ({ esClient }) => {
      const getDataStream = () =>
        esClient.indices.getDataStream({
          name: INGEST_RECEIPTS_DATA_STREAM,
          expand_wildcards: 'all',
        });
      await expect
        .poll(() => getDataStream().catch(() => undefined), { timeout: INSTALL_TIMEOUT_MS })
        .toBeDefined();
      const response = await getDataStream();

      expect(response.data_streams).toHaveLength(1);
      const [dataStream] = response.data_streams;
      expect(dataStream.name).toBe(INGEST_RECEIPTS_DATA_STREAM);
      expect(dataStream.hidden).toBe(true);
      expect(dataStream.template).toBe(INGEST_RECEIPTS_INDEX_TEMPLATE);
      expect(dataStream.lifecycle?.data_retention).toBe(INGEST_RECEIPTS_RETENTION);
    });
  }
);
