/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildNewlyHighCriticalCountQuery } from '../queries/tile_newly_high_critical_query';
import { getRiskTileDelta, usePreviousPeriodRiskTile } from './use_previous_period_risk_tile';
import { useNewlyHighCriticalCount } from './use_newly_high_critical_count';

type NewlyHighCriticalOptions = Parameters<typeof useNewlyHighCriticalCount>[0];

const buildPreviousQuery = (
  spaceId: string,
  entitiesIndexName: string,
  timeRange: Parameters<typeof buildNewlyHighCriticalCountQuery>[2],
  entityFilterClauses: string[]
) =>
  buildNewlyHighCriticalCountQuery(
    spaceId,
    entitiesIndexName,
    timeRange,
    entityFilterClauses,
    'previous'
  );

/**
 * The Newly high/critical tile with its period-over-period delta. The previous-period queries start
 * once the count has loaded, so the delta never delays the count.
 */
export const useNewlyHighCriticalCountWithDelta = (opts: NewlyHighCriticalOptions) => {
  const main = useNewlyHighCriticalCount(opts);
  const previous = usePreviousPeriodRiskTile({
    ...opts,
    skip: opts.skip || main.isLoading,
    tileKey: 'newlyHighCritical',
    buildPreviousQuery,
  });
  return { ...main, ...getRiskTileDelta({ count: main.count, skip: opts.skip, ...previous }) };
};
