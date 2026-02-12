/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridControlColumn } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ConnectedProps } from 'react-redux';
import { connect } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import { InPortal } from 'react-reverse-portal';
import { DataLoadingState } from '@kbn/unified-data-table';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { RunTimeMappings } from '@kbn/timelines-plugin/common/search_strategy';
import { PageScope } from '../../../../../data_view_manager/constants';
import { useFetchNotes } from '../../../../../notes/hooks/use_fetch_notes';
import { InputsModelId } from '../../../../../common/store/inputs/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import {
  DocumentDetailsLeftPanelKey,
  DocumentDetailsRightPanelKey,
} from '../../../../../flyout/document_details/shared/constants/panel_keys';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { timelineSelectors } from '../../../../store';
import { useTimelineEvents } from '../../../../containers';
import { TimelineId, TimelineTabs } from '../../../../../../common/types/timeline';
import type { inputsModel, State } from '../../../../../common/store';
import { inputsSelectors } from '../../../../../common/store';
import { timelineDefaults } from '../../../../store/defaults';
import { useEqlEventsCountPortal } from '../../../../../common/hooks/use_timeline_events_count';
import type { TimelineModel } from '../../../../store/model';
import { useTimelineFullScreen } from '../../../../../common/containers/use_full_screen';
import { EventsCountBadge, FullWidthFlexGroup } from '../shared/layout';
import { isTimerangeSame, TIMELINE_NO_SORTING } from '../shared/utils';
import type { TimelineTabCommonProps } from '../shared/types';
import { UnifiedTimelineBody } from '../../body/unified_timeline_body';
import { EqlTabHeader } from './header';
import { useTimelineColumns } from '../shared/use_timeline_columns';
import { useTimelineControlColumn } from '../shared/use_timeline_control_columns';
import { LeftPanelNotesTab } from '../../../../../flyout/document_details/left';
import { DocumentEventTypes, NotesEventTypes } from '../../../../../common/lib/telemetry';
import { TimelineRefetch } from '../../refetch_timeline';
import { useDataView } from '../../../../../data_view_manager/hooks/use_data_view';
import { useSelectedPatterns } from '../../../../../data_view_manager/hooks/use_selected_patterns';

export type Props = TimelineTabCommonProps & PropsFromRedux;

