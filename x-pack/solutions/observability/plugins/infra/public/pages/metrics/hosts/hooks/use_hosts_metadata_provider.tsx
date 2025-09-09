/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { useUnifiedSearchContext } from './use_unified_search';
import { TimeRangeMetadataProvider } from '../../../../hooks/use_time_range_metadata';

export function HostsTimeRangeMetadataProvider({ children }: { children: React.ReactNode }) {
  const { parsedDateRange, buildQuery } = useUnifiedSearchContext();

  const filters = useMemo(
    () => JSON.stringify(buildQuery({ includeControls: false })),
    [buildQuery]
  );

  return (
    <TimeRangeMetadataProvider
      dataSource="host"
      start={parsedDateRange.from}
      end={parsedDateRange.to}
      filters={filters}
    >
      {children}
    </TimeRangeMetadataProvider>
  );
}
