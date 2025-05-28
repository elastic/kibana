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
import { css } from '@emotion/react';
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

/**
 * This component is used to render the loading state of the AssetInventoryGrouping component
 * It's used to avoid the flickering of the table when the data is loading
 */
export const GroupWrapperLoading = <T,>({
  grouping,
  pageSize,
}: Pick<AssetInventoryGroupingProps<T>, 'grouping' | 'pageSize'>) => {
  return (
    <div data-test-subj={TEST_SUBJ_GROUPING_LOADING}>
      {grouping.getGrouping({
        activePage: 0,
        data: {
          groupsCount: { value: 1 },
          unitsCount: { value: 1 },
        },
        groupingLevel: 0,
        inspectButton: undefined,
        isLoading: true,
        itemsPerPage: pageSize,
        renderChildComponent: () => <></>,
        onGroupClose: () => {},
        selectedGroup: '',
        takeActionItems: () => [],
      })}
    </div>
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
  if (!data || isFetching) {
    return <GroupWrapperLoading grouping={grouping} pageSize={pageSize} />;
  }

  return (
    <div
      data-test-subj={TEST_SUBJ_GROUPING}
      css={css`
        position: relative;
      `}
    >
      {groupSelectorComponent && (
        <div
          css={css`
            position: absolute;
            right: 0;
            top: 16px;
          `}
        >
          {groupSelectorComponent}
        </div>
      )}
      <div
        css={
          groupSelectorComponent
            ? css`
                && [data-test-subj='alerts-table-group-selector'] {
                  display: none;
                }
              `
            : undefined
        }
      >
        {grouping.getGrouping({
          activePage: activePageIndex,
          data,
          groupingLevel,
          selectedGroup,
          inspectButton: undefined,
          isLoading: isFetching,
          itemsPerPage: pageSize,
          onChangeGroupsItemsPerPage,
          onChangeGroupsPage,
          renderChildComponent,
          onGroupClose: () => {},
          takeActionItems: () => [],
        })}
      </div>
    </div>
  );
};
