/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { TimeRangeMetadataProvider } from '../../../../hooks/use_timerange_metadata';
import { useDatePickerContext } from './use_date_picker';

export function KubernetesTimeRangeMetadataProvider({ children }: { children: React.ReactNode }) {
  // TODO use dateRange
  const { dateRange } = useDatePickerContext();
  const from = new Date(Date.now() - 1000 * 60 * 10).toISOString();
  const to = new Date().toISOString();

  const parsedDateRange = useTimeRange({
    rangeFrom: from,
    rangeTo: to,
  });

  return (
    <TimeRangeMetadataProvider
      kuery=""
      dataSource="kubernetes"
      start={parsedDateRange.from}
      end={parsedDateRange.to}
    >
      {children}
    </TimeRangeMetadataProvider>
  );
}
