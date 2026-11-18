/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { chunk } from 'lodash';
import { SLI_DESTINATION_INDEX_PATTERN, SLO_RESOURCES_VERSION } from '../../../../common/constants';
import { isAbortError } from '../../../utils/with_deadline';
import { planSliRetention } from './plan_sli_retention';

const DELETE_CHUNK_SIZE = 50;
// Maximum `size` accepted by the get transforms API.
const TRANSFORMS_PAGE_SIZE = 1_000;

interface Dependencies {
  esClient: ElasticsearchClient;
  logger: Logger;
  signal: AbortSignal;
  now: Date;
  retentionMs: number;
}

const parseDocsCount = (value?: string | null): number | undefined => {
  if (!value) {
    return undefined;
  }
  const count = Number(value);
  return Number.isFinite(count) ? count : undefined;
};

/** Deletes the SLI indices selected by the retention plan, and returns the deleted index names. */
export const runSliRetention = async ({
  esClient,
  logger,
  signal,
  now,
  retentionMs,
}: Dependencies): Promise<string[]> => {
  const catIndices = await esClient.cat.indices(
    {
      index: SLI_DESTINATION_INDEX_PATTERN,
      expand_wildcards: 'all',
      h: ['index', 'docs.count'],
      format: 'json',
    },
    { signal }
  );
  const indices = catIndices.flatMap(({ index, 'docs.count': docsCount }) =>
    index ? [{ index, docsCount: parseDocsCount(docsCount) }] : []
  );

  const transformDestIndices = await fetchTransformDestIndices({ esClient, logger, signal });
  const { agedOut, emptyDated, emptyOldBase } = planSliRetention({
    indices,
    transformDestIndices,
    now,
    retentionMs,
    currentVersion: SLO_RESOURCES_VERSION,
  });

  const toDelete = [...agedOut, ...emptyDated, ...emptyOldBase];
  if (toDelete.length === 0) {
    logger.debug('No SLI index to delete');
    return [];
  }

  logger.info(
    `Deleting ${toDelete.length} SLI indices (aged out: ${agedOut.length}, empty dated: ${emptyDated.length}, empty old base: ${emptyOldBase.length})`
  );

  const deleted: string[] = [];
  try {
    for (const names of chunk(toDelete, DELETE_CHUNK_SIZE)) {
      signal.throwIfAborted();
      await esClient.indices.delete(
        { index: names, ignore_unavailable: true, expand_wildcards: 'all' },
        { signal }
      );
      deleted.push(...names);
      logger.info(`Deleted SLI indices: [${names.join(', ')}]`);
    }
  } catch (error) {
    if (!isAbortError(error, signal)) {
      throw error;
    }
    logger.debug(`SLI retention aborted after deleting ${deleted.length} indices`);
  }

  return deleted;
};

// Returns the destination indices of the SLO transforms, or undefined when they cannot be listed.
const fetchTransformDestIndices = async ({
  esClient,
  logger,
  signal,
}: Pick<Dependencies, 'esClient' | 'logger' | 'signal'>): Promise<Set<string> | undefined> => {
  try {
    const destIndices = new Set<string>();
    let listed = 0;
    let total = 0;
    do {
      const { count, transforms = [] } = await esClient.transform.getTransform(
        {
          transform_id: 'slo-*',
          from: listed,
          size: TRANSFORMS_PAGE_SIZE,
          allow_no_match: true,
          // Only the destination indices are read: skip the multi-KB transform configs.
          filter_path: 'count,transforms.dest.index',
        },
        { signal }
      );
      if (transforms.length === 0) {
        total = count;
        break;
      }
      transforms.forEach(({ dest }) => dest.index && destIndices.add(dest.index));
      listed += transforms.length;
      total = count;
    } while (listed < total);

    if (listed < total) {
      logger.warn(`Listed ${listed} of ${total} SLO transforms, keeping old SLI base indices`);
      return undefined;
    }
    return destIndices;
  } catch (error) {
    if (isAbortError(error, signal)) {
      throw error;
    }
    logger.warn(`Failed to list SLO transforms, keeping old SLI base indices: ${error.message}`);
    return undefined;
  }
};
