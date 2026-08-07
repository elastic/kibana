/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { EuiBasicTable } from '@elastic/eui';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { SECURITY_TIMELINE_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import type { CommonAttachmentTabViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';

import type { SortFieldTimeline } from '../../../../common/api/timeline';
import type {
  OnOpenTimeline,
  OnTableChange,
  OpenTimelineResult,
} from '../../../timelines/components/open_timeline/types';
import { TimelinesTable } from '../../../timelines/components/open_timeline/timelines_table';
import { useQueryTimelineById } from '../../../timelines/components/open_timeline/helpers';
import { useGetTimelinesByIds } from './use_get_timelines_by_ids';
import { NO_TIMELINES_ATTACHED, TIMELINE_DISPLAY_NAME } from './translations';

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SORT_FIELD: SortFieldTimeline = 'updated';
const DEFAULT_SORT_ORDER: 'asc' | 'desc' = 'desc';

const extractTimelineIds = (caseData: CommonAttachmentTabViewProps['caseData']): string[] => {
  const ids: string[] = [];
  for (const comment of caseData.comments) {
    // `attachmentId` may be a string or array of strings on unified reference attachments,
    // but for timeline attachments we narrow to a single string in the schema.
    // Duplicates (same timeline attached twice) are tolerated here and deduped server-side.
    if (comment.type === SECURITY_TIMELINE_ATTACHMENT_TYPE && 'attachmentId' in comment) {
      const id = (comment as { attachmentId?: string | string[] }).attachmentId;
      if (typeof id === 'string' && id.length > 0) {
        ids.push(id);
      }
    }
  }
  return ids;
};

export const CaseViewTimelines: React.FC<CommonAttachmentTabViewProps> = ({ caseData }) => {
  const timelineIds = useMemo(() => extractTimelineIds(caseData), [caseData]);

  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortField, setSortField] = useState<SortFieldTimeline>(DEFAULT_SORT_FIELD);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(DEFAULT_SORT_ORDER);
  const [itemIdToExpandedNotesRowMap, setItemIdToExpandedNotesRowMap] = useState<
    Record<string, JSX.Element>
  >({});

  const sort = useMemo(() => ({ sortField, sortOrder: sortDirection }), [sortField, sortDirection]);
  const pageInfo = useMemo(() => ({ pageSize, pageIndex }), [pageSize, pageIndex]);

  const { timelines, totalCount, loading } = useGetTimelinesByIds({
    ids: timelineIds,
    pageInfo,
    sort,
  });

  const tableRef = useRef<EuiBasicTable<OpenTimelineResult> | null>(null);

  const queryTimelineById = useQueryTimelineById();
  const onOpenTimeline = useCallback<OnOpenTimeline>(
    ({ duplicate, timelineId, timelineType }) =>
      queryTimelineById({ duplicate, timelineId, timelineType }),
    [queryTimelineById]
  );

  const onTableChange = useCallback<OnTableChange>(({ page, sort: nextSort }) => {
    if (page) {
      setPageIndex(page.index + 1); // EUI table is 0-indexed; API expects 1-indexed.
      setPageSize(page.size);
    }
    if (nextSort) {
      // `TimelinesTable` only exposes `SortFieldTimeline` columns as sortable;
      // narrowing the broader `string` field reported by EUI back to the schema enum.
      setSortField(nextSort.field as SortFieldTimeline);
      setSortDirection(nextSort.direction);
    }
  }, []);

  if (timelineIds.length === 0) {
    return (
      <EuiEmptyPrompt
        data-test-subj="case-view-timelines-empty"
        iconType="timeline"
        title={<h3>{TIMELINE_DISPLAY_NAME}</h3>}
        body={<p>{NO_TIMELINES_ATTACHED}</p>}
      />
    );
  }

  return (
    <EuiFlexGroup gutterSize="none" data-test-subj="case-view-timelines">
      <EuiFlexItem>
        <TimelinesTable
          actionTimelineToShow={[]}
          defaultPageSize={DEFAULT_PAGE_SIZE}
          loading={loading}
          itemIdToExpandedNotesRowMap={itemIdToExpandedNotesRowMap}
          onOpenTimeline={onOpenTimeline}
          onSelectionChange={noop}
          onTableChange={onTableChange}
          onToggleShowNotes={setItemIdToExpandedNotesRowMap}
          pageIndex={pageIndex - 1}
          pageSize={pageSize}
          searchResults={timelines}
          showExtendedColumns
          sortDirection={sortDirection}
          sortField={sortField}
          tableRef={tableRef}
          timelineType={null}
          totalSearchResultsCount={totalCount}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

CaseViewTimelines.displayName = 'CaseViewTimelines';

const noop = () => {};