export const EqlTabContentComponent: React.FC<Props> = ({
  activeTab,
  columns,
  end,
  eqlOptions,
  timelineId,
  itemsPerPage,
  itemsPerPageOptions,
  rowRenderers,
  start,
  timerangeKind,
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
  const { query: eqlQuery = '', ...restEqlOption } = eqlOptions;
  const { portalNode: eqlEventsCountPortalNode } = useEqlEventsCountPortal();
  const { setTimelineFullScreen, timelineFullScreen } = useTimelineFullScreen();

  const { dataView: experimentalDataView, status } = useDataView(PageScope.timeline);
  const selectedPatterns = useSelectedPatterns(PageScope.timeline);
  const dataViewId = experimentalDataView.id ?? null;
  const dataViewLoading = useMemo(() => status !== 'ready', [status]);
  const runtimeMappings = useMemo(
    () => experimentalDataView.getRuntimeMappings() as RunTimeMappings,
    [experimentalDataView]
  );

  const { augmentedColumnHeaders, timelineQueryFieldsFromColumns } = useTimelineColumns(columns);

  const getManageTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);

  const currentTimeline = useDeepEqualSelector((state) =>
    getManageTimeline(state, timelineId ?? TimelineId.active)
  );

  const { sampleSize } = currentTimeline;

  const isBlankTimeline: boolean = isEmpty(eqlQuery);

  const canQueryTimeline = useCallback(
    () =>
      dataViewLoading != null &&
      !dataViewLoading &&
      !isEmpty(start) &&
      !isEmpty(end) &&
      !isBlankTimeline,
    [end, isBlankTimeline, dataViewLoading, start]
  );

  const [dataLoadingState, { events, inspect, totalCount, loadNextBatch, refreshedAt, refetch }] =
    useTimelineEvents({
      dataViewId,
      endDate: end,
      eqlOptions: restEqlOption,
      fields: timelineQueryFieldsFromColumns,
      filterQuery: eqlQuery ?? '',
      id: timelineId,
      indexNames: selectedPatterns,
      language: 'eql',
      limit: sampleSize,
      runtimeMappings,
      skip: !canQueryTimeline(),
      startDate: start,
      timerangeKind,
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

  const isQueryLoading = useMemo(
    () =>
      dataLoadingState === DataLoadingState.loading ||
      dataLoadingState === DataLoadingState.loadingMore,
    [dataLoadingState]
  );

  const unifiedHeader = useMemo(
    () => (
      <EuiFlexGroup gutterSize="s" direction="column">
        <EqlTabHeader
          activeTab={activeTab}
          setTimelineFullScreen={setTimelineFullScreen}
          timelineFullScreen={timelineFullScreen}
          timelineId={timelineId}
        />
      </EuiFlexGroup>
    ),
    [activeTab, setTimelineFullScreen, timelineFullScreen, timelineId]
  );

  return (
    <>
      <TimelineRefetch
        id={`${timelineId}-${TimelineTabs.eql}`}
        inputId={InputsModelId.timeline}
        inspect={inspect}
        loading={isQueryLoading}
        refetch={refetch}
        skip={!canQueryTimeline}
      />
      <InPortal node={eqlEventsCountPortalNode}>
        {totalCount >= 0 ? (
          <EventsCountBadge data-test-subj="eql-events-count">{totalCount}</EventsCountBadge>
        ) : null}
      </InPortal>
      <FullWidthFlexGroup>
        <UnifiedTimelineBody
          header={unifiedHeader}
          columns={augmentedColumnHeaders}
          isSortEnabled={false}
          rowRenderers={rowRenderers}
          timelineId={timelineId}
          itemsPerPage={itemsPerPage}
          itemsPerPageOptions={itemsPerPageOptions}
          sort={TIMELINE_NO_SORTING}
          events={events}
          refetch={refetch}
          dataLoadingState={dataLoadingState}
          totalCount={isBlankTimeline ? 0 : totalCount}
          onFetchMoreRecords={loadNextBatch}
          activeTab={activeTab}
          updatedAt={refreshedAt}
          isTextBasedQuery={false}
          leadingControlColumns={leadingControlColumns as EuiDataGridControlColumn[]}
          onUpdatePageIndex={onUpdatePageIndex}
        />
      </FullWidthFlexGroup>
    </>
  );
};

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const mapStateToProps = (state: State, { timelineId }: TimelineTabCommonProps) => {
    const timeline: TimelineModel = getTimeline(state, timelineId) ?? timelineDefaults;
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    const { activeTab, columns, eqlOptions, itemsPerPage, itemsPerPageOptions, eventIdToNoteIds } =
      timeline;

    return {
      activeTab,
      columns,
      eqlOptions,
      end: input.timerange.to,
      timelineId,
      isLive: input.policy.kind === 'interval',
      itemsPerPage,
      itemsPerPageOptions,
      eventIdToNoteIds,
      start: input.timerange.from,
      timerangeKind: input.timerange.kind,
    };
  };
  return mapStateToProps;
};

const connector = connect(makeMapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

const EqlTabContent = connector(
  React.memo(
    EqlTabContentComponent,
    (prevProps, nextProps) =>
      prevProps.activeTab === nextProps.activeTab &&
      isTimerangeSame(prevProps, nextProps) &&
      deepEqual(prevProps.eqlOptions, nextProps.eqlOptions) &&
      prevProps.isLive === nextProps.isLive &&
      prevProps.itemsPerPage === nextProps.itemsPerPage &&
      prevProps.timelineId === nextProps.timelineId &&
      deepEqual(prevProps.columns, nextProps.columns) &&
      deepEqual(prevProps.eventIdToNoteIds, nextProps.eventIdToNoteIds) &&
      deepEqual(prevProps.itemsPerPageOptions, nextProps.itemsPerPageOptions)
  )
);

// eslint-disable-next-line import/no-default-export
export { EqlTabContent as default };
