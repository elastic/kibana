/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import type { ParsedGroupingAggregation, ParsedRootAggregation } from '@kbn/grouping/src';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import type { EntitiesGroupingAggregation } from '../../entities_table/grouping/use_fetch_grouped_data';
import { ENTITY_GRID_QUERY_KEY } from '../common';
import type { RowsMode } from '../common';
import { createEsqlRunner } from '../queries/esql';
import { isGroupValueField } from '../queries/entity_filters';
import {
  applyResolvedEntityFilterOverrides,
  isFilteringByGroupValue,
} from '../queries/resolved_entities';
import type { ResolvedValueBucket } from '../queries/resolved_entities';
import { fetchResolvedValueGroups } from '../queries/resolved_value_groups';
import type { ResolvedValueGroups } from '../queries/resolved_value_groups';
import { getReadyContext, useGridContext } from './use_entity_grid_context';
import { useEntityFilterOverrides } from './use_entity_grid_data';

const RESOLVED_VALUE_GROUPS_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.entitiesGrid.resolvedValueGroupsError',
  { defaultMessage: 'Error loading entity groups' }
);

const RESOLVED_VALUE_GROUPS_TRUNCATED_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.entitiesGrid.resolvedValueGroupsTruncated',
  {
    defaultMessage: 'Some groups are not shown',
  }
);

const RESOLVED_VALUE_GROUPS_TRUNCATED_TEXT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.entitiesGrid.resolvedValueGroupsTruncatedText',
  {
    defaultMessage:
      'There are too many values to list them all. Narrow the search or the filters to see the rest.',
  }
);

/** The key `@kbn/grouping` gives the "no value" bucket. */
const NULL_GROUP_KEY = '—';

type GroupData = ParsedGroupingAggregation<EntitiesGroupingAggregation>;

export interface UseResolvedValueGroupsOptions {
  selectedGroup: string;
  rowsMode: RowsMode;
  /** The search and the parent groups' other filters, as the leaf grid gets them. */
  searchExpression?: string;
  /** The entity filters and the parent groups' group-value conditions, before overrides. */
  entityExpression?: string;
  pageIndex: number;
  pageSize: number;
  isQueryReady?: boolean;
}

/** Group by on resolved rows by a group-valued field reads the group's values, not the main entity's. */
export const isResolvedValueGrouping = (rowsMode: RowsMode, selectedGroup: string): boolean =>
  rowsMode === 'resolved' && isGroupValueField(selectedGroup);

const toGroupingBucket = (selectedGroup: string, { value, count }: ResolvedValueBucket) =>
  value == null
    ? {
        key: [NULL_GROUP_KEY],
        key_as_string: NULL_GROUP_KEY,
        selectedGroup,
        doc_count: count,
        isNullGroup: true,
      }
    : { key: [value], key_as_string: value, selectedGroup, doc_count: count };

/** The page of buckets, shaped as `parseGroupingQuery` returns them; `{}` until loaded. */
export const toResolvedValueGroupData = (
  data: ResolvedValueGroups | undefined,
  selectedGroup: string,
  pageIndex: number,
  pageSize: number
): GroupData => {
  if (!data) return {};
  const { buckets, total } = data;
  const nullBucket = buckets.find(({ value }) => value == null);
  const groupData: ParsedRootAggregation<EntitiesGroupingAggregation> = {
    groupByFields: {
      buckets: buckets
        .slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
        .map((bucket) => toGroupingBucket(selectedGroup, bucket)),
    },
    groupsCount: { value: buckets.length },
    unitsCount: { value: total },
    ...(nullBucket ? { nullGroupItems: { doc_count: nullBucket.count } } : {}),
  };
  // As `useEntityGrouping` casts its resolution groups: `nullGroupItems` doesn't fit the index signature.
  return groupData as GroupData;
};

/**
 * Group by buckets of resolved rows by a group-valued field, from the values the rows show.
 * Always called; it reads only when `isResolvedValueGrouping`.
 */
export const useResolvedValueGroups = ({
  selectedGroup,
  rowsMode,
  searchExpression,
  entityExpression,
  pageIndex,
  pageSize,
  isQueryReady = true,
}: UseResolvedValueGroupsOptions) => {
  const isEnabled = isResolvedValueGrouping(rowsMode, selectedGroup);
  const context = useGridContext();
  const ready = getReadyContext(context);
  // The grid's rows read the same overrides, so this view keeps the same rows.
  const overrides = useEntityFilterOverrides({
    rowsMode,
    entityExpression: isEnabled ? entityExpression : undefined,
  });
  const isOverridesReady =
    !isFilteringByGroupValue({ rowsMode, entityExpression }) || overrides.data != null;
  const viewEntityExpression =
    entityExpression && applyResolvedEntityFilterOverrides(entityExpression, overrides.data);

  const groups = useQuery(
    [
      ENTITY_GRID_QUERY_KEY,
      'resolved-value-groups',
      {
        spaceId: ready?.spaceId,
        concreteEntityIndexName: ready?.concreteEntityIndexName,
        field: selectedGroup,
        searchExpression,
        entityExpression: viewEntityExpression,
      },
    ],
    ({ signal }) => {
      if (!ready) throw new Error('entities index not resolved');
      return fetchResolvedValueGroups(
        {
          namespace: ready.spaceId,
          concreteEntityIndexName: ready.concreteEntityIndexName,
          searchExpression,
          entityExpression: viewEntityExpression,
        },
        selectedGroup,
        createEsqlRunner(context.searchService, 'entities_grid_resolved_value_groups', signal)
      );
    },
    {
      enabled: isEnabled && isQueryReady && isOverridesReady && ready != null,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );

  // Without an entities index no query runs: show no groups, not the loading placeholder.
  const isIndexUnavailable = isEnabled && context.entitiesIndexError != null;
  useErrorToast(
    RESOLVED_VALUE_GROUPS_ERROR_TITLE,
    isEnabled ? context.entitiesIndexError ?? overrides.error ?? groups.error : undefined
  );

  const isTruncated = isEnabled && groups.data?.isTruncated === true;
  const { addWarning } = useAppToasts();
  useEffect(() => {
    if (isTruncated) {
      addWarning({
        title: RESOLVED_VALUE_GROUPS_TRUNCATED_TITLE,
        text: RESOLVED_VALUE_GROUPS_TRUNCATED_TEXT,
      });
    }
  }, [isTruncated, addWarning]);

  const groupData = useMemo(
    () =>
      isIndexUnavailable
        ? toResolvedValueGroupData(
            { buckets: [], total: 0, isTruncated: false },
            selectedGroup,
            0,
            pageSize
          )
        : toResolvedValueGroupData(groups.data, selectedGroup, pageIndex, pageSize),
    [isIndexUnavailable, groups.data, selectedGroup, pageIndex, pageSize]
  );

  return {
    isEnabled,
    groupData,
    isFetching:
      isEnabled && (groups.isFetching || overrides.isFetching || context.isEntitiesIndexLoading),
  };
};
