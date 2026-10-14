/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRiskMoversCountQuery } from '../queries/tile_risk_movers_query';
import { getRiskTileDelta, usePreviousPeriodRiskTile } from './use_previous_period_risk_tile';
import { useRiskMoversCount } from './use_risk_movers_count';

type RiskMoversOptions = Parameters<typeof useRiskMoversCount>[0];

const buildPreviousQuery = (
  spaceId: string,
  entitiesIndexName: string,
  timeRange: Parameters<typeof buildRiskMoversCountQuery>[2],
  entityFilterClauses: string[]
) =>
  buildRiskMoversCountQuery(spaceId, entitiesIndexName, timeRange, entityFilterClauses, 'previous');

/**
 * The Risk movers tile with its period-over-period delta. The previous-period queries start once the
 * count has loaded, so the delta never delays the count.
 */
export const useRiskMoversCountWithDelta = (opts: RiskMoversOptions) => {
  const main = useRiskMoversCount(opts);
  const previous = usePreviousPeriodRiskTile({
    ...opts,
    skip: opts.skip || main.isLoading,
    tileKey: 'riskMovers',
    buildPreviousQuery,
  });
  return { ...main, ...getRiskTileDelta({ count: main.count, skip: opts.skip, ...previous }) };
};
