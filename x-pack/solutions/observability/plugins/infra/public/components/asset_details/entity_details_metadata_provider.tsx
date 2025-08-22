/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import {
  type InventoryItemType,
  findInventoryFields,
} from '@kbn/metrics-data-access-plugin/common';
import { TimeRangeMetadataProvider } from '../../hooks/use_time_range_metadata';
import { useDatePickerContext } from './hooks/use_date_picker';

export function EntityDetailsTimeRangeMetadataProvider({
  entityType,
  entityId,
  children,
}: {
  children: React.ReactNode;
  entityId: string;
  entityType: InventoryItemType;
}) {
  const { getParsedDateRange } = useDatePickerContext();
  const parsedDateRange = getParsedDateRange();

  if (entityType !== 'host') return <>{children}</>;
  const { id } = findInventoryFields(entityType);

  return (
    <TimeRangeMetadataProvider
      dataSource={entityType}
      start={parsedDateRange.from}
      end={parsedDateRange.to}
      kuery={`${id}:"${entityId}"`}
    >
      {children}
    </TimeRangeMetadataProvider>
  );
}
