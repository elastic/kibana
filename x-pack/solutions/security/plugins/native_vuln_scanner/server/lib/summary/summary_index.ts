/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { SUMMARY_INDEX } from './constants';
import type { SummaryDoc } from './constants';
import { summaryMappings } from './mappings';

const isAlreadyExists = (error: unknown): boolean =>
  (error as { body?: { error?: { type?: string } } })?.body?.error?.type ===
  'resource_already_exists_exception';

/** Creates the summary index, or brings an existing one's mapping up to date. */
export const ensureSummaryIndex = async (es: ElasticsearchClient): Promise<void> => {
  try {
    await es.indices.create({
      index: SUMMARY_INDEX,
      settings: { hidden: true, number_of_shards: 1, auto_expand_replicas: '0-1' },
      mappings: summaryMappings,
    });
    return;
  } catch (error) {
    if (!isAlreadyExists(error)) throw error;
  }
  await es.indices.putMapping({ index: SUMMARY_INDEX, ...summaryMappings });
};

/** Writes one run's summary under its run id. */
export const writeSummary = async (es: ElasticsearchClient, doc: SummaryDoc): Promise<void> => {
  await es.index({ index: SUMMARY_INDEX, id: doc.run_id, document: doc });
};
