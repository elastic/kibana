/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiModalBody, EuiModalHeader, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { EuiBasicTable } from '@elastic/eui';
import React, { Fragment, memo, useMemo, useRef } from 'react';

import type { OpenTimelineProps, ActionTimelineToShow, OpenTimelineResult } from '../types';
import { SearchRow } from '../search_row';
import { TimelinesTable } from '../timelines_table';

export const OpenTimelineModalBody = memo<OpenTimelineProps>(
  ({
    deleteTimelines,
    defaultPageSize,
    hideActions = [],
    isLoading,
    itemIdToExpandedNotesRowMap,
    onDeleteSelected,
    onlyFavorites,
    onOpenTimeline,
    onQueryChange,
    onSelectionChange,
    onTableChange,
    onToggleOnlyFavorites,
    onToggleShowNotes,
    pageIndex,
    pageSize,
    searchResults,
    sortDirection,
    sortField,
    timelineFilter,
    timelineType,
    templateTimelineFilter,
    title,
    totalSearchResultsCount,
  }) => {
    const tableRef = useRef<EuiBasicTable<OpenTimelineResult> | null>(null);

    const actionsToShow = useMemo(() => {
      const actions: ActionTimelineToShow[] = ['createFrom', 'duplicate'];

      if (onDeleteSelected != null && deleteTimelines != null) {
        actions.push('delete');
      }

      return actions.filter((action) => !hideActions.includes(action));
    }, [onDeleteSelected, deleteTimelines, hideActions]);

    const SearchRowContent = useMemo(
      () => (
        <Fragment key="search-row-content">
          {!!templateTimelineFilter && templateTimelineFilter}
        </Fragment>
      ),
      [templateTimelineFilter]
    );

    return (
      <>
        <EuiModalHeader>
          <EuiTitle size="l">
            <h2 data-test-subj="open-timeline-modal-title">{title}</h2>
          </EuiTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <>
            {!!timelineFilter && (
              <>
                {timelineFilter}
                <EuiSpacer size="m" />
              </>
            )}
            <SearchRow
              data-test-subj="search-row"
              onlyFavorites={onlyFavorites}
              onQueryChange={onQueryChange}
              onToggleOnlyFavorites={onToggleOnlyFavorites}
              query=""
              timelineType={timelineType}
            >
              {SearchRowContent}
            </SearchRow>
            <TimelinesTable
              actionTimelineToShow={actionsToShow}
              data-test-subj="timelines-table"
              deleteTimelines={deleteTimelines}
              defaultPageSize={defaultPageSize}
              loading={isLoading}
              itemIdToExpandedNotesRowMap={itemIdToExpandedNotesRowMap}
              onOpenTimeline={onOpenTimeline}
              onSelectionChange={onSelectionChange}
              onTableChange={onTableChange}
              onToggleShowNotes={onToggleShowNotes}
              pageIndex={pageIndex}
              pageSize={pageSize}
              searchResults={searchResults}
              showExtendedColumns={false}
              sortDirection={sortDirection}
              sortField={sortField}
              timelineType={timelineType}
              totalSearchResultsCount={totalSearchResultsCount}
              tableRef={tableRef}
            />
          </>
        </EuiModalBody>
      </>
    );
  }
);

OpenTimelineModalBody.displayName = 'OpenTimelineModalBody';
