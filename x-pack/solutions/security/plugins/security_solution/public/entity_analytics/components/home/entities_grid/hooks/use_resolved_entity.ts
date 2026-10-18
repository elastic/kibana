/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { escapeStringValue } from '@kbn/esql-utils';
import { ENTITY_ID_FIELD, RESOLVED_TO_FIELD, RISK_SCORE_NORM_FIELD } from '../common';
import type { Row, TimeRange } from '../common';
import { useEntityGridData } from './use_entity_grid_data';
import type { UseEntityGridDataOptions } from './use_entity_grid_context';

/** Most records an expanded group lists: its riskiest. */
const MAX_GROUP_RECORDS = 100;

/** A group's records as individual rows; expanding is structural, so the table filters don't apply. */
export const getGroupRecordsOptions = (
  entityId: string,
  timeRange: TimeRange,
  keepFields: readonly string[]
): UseEntityGridDataOptions => ({
  keyScope: 'children',
  rowsMode: 'individual',
  entityExpression: `(${ENTITY_ID_FIELD} == ${escapeStringValue(
    entityId
  )} OR ${RESOLVED_TO_FIELD} == ${escapeStringValue(entityId)})`,
  sortField: RISK_SCORE_NORM_FIELD,
  sortDirection: 'desc',
  pageSize: MAX_GROUP_RECORDS,
  timeRange,
  keepFields,
});

/**
 * The values a resolved row of the grid shows, for one group: every column, over the whole group.
 * Same queries as the grid, so a view built on them always agrees with it.
 */
export const useResolvedEntityTotals = (
  entityId: string,
  timeRange: TimeRange
): { totals: Row | undefined; isLoading: boolean } => {
  const options = useMemo(
    (): UseEntityGridDataOptions => ({
      rowsMode: 'resolved',
      entityExpression: `${ENTITY_ID_FIELD} == ${escapeStringValue(entityId)}`,
      sortField: ENTITY_ID_FIELD,
      sortDirection: 'asc',
      pageSize: 1,
      timeRange,
      keepFields: [],
    }),
    [entityId, timeRange]
  );
  const { rows, isFetching, isEnriching } = useEntityGridData(options);
  return { totals: rows[0], isLoading: isFetching || isEnriching };
};

/**
 * The records an expanded group lists, its riskiest, with the group's size. Same query and cache
 * as the expanded row, so these are free once the row was expanded.
 */
export const useResolvedEntityMembers = (
  entityId: string,
  timeRange: TimeRange
): { members: Row[]; total: number | undefined; isLoading: boolean } => {
  const options = useMemo(
    () => getGroupRecordsOptions(entityId, timeRange, []),
    [entityId, timeRange]
  );
  const { rows, total, isFetching } = useEntityGridData(options);
  return { members: rows, total, isLoading: isFetching };
};
