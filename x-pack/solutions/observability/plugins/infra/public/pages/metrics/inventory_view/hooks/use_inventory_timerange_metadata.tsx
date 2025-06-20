/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { TimeRangeMetadataProvider } from '../../../../hooks/use_timerange_metadata';
import { useWaffleViewState } from './use_waffle_view_state';

export function InventoryTimeRangeMetadataProvider({ children }: { children: React.ReactNode }) {
  const { viewState } = useWaffleViewState();

  const parsedDateRange = useTimeRange({
    rangeFrom: viewState.time ? new Date(viewState.time - 1200 * 100).toISOString() : 'now-1m',
    rangeTo: viewState.time ? new Date(viewState.time).toISOString() : 'now',
  });

  return (
    <TimeRangeMetadataProvider
      kuery={viewState.filterQuery.expression}
      dataSource="host"
      start={parsedDateRange.from}
      end={parsedDateRange.to}
    >
      {children}
    </TimeRangeMetadataProvider>
  );
}
