/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { TimeRangeMetadataProvider } from '../../../../hooks/use_time_range_metadata';
import { useWaffleOptionsContext } from '../hooks/use_waffle_options';
import { useWaffleFiltersContext } from '../hooks/use_waffle_filters';
import { useWaffleTimeContext } from '../hooks/use_waffle_time';
export const InventoryTimeRangeMetadataProvider = ({ children }: { children: React.ReactNode }) => {
  const { nodeType } = useWaffleOptionsContext();
  const { filterQuery } = useWaffleFiltersContext();
  const { currentTimeRange } = useWaffleTimeContext();

  const { start, end } = useMemo(() => {
    return {
      start: new Date(currentTimeRange.from).toISOString(),
      end: new Date(currentTimeRange.to).toISOString(),
    };
  }, [currentTimeRange.from, currentTimeRange.to]);

  if (nodeType !== 'host' && nodeType !== 'pod') {
    return <>{children}</>;
  }

  return (
    <TimeRangeMetadataProvider
      dataSource={nodeType}
      kuery={filterQuery.query}
      start={start}
      end={end}
      isInventoryView
    >
      {children}
    </TimeRangeMetadataProvider>
  );
};
