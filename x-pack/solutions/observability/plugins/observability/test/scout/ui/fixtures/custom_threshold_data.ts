/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

/**
 * Backing index + saved data view for the full custom-threshold creation form
 * spec (`custom_threshold_full_form.spec.ts`).
 *
 * The FTR equivalent loaded the `infra/metrics_and_logs` es_archive and created a
 * `metricbeat-*` data view. The custom-threshold form's aggregation-field and
 * group-by EuiComboBoxes are populated *only* from the selected data view's ES
 * field caps (no free-text/`onCreateOption`), so the test needs a real index
 * exposing the exact fields the form selects:
 *   - `metricset.rtt`          -> numeric (offered for the `avg` aggregation)
 *   - `docker.container.name`  -> aggregatable keyword (offered for "group by")
 *   - `@timestamp`             -> required time field for the data view
 *
 * Rather than restore the multi-MB archive we index a couple of docs directly
 * (mirroring the Batch 0 `generateObservabilityAlerts` `esClient.bulk` approach),
 * which is all field caps needs.
 */
export const CUSTOM_THRESHOLD_METRICS_INDEX = 'metricbeat-scout-custom-threshold';

export const CUSTOM_THRESHOLD_DATA_VIEW = {
  id: 'scout-custom-threshold-data-view',
  name: 'metricbeat-scout-custom-threshold',
  title: 'metricbeat-*',
  timeFieldName: '@timestamp',
} as const;

const TIMESTAMP = '2021-10-19T15:00:00.000Z';

/**
 * Creates the `metricbeat-*` backing index with an explicit mapping (so
 * `docker.container.name` is a top-level aggregatable `keyword`, matching the
 * FTR archive, rather than the dynamic `text` + `.keyword` split) and indexes a
 * small, deterministic set of metric documents.
 */
export async function generateCustomThresholdMetrics(esClient: Client): Promise<void> {
  await esClient.indices.delete({ index: CUSTOM_THRESHOLD_METRICS_INDEX }, { ignore: [404] });

  await esClient.indices.create({
    index: CUSTOM_THRESHOLD_METRICS_INDEX,
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        metricset: { properties: { rtt: { type: 'long' } } },
        service: { properties: { name: { type: 'keyword' } } },
        docker: { properties: { container: { properties: { name: { type: 'keyword' } } } } },
      },
    },
  });

  const operations = Array.from({ length: 5 }, (_, index) => [
    { index: { _index: CUSTOM_THRESHOLD_METRICS_INDEX } },
    {
      '@timestamp': TIMESTAMP,
      metricset: { rtt: 100 + index },
      service: { name: 'opbeans-node' },
      docker: { container: { name: `scout-container-${index}` } },
    },
  ]).flat();

  await esClient.bulk({ operations, refresh: 'wait_for' });
}

/** Removes the backing index created by {@link generateCustomThresholdMetrics}. */
export async function cleanupCustomThresholdMetrics(esClient: Client): Promise<void> {
  await esClient.indices.delete({ index: CUSTOM_THRESHOLD_METRICS_INDEX }, { ignore: [404] });
}
