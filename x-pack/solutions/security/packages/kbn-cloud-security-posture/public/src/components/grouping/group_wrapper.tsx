/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { GroupWrapperProps } from './types';

const DEFAULT_TEST_SUBJECTS = {
  grouping: 'cloud-security-grouping',
  groupingLoading: 'cloud-security-grouping-loading',
};

/**
 * This component is used to render the loading state of the GroupWrapper component
 * It's used to avoid the flickering of the table when the data is loading
 */
export const GroupWrapperLoading = <T,>({
  grouping,
  pageSize,
  testSubjects = DEFAULT_TEST_SUBJECTS,
}: Pick<GroupWrapperProps<T>, 'grouping' | 'pageSize' | 'testSubjects'>) => {
  return (
    <div data-test-subj={testSubjects.groupingLoading}>
      {grouping.getGrouping({
        activePage: 0,
        data: {
          groupsCount: { value: 1 },
          unitsCount: { value: 1 },
        },
        groupingLevel: 0,
        additionalToolbarControls: undefined,
        isLoading: true,
        itemsPerPage: pageSize,
        renderChildComponent: () => <></>,
        onGroupClose: () => {},
        selectedGroup: '',
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
  testSubjects = DEFAULT_TEST_SUBJECTS,
}: GroupWrapperProps<T>) => {
  // `data` is `{}` (truthy) until the very first response arrives, so `groupsCount` is the
  // reliable signal that at least one fetch has completed. Once that's true we keep rendering
  // the real grouping tree (with isLoading passed through) on subsequent fetches instead of
  // swapping back to the placeholder, so it isn't torn down and remounted - which would lose
  // in-progress UI state such as expanded groups and revealed pagination pages. The one
  // exception is switching the grouped-by field itself: `data` may still be the previous
  // field's (keepPreviousData) results, so we fall back to the placeholder until fresh data
  // for the new field arrives, which also remounts Grouping and resets its per-field state.
  const hasLoadedData = Boolean(data?.groupsCount);

  if (!hasLoadedData) {
    return (
      <GroupWrapperLoading grouping={grouping} pageSize={pageSize} testSubjects={testSubjects} />
    );
  }

  return (
    <div
      data-test-subj={testSubjects.grouping}
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
          additionalToolbarControls: undefined,
          isLoading: isFetching,
          itemsPerPage: pageSize,
          onChangeGroupsItemsPerPage,
          onChangeGroupsPage,
          renderChildComponent,
          onGroupClose: () => {},
        })}
      </div>
    </div>
  );
};
