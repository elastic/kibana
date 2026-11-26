/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GeneratorContext } from '../types';
import { compileDataStartQuery } from './compile_known_failure_query';

const MINUTE_MS = 60_000;

/**
 * Reads when the data of a knowledge indicator's index begins, from `from` on, as the start of that
 * minute, and throws when there is no data from `from` on. Remembered per query for the
 * tick, so the indicators of one `FROM` whose rules ran in the same minute share one read.
 */
export function memoizeDataStart({ esClient, cpsEnabled, abortSignal }: GeneratorContext) {
  const dataFromByQuery = new Map<string, Promise<number>>();
  return ({ esql, from }: { esql: string; from: number }): Promise<number> => {
    const query = compileDataStartQuery({ esql, from, cpsEnabled });
    const cached = dataFromByQuery.get(query);
    if (cached) {
      return cached;
    }
    // Whole or not at all: a shard with the older documents failing would move the start later
    // and hide a real breach, where a failed lookup fails open.
    const dataFrom = esClient.esql
      .query({ query, allow_partial_results: false }, { signal: abortSignal })
      .then(({ values }) => {
        const [[first] = []] = values;
        const firstMs = typeof first === 'string' ? Date.parse(first) : Number.NaN;
        if (!Number.isFinite(firstMs)) {
          // The rule counted matches in this range, so an empty answer contradicts it: the service
          // account may not see the index the rule reads. The caller notes it and fails open.
          throw new Error('found no data where the rule counted matches');
        }
        return Math.floor(firstMs / MINUTE_MS) * MINUTE_MS;
      });
    dataFromByQuery.set(query, dataFrom);
    return dataFrom;
  };
}
