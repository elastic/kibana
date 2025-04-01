/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';

import * as i18n from '../translations';
import type {
  ActionTimelineToShow,
  DeleteTimelines,
  OnCreateRuleFromTimeline,
  OnOpenTimeline,
  OnSelectionChange,
  OnTableChange,
  OnToggleShowNotes,
  OpenTimelineResult,
  EnableExportTimelineDownloader,
  OnOpenDeleteTimelineModal,
} from '../types';
import { getActionsColumns } from './actions_columns';
import { getCommonColumns } from './common_columns';
import { getExtendedColumns } from './extended_columns';
import { getIconHeaderColumns } from './icon_header_columns';
import {
  TimelineStatusEnum,
  type TimelineType,
  TimelineTypeEnum,
} from '../../../../../common/api/timeline';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

/**
 * Returns the column definitions (passed as the `columns` prop to
 * `EuiBasicTable`) that are displayed in the compact `Open Timeline` modal
 * view, and the full view shown in the `All Timelines` view of the
 * `Timelines` page
 */

export const getTimelinesTableColumns = ({
  actionTimelineToShow,
  deleteTimelines,
  enableExportTimelineDownloader,
  itemIdToExpandedNotesRowMap,
  onCreateRule,
  onCreateRuleFromEql,
  onOpenDeleteTimelineModal,
  onOpenTimeline,
  onToggleShowNotes,
  showExtendedColumns,
  timelineType,
  hasCrudAccess,
}: {
  actionTimelineToShow: ActionTimelineToShow[];
  deleteTimelines?: DeleteTimelines;
  enableExportTimelineDownloader?: EnableExportTimelineDownloader;
  itemIdToExpandedNotesRowMap: Record<string, JSX.Element>;
  onCreateRule?: OnCreateRuleFromTimeline;
  onCreateRuleFromEql?: OnCreateRuleFromTimeline;
  onOpenDeleteTimelineModal?: OnOpenDeleteTimelineModal;
  onOpenTimeline: OnOpenTimeline;
  onSelectionChange: OnSelectionChange;
  onToggleShowNotes: OnToggleShowNotes;
  showExtendedColumns: boolean;
  timelineType: TimelineType | null;
  hasCrudAccess: boolean;
}): Array<EuiBasicTableColumn<object>> => {
  return [
    ...getCommonColumns({
      itemIdToExpandedNotesRowMap,
      onOpenTimeline,
      onToggleShowNotes,
      timelineType,
    }),
    ...getExtendedColumns(showExtendedColumns),
    ...getIconHeaderColumns({ timelineType }),
    ...(actionTimelineToShow.length
      ? getActionsColumns({
          onCreateRule,
          onCreateRuleFromEql,
          actionTimelineToShow,
          deleteTimelines,
          enableExportTimelineDownloader,
          onOpenDeleteTimelineModal,
          onOpenTimeline,
          hasCrudAccess,
        })
      : []),
  ];
};

export interface TimelinesTableProps {
  actionTimelineToShow: ActionTimelineToShow[];
  deleteTimelines?: DeleteTimelines;
  defaultPageSize: number;
  loading: boolean;
  itemIdToExpandedNotesRowMap: Record<string, JSX.Element>;
  enableExportTimelineDownloader?: EnableExportTimelineDownloader;
  onCreateRule?: OnCreateRuleFromTimeline;
  onCreateRuleFromEql?: OnCreateRuleFromTimeline;
  onOpenDeleteTimelineModal?: OnOpenDeleteTimelineModal;
  onOpenTimeline: OnOpenTimeline;
  onSelectionChange: OnSelectionChange;
  onTableChange: OnTableChange;
  onToggleShowNotes: OnToggleShowNotes;
  pageIndex: number;
  pageSize: number;
  searchResults: OpenTimelineResult[] | null;
  showExtendedColumns: boolean;
  sortDirection: 'asc' | 'desc';
  sortField: string;
  timelineType: TimelineType | null;
  tableRef: React.MutableRefObject<EuiBasicTable<OpenTimelineResult> | null>;
  totalSearchResultsCount: number;
}

