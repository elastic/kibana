/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { ConnectedProps } from 'react-redux';
import { connect } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import type { EuiDataGridControlColumn } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { RunTimeMappings } from '@kbn/timelines-plugin/common/search_strategy';
import { PageScope } from '../../../../../data_view_manager/constants';
import { useDataView } from '../../../../../data_view_manager/hooks/use_data_view';
import { useSelectedPatterns } from '../../../../../data_view_manager/hooks/use_selected_patterns';
import { useFetchNotes } from '../../../../../notes/hooks/use_fetch_notes';
import {
  DocumentDetailsLeftPanelKey,
  DocumentDetailsRightPanelKey,
} from '../../../../../flyout/document_details/shared/constants/panel_keys';
import { useKibana } from '../../../../../common/lib/kibana';
import { timelineSelectors } from '../../../../store';
import type { Direction } from '../../../../../../common/search_strategy';
import { useTimelineEvents } from '../../../../containers';
import { requiredFieldsForActions } from '../../../../../detections/components/alerts_table/default_config';
import { timelineDefaults } from '../../../../store/defaults';
import type { TimelineModel } from '../../../../store/model';
import type { State } from '../../../../../common/store';
import { TimelineTabs } from '../../../../../../common/types/timeline';
import { UnifiedTimelineBody } from '../../body/unified_timeline_body';
import type { TimelineTabCommonProps } from '../shared/types';
import { useTimelineColumns } from '../shared/use_timeline_columns';
import { useTimelineControlColumn } from '../shared/use_timeline_control_columns';
import { LeftPanelNotesTab } from '../../../../../flyout/document_details/left';
import { DocumentEventTypes, NotesEventTypes } from '../../../../../common/lib/telemetry';
import { defaultUdtHeaders } from '../../body/column_headers/default_headers';

interface PinnedFilter {
  bool: {
    should: Array<{ match_phrase: { _id: string } }>;
    minimum_should_match: number;
  };
}

export type Props = TimelineTabCommonProps & PropsFromRedux;

const rowDetailColumn = [
  {
    id: 'row-details',
    columnHeaderType: 'not-filtered',
    width: 0,
    headerCellRender: () => null,
    rowCellRender: () => null,
  },
];

