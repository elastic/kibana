/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, SavedObjectsClientContract } from '@kbn/core/server';
import {
  Duration,
  DurationUnit,
  type BulkPurgeSummaryParams,
  type BulkPurgeSummaryResponse,
} from '@kbn/slo-schema';
import { SUMMARY_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { IllegalArgumentError } from '../errors';
import { getSloSettings } from './slo_settings';

interface Dependencies {
  scopedClusterClient: IScopedClusterClient;
  spaceId: string;
  soClient: SavedObjectsClientContract;
}

export async function bulkPurgeSummary(
  params: BulkPurgeSummaryParams,
  { scopedClusterClient, spaceId, soClient }: Dependencies
): Promise<BulkPurgeSummaryResponse> {
  const settings = await getSloSettings(soClient);
  const defaultStaleDuration = new Duration(settings.staleThresholdInHours, DurationUnit.Hour);

  const list = params.list ?? [];
  const staleDuration = params.staleDuration ?? defaultStaleDuration;
  const force = Boolean(params.force);

  if (!force && staleDuration.isShorterThan(defaultStaleDuration)) {
    throw new IllegalArgumentError(
      `staleDuration cannot be shorter than the overall SLO stale threshold of [${defaultStaleDuration.format()}]. Use force=true to override.`
    );
  }

  const response = await scopedClusterClient.asCurrentUser.deleteByQuery({
    index: SUMMARY_DESTINATION_INDEX_PATTERN,
    refresh: false,
    wait_for_completion: false,
    conflicts: 'proceed',
    slices: 'auto',
    query: {
      bool: {
        must: [
          { term: { spaceId } },
          {
            range: {
              summaryUpdatedAt: {
                lte: `now-${staleDuration.format()}`,
              },
            },
          },
          ...(list.length > 0 ? [{ terms: { 'slo.id': list } }] : []),
        ],
      },
    },
  });

  return { taskId: response.task };
}
