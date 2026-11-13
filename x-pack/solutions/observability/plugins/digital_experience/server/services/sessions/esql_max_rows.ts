/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

/**
 * Rows an ES|QL response holds whatever its `LIMIT`, as `esql.query.result_truncation_max_size`
 * has it out of the box. A response is cut to it silently, without a warning or a partial flag,
 * so a query that could return more rows has to ask what the cut is rather than notice it.
 */
export const ESQL_DEFAULT_MAX_ROWS = 10_000;

const TRUNCATION_SETTING = 'esql.query.result_truncation_max_size';

/**
 * The rows the cluster lets an ES|QL response hold, never more than the default: the summaries
 * split a batch whose response reaches it, and a cluster that raised the setting gains nothing
 * from larger responses, while one that lowered it would otherwise drop sessions without a word.
 *
 * Read as the internal user, like the index template: it is the cluster's own setting, not the
 * data the task reads, and the task's API key is not granted `monitor`. A cluster that refuses
 * the read, as serverless does, keeps the default, which is the value it runs with anyway.
 */
export const esqlMaxRows = async (
  internalClient: ElasticsearchClient,
  signal?: AbortSignal
): Promise<number> => {
  let settings;
  try {
    settings = await internalClient.cluster.getSettings(
      { flat_settings: true, include_defaults: true },
      { signal }
    );
  } catch {
    return ESQL_DEFAULT_MAX_ROWS;
  }
  const configured =
    settings.transient?.[TRUNCATION_SETTING] ??
    settings.persistent?.[TRUNCATION_SETTING] ??
    settings.defaults?.[TRUNCATION_SETTING];
  const rows = Number(configured);
  return Number.isInteger(rows) && rows > 0
    ? Math.min(rows, ESQL_DEFAULT_MAX_ROWS)
    : ESQL_DEFAULT_MAX_ROWS;
};