export const PinnedTabContentComponent: React.FC<Props> = ({
  columns,
  timelineId,
  itemsPerPage,
  itemsPerPageOptions,
  pinnedEventIds,
  rowRenderers,
  sort,
  eventIdToNoteIds,
}) => {
  /*
   * Needs to be maintained for each table in each tab independently
   * and consequently it cannot be the part of common redux state
   * of the timeline.
   *
   */
  const [pageIndex, setPageIndex] = useState(0);

  const { telemetry } = useKibana().services;

  const selectedPatterns = useSelectedPatterns(PageScope.timeline);
  const { dataView } = useDataView(PageScope.timeline);
  const dataViewId = useMemo(() => dataView.id ?? '', [dataView.id]);
  const runtimeMappings = useMemo(
    () => dataView.getRuntimeMappings() as RunTimeMappings,
    [dataView]
  );

  const filterQuery = useMemo(() => {
    if (isEmpty(pinnedEventIds)) {
      return '';
    }
    const filterObj = Object.entries(pinnedEventIds).reduce<PinnedFilter>(
      (acc, [pinnedId, isPinned]) => {
        if (isPinned) {
          return {
            ...acc,
            bool: {
              ...acc.bool,
              should: [
                ...acc.bool.should,
                {
                  match_phrase: {
                    _id: pinnedId,
                  },
                },
              ],
            },
          };
        }
        return acc;
      },
      {
        bool: {
          should: [],
          minimum_should_match: 1,
        },
      }
    );
    try {
      return JSON.stringify(filterObj);
    } catch {
      return '';
    }
  }, [pinnedEventIds]);

  const timelineQueryFields = useMemo(() => {
    const columnsHeader = isEmpty(columns) ? defaultUdtHeaders : columns;
    const columnFields = columnsHeader.map((c) => c.id);

    return [...columnFields, ...requiredFieldsForActions];
  }, [columns]);

  const timelineQuerySortField = useMemo(
    () =>
      sort.map(({ columnId, columnType, esTypes, sortDirection }) => ({
        field: columnId,
        type: columnType,
        direction: sortDirection as Direction,
        esTypes: esTypes ?? [],
      })),
    [sort]
  );
  const { augmentedColumnHeaders } = useTimelineColumns(columns);

  const [queryLoadingState, { events, totalCount, loadNextBatch, refreshedAt, refetch }] =
    useTimelineEvents({
      endDate: '',
      id: `pinned-${timelineId}`,
      indexNames: selectedPatterns,
      dataViewId: dataViewId ?? '',
      fields: timelineQueryFields,
      limit: itemsPerPage,
      filterQuery,
      runtimeMappings,
      skip: filterQuery === '',
      startDate: '',
      sort: timelineQuerySortField,
      timerangeKind: undefined,
    });

  const { onLoad: loadNotesOnEventsLoad } = useFetchNotes();

  useEffect(() => {
    // This useEffect loads the notes only for the events on the current
    // page.
    const eventsOnCurrentPage = events.slice(
      itemsPerPage * pageIndex,
      itemsPerPage * (pageIndex + 1)
    );
    if (eventsOnCurrentPage.length > 0) {
      loadNotesOnEventsLoad(eventsOnCurrentPage);
    }
  }, [events, pageIndex, itemsPerPage, loadNotesOnEventsLoad]);

  /**
   *
   * Triggers on Datagrid page change
   *
   */
  const onUpdatePageIndex = useCallback((newPageIndex: number) => setPageIndex(newPageIndex), []);

  const { openFlyout } = useExpandableFlyoutApi();

  const onToggleShowNotes = useCallback(
    (eventId?: string) => {
      if (!eventId) {
        return;
      }

      const indexName = selectedPatterns.join(',');
      openFlyout({
        right: {
          id: DocumentDetailsRightPanelKey,
          params: {
            id: eventId,
            indexName,
            scopeId: timelineId,
          },
        },
        left: {
          id: DocumentDetailsLeftPanelKey,
          path: {
            tab: LeftPanelNotesTab,
          },
          params: {
            id: eventId,
            indexName,
            scopeId: timelineId,
          },
        },
      });
      telemetry.reportEvent(NotesEventTypes.OpenNoteInExpandableFlyoutClicked, {
        location: timelineId,
      });
      telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
        location: timelineId,
        panel: 'left',
      });
    },
    [openFlyout, selectedPatterns, telemetry, timelineId]
  );

  const leadingControlColumns = useTimelineControlColumn({
    timelineId,
    refetch,
    events,
    eventIdToNoteIds,
    onToggleShowNotes,
  });

  return (
    <UnifiedTimelineBody
      header={<></>}
      columns={augmentedColumnHeaders}
      rowRenderers={rowRenderers}
      timelineId={timelineId}
      itemsPerPage={itemsPerPage}
      itemsPerPageOptions={itemsPerPageOptions}
      sort={sort}
      events={events}
      refetch={refetch}
      dataLoadingState={queryLoadingState}
      totalCount={totalCount}
      onFetchMoreRecords={loadNextBatch}
      activeTab={TimelineTabs.pinned}
      updatedAt={refreshedAt}
      isTextBasedQuery={false}
      leadingControlColumns={leadingControlColumns as EuiDataGridControlColumn[]}
      trailingControlColumns={rowDetailColumn}
      onUpdatePageIndex={onUpdatePageIndex}
    />
  );
};

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const mapStateToProps = (state: State, { timelineId }: TimelineTabCommonProps) => {
    const timeline: TimelineModel = getTimeline(state, timelineId) ?? timelineDefaults;
    const { columns, itemsPerPage, itemsPerPageOptions, pinnedEventIds, sort, eventIdToNoteIds } =
      timeline;

    return {
      columns,
      timelineId,
      itemsPerPage,
      itemsPerPageOptions,
      pinnedEventIds,
      sort,
      eventIdToNoteIds,
    };
  };
  return mapStateToProps;
};

const connector = connect(makeMapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

const PinnedTabContent = connector(
  memo(
    PinnedTabContentComponent,
    (prevProps, nextProps) =>
      prevProps.itemsPerPage === nextProps.itemsPerPage &&
      prevProps.timelineId === nextProps.timelineId &&
      deepEqual(prevProps.columns, nextProps.columns) &&
      deepEqual(prevProps.eventIdToNoteIds, nextProps.eventIdToNoteIds) &&
      deepEqual(prevProps.itemsPerPageOptions, nextProps.itemsPerPageOptions) &&
      deepEqual(prevProps.pinnedEventIds, nextProps.pinnedEventIds) &&
      deepEqual(prevProps.sort, nextProps.sort)
  )
);

// eslint-disable-next-line import/no-default-export
export { PinnedTabContent as default };
