/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ProfilingESClient } from '@kbn/profiling-data-access-plugin/server';
import { PROFILING_EVENTS_INDEX_BY_SCHEMA, ProfilingSchema } from '@kbn/profiling-utils';
import type { ProjectTimeQuery } from './query';

export interface DownsampledEventsIndex {
  name: string;
  sampleRate: number;
}

function getFullDownsampledIndex(schema: ProfilingSchema, pow: number, factor: number): string {
  const downsampledIndex = `profiling-events-${factor}pow${pow.toString().padStart(2, '0')}`;
  return schema === ProfilingSchema.OTEL ? `${downsampledIndex}.otel-*` : downsampledIndex;
}

// Return the index that has between targetSampleSize..targetSampleSize*samplingFactor entries.
// The starting point is the number of entries from the profiling-events-5pow<initialExp> index.
//
// More details on how the down-sampling works can be found at the write path
//   https://github.com/elastic/prodfiler/blob/bdcc2711c6cd7e89d63b58a17329fb9fdbabe008/pf-elastic-collector/elastic.go
export function getSampledTraceEventsIndex(
  schema: ProfilingSchema,
  targetSampleSize: number,
  sampleCountFromInitialExp: number,
  initialExp: number
): DownsampledEventsIndex {
  const maxExp = 11;
  const samplingFactor = 5;
  const fullEventsIndex: DownsampledEventsIndex = {
    name: PROFILING_EVENTS_INDEX_BY_SCHEMA[schema],
    sampleRate: 1,
  };

  if (sampleCountFromInitialExp === 0) {
    // Take the shortcut to the full events index.
    return fullEventsIndex;
  }

  let pow = Math.floor(
    initialExp -
      Math.log((targetSampleSize * samplingFactor) / sampleCountFromInitialExp) / Math.log(5) +
      1
  );

  if (pow < 1) {
    return fullEventsIndex;
  }

  if (pow > maxExp) {
    pow = maxExp;
  }

  return {
    name: getFullDownsampledIndex(schema, pow, samplingFactor),
    sampleRate: 1 / samplingFactor ** pow,
  };
}

export async function findDownsampledIndex({
  logger,
  client,
  schema,
  filter,
  sampleSize,
}: {
  logger: Logger;
  client: ProfilingESClient;
  schema: ProfilingSchema;
  filter: ProjectTimeQuery;
  sampleSize: number;
}): Promise<DownsampledEventsIndex> {
  // Start with counting the results in the index down-sampled by 5^6.
  // That is in the middle of our down-sampled indexes.
  const initialExp = 6;
  let sampleCountFromInitialExp = 0;
  try {
    const resp = await client.search('find_downsampled_index', {
      index: getFullDownsampledIndex(schema, initialExp, 5),
      query: filter,
      size: 0,
      track_total_hits: true,
    });
    sampleCountFromInitialExp = resp.hits.total.value;
  } catch (e) {
    logger.error(e.message);
  }

  return getSampledTraceEventsIndex(schema, sampleSize, sampleCountFromInitialExp, initialExp);
}
