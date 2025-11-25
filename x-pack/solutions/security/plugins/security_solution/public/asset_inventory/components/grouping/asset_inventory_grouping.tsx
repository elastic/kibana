/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { useGrouping } from '@kbn/grouping';
import type { ParsedGroupingAggregation } from '@kbn/grouping/src';
import type { Filter } from '@kbn/es-query';
import React from 'react';
import {
  GroupWrapper as BaseGroupWrapper,
  GroupWrapperLoading as BaseGroupWrapperLoading,
} from '@kbn/cloud-security-posture';
import { TEST_SUBJ_GROUPING, TEST_SUBJ_GROUPING_LOADING } from '../../constants';

interface AssetInventoryGroupingProps<T> {
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
}

const ASSET_INVENTORY_TEST_SUBJECTS = {
  grouping: TEST_SUBJ_GROUPING,
  groupingLoading: TEST_SUBJ_GROUPING_LOADING,
};

/**
 * This component is used to render the loading state of the AssetInventoryGrouping component
 * It's used to avoid the flickering of the table when the data is loading
 */
export const GroupWrapperLoading = <T,>({
  grouping,
  pageSize,
}: Pick<AssetInventoryGroupingProps<T>, 'grouping' | 'pageSize'>) => {
  return (
    <BaseGroupWrapperLoading
      grouping={grouping}
      pageSize={pageSize}
      testSubjects={ASSET_INVENTORY_TEST_SUBJECTS}
    />
  );
};

export const GroupWrapper = <T,>({
  data,
  renderChildComponent,
  grouping,
  activePageIndex,
  isFetching,
  pageSize,
  onChangeGroupsItemsPerPage,
  onChangeGroupsPage,
  selectedGroup,
  groupingLevel = 0,
  groupSelectorComponent,
}: AssetInventoryGroupingProps<T>) => {
  return (
    <BaseGroupWrapper
      data={data}
      renderChildComponent={renderChildComponent}
      grouping={grouping}
      activePageIndex={activePageIndex}
      isFetching={isFetching}
      pageSize={pageSize}
      onChangeGroupsItemsPerPage={onChangeGroupsItemsPerPage}
      onChangeGroupsPage={onChangeGroupsPage}
      selectedGroup={selectedGroup}
      groupingLevel={groupingLevel}
      groupSelectorComponent={groupSelectorComponent}
      testSubjects={ASSET_INVENTORY_TEST_SUBJECTS}
    />
  );
};