/**
 * Renders a table that displays metadata about timelines, (i.e. name,
 * description, etc.)
 */
export const TimelinesTable = React.memo<TimelinesTableProps>(
  ({
    actionTimelineToShow,
    deleteTimelines,
    defaultPageSize,
    loading: isLoading,
    itemIdToExpandedNotesRowMap,
    enableExportTimelineDownloader,
    onCreateRule,
    onCreateRuleFromEql,
    onOpenDeleteTimelineModal,
    onOpenTimeline,
    onSelectionChange,
    onTableChange,
    onToggleShowNotes,
    pageIndex,
    pageSize,
    searchResults,
    showExtendedColumns,
    sortField,
    sortDirection,
    tableRef,
    timelineType,
    totalSearchResultsCount,
  }) => {
    const pagination = useMemo(() => {
      return {
        showPerPageOptions: showExtendedColumns,
        pageIndex,
        pageSize,
        pageSizeOptions: [
          Math.floor(Math.max(defaultPageSize, 1) / 2),
          defaultPageSize,
          defaultPageSize * 2,
        ],
        totalItemCount: totalSearchResultsCount,
      };
    }, [defaultPageSize, pageIndex, pageSize, showExtendedColumns, totalSearchResultsCount]);

    const sorting = useMemo(() => {
      return {
        sort: {
          field: sortField as keyof OpenTimelineResult,
          direction: sortDirection,
        },
      };
    }, [sortField, sortDirection]);

    const selection = useMemo(() => {
      return {
        selectable: (timelineResult: OpenTimelineResult) =>
          timelineResult.savedObjectId != null &&
          timelineResult.status !== TimelineStatusEnum.immutable,
        selectableMessage: (selectable: boolean) =>
          !selectable ? i18n.MISSING_SAVED_OBJECT_ID : '',
        onSelectionChange,
      };
    }, [onSelectionChange]);
    const { timelinePrivileges } = useUserPrivileges();
    const columns = useMemo(
      () =>
        getTimelinesTableColumns({
          actionTimelineToShow,
          deleteTimelines,
          itemIdToExpandedNotesRowMap,
          enableExportTimelineDownloader,
          onCreateRule,
          onCreateRuleFromEql,
          onOpenDeleteTimelineModal,
          onOpenTimeline,
          onSelectionChange,
          onToggleShowNotes,
          showExtendedColumns,
          timelineType,
          hasCrudAccess: timelinePrivileges.crud,
        }),
      [
        actionTimelineToShow,
        deleteTimelines,
        itemIdToExpandedNotesRowMap,
        enableExportTimelineDownloader,
        onCreateRule,
        onCreateRuleFromEql,
        onOpenDeleteTimelineModal,
        onOpenTimeline,
        onSelectionChange,
        onToggleShowNotes,
        showExtendedColumns,
        timelineType,
        timelinePrivileges,
      ]
    );

    const noItemsMessage =
      isLoading || searchResults == null
        ? i18n.LOADING
        : timelineType === TimelineTypeEnum.template
        ? i18n.ZERO_TIMELINE_TEMPLATES_MATCH
        : i18n.ZERO_TIMELINES_MATCH;

    return (
      <EuiBasicTable
        columns={columns}
        data-test-subj="timelines-table"
        itemId="savedObjectId"
        itemIdToExpandedRowMap={itemIdToExpandedNotesRowMap}
        items={searchResults ?? []}
        loading={isLoading}
        noItemsMessage={noItemsMessage}
        onChange={onTableChange}
        pagination={pagination}
        selection={actionTimelineToShow.includes('selectable') ? selection : undefined}
        sorting={sorting}
        css={css`
          .euiTableCellContent {
            animation: none; /* Prevents applying max-height from animation */
          }

          .euiTableRow-isExpandedRow .euiTableCellContent__text {
            width: 100%; /* Fixes collapsing nested flex content in IE11 */
          }
        `}
        ref={tableRef}
      />
    );
  }
);
TimelinesTable.displayName = 'TimelinesTable';
