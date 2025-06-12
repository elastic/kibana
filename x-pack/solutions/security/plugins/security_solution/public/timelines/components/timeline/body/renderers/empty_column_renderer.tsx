/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { TimelineNonEcsData } from '../../../../../../common/search_strategy/timeline';
import { getEmptyValue } from '../../../../../common/components/empty_value';
import type { ColumnRenderer } from './column_renderer';

export const dataNotExistsAtColumn = (columnName: string, data: TimelineNonEcsData[]): boolean =>
  data.findIndex((item) => item.field === columnName) === -1;

export const emptyColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, data: TimelineNonEcsData[]) =>
    dataNotExistsAtColumn(columnName, data),
  renderColumn: () => <span>{getEmptyValue()}</span>,
};
