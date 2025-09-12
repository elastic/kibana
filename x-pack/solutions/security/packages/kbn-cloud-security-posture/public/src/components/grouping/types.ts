/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import type { useGrouping } from '@kbn/grouping';
import type { ParsedGroupingAggregation } from '@kbn/grouping/src';
import type { Filter } from '@kbn/es-query';

export interface GroupRenderContext<TGroup> {
  group: TGroup | null | undefined;
  bucket?: unknown; // Raw bucket data for more complex renderers
}

export type GroupRenderer<TGroup> = (props: {
  context: GroupRenderContext<TGroup>;
}) => ReactElement | null;

export interface GroupRenderRegistry<TGroup> {
  renderers: Record<string, GroupRenderer<TGroup>>;
  defaultRenderer: GroupRenderer<TGroup>;
  nullGroup?: GroupRenderer<TGroup>;
}

export interface GroupWrapperProps<T> {
  data: ParsedGroupingAggregation<T>;
  renderChildComponent: (groupFilter: Filter[]) => JSX.Element;
  grouping: ReturnType<typeof useGrouping<T>>;
  activePageIndex: number;
  isFetching: boolean;
  pageSize: number;
  onChangeGroupsItemsPerPage: (size: number) => void;
  onChangeGroupsPage: (index: number) => void;
  selectedGroup: string;
  groupingLevel?: number;
  groupSelectorComponent?: JSX.Element;
  testSubjects?: {
    grouping: string;
    groupingLoading: string;
  };
}

export interface NullGroupProps {
  title: string;
  field: string;
  unit: string;
}
