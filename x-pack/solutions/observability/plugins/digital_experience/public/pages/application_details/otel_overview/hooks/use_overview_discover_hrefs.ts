/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getDateISORange } from '@kbn/timerange';
import {
  DISCOVER_TILES,
  type DiscoverTile,
  type OverviewDiscoverQueries,
} from '../../../../../common/types/overview';
import { useDiscoverHrefOf } from '../../../../hooks/use_discover_href';
import { useTimeRange } from '../../../../hooks/use_time_range';

export type OverviewDiscoverHrefs = Partial<Record<DiscoverTile, string>>;

/**
 * The Discover link of each tile that has a query, over the Overview's time range; none without
 * queries (still loading) or without access to Discover. The queries carry the environment,
 * filters and KQL query, so a link always matches what the tile counted.
 */
export const useOverviewDiscoverHrefs = (
  queries: OverviewDiscoverQueries | undefined
): OverviewDiscoverHrefs => {
  const { timeRange } = useTimeRange();
  // Absolute bounds, resolved when the queries arrive: a relative range such as `now-3d` is
  // resolved again by Discover when the link is opened, which could be a window later than the one
  // the tile counted. Every response brings new queries, which resolve the range again.
  const discoverTimeRange = useMemo(() => {
    if (!queries) {
      return undefined;
    }
    const { startDate, endDate } = getDateISORange({
      from: timeRange.rangeFrom,
      to: timeRange.rangeTo,
    });
    return { from: startDate, to: endDate };
  }, [queries, timeRange.rangeFrom, timeRange.rangeTo]);
  const hrefOf = useDiscoverHrefOf(discoverTimeRange);

  return useMemo(() => {
    if (!queries) {
      return {};
    }
    const hrefs: OverviewDiscoverHrefs = {};
    for (const tile of DISCOVER_TILES) {
      const href = hrefOf(queries[tile]);
      if (href) {
        hrefs[tile] = href;
      }
    }
    return hrefs;
  }, [queries, hrefOf]);
};
