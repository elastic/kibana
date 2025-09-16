/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import styled from 'styled-components';
import {
  makeSelectDocumentNotesBySavedObjectId,
  makeSelectNotesByDocumentId,
} from '../../../notes/store/notes.slice';
import type { State } from '../../store';
import { selectTimelineById } from '../../../timelines/store/selectors';
import {
  eventHasNotes,
  getEventType,
  getPinOnClick,
} from '../../../timelines/components/timeline/body/helpers';
import { isTimelineScope } from '../../../helpers';
import { useIsInvestigateInResolverActionEnabled } from '../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver';
import { timelineActions } from '../../../timelines/store';
import type { ActionProps, OnPinEvent } from '../../../../common/types';
import { TimelineId } from '../../../../common/types';
import { AddEventNoteAction } from './add_note_icon_item';
import { PinEventAction } from './pin_event_action';
import { useShallowEqualSelector } from '../../hooks/use_selector';
import { timelineDefaults } from '../../../timelines/store/defaults';
import { useStartTransaction } from '../../lib/apm/use_start_transaction';
import { useLicense } from '../../hooks/use_license';
import { ALERTS_ACTIONS } from '../../lib/apm/user_actions';
import { EventsTdContent } from '../../../timelines/components/timeline/styles';
import { AlertContextMenu } from '../../../detections/components/alerts_table/timeline_actions/alert_context_menu';
import { InvestigateInTimelineAction } from '../../../detections/components/alerts_table/timeline_actions/investigate_in_timeline_action';
import * as i18n from './translations';
import { DEFAULT_ACTION_BUTTON_WIDTH, isAlert } from './helpers';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { useNavigateToAnalyzer } from '../../../flyout/document_details/shared/hooks/use_navigate_to_analyzer';
import { useNavigateToSessionView } from '../../../flyout/document_details/shared/hooks/use_navigate_to_session_view';

const ActionsContainer = styled.div`
  align-items: center;
  display: flex;
`;

const emptyNotes: string[] = [];

const ActionsComponent: React.FC<ActionProps> = ({
  ariaRowindex,
  columnValues,
  disableExpandAction = false,
  ecsData,
  eventId,
  eventIdToNoteIds,
  isEventPinned = false,
  isEventViewer = false,
  onEventDetailsPanelOpened,
  onRuleChange,
  showNotes,
  timelineId,
  refetch,
  toggleShowNotes,
  disablePinAction = true,
  disableTimelineAction = false,
}) => {
  const dispatch = useDispatch();

  const { timelineType, savedObjectId } = useShallowEqualSelector((state) =>
    isTimelineScope(timelineId) ? selectTimelineById(state, timelineId) : timelineDefaults
  );

  const { startTransaction } = useStartTransaction();

  const onPinEvent: OnPinEvent = useCallback(
    (evtId) => dispatch(timelineActions.pinEvent({ id: timelineId, eventId: evtId })),
    [dispatch, timelineId]
  );

  const onUnPinEvent: OnPinEvent = useCallback(
    (evtId) => dispatch(timelineActions.unPinEvent({ id: timelineId, eventId: evtId })),
    [dispatch, timelineId]
  );

  const handlePinClicked = useCallback(
    () =>
      getPinOnClick({
        allowUnpinning: eventIdToNoteIds ? !eventHasNotes(eventIdToNoteIds[eventId]) : true,
        eventId,
        onPinEvent,
        onUnPinEvent,
        isEventPinned,
      }),
    [eventIdToNoteIds, eventId, isEventPinned, onPinEvent, onUnPinEvent]
  );
  const eventType = getEventType(ecsData);

  const isContextMenuDisabled = useMemo(() => {
    return (
      eventType !== 'signal' &&
      !(ecsData.event?.kind?.includes('event') && ecsData.agent?.type?.includes('endpoint'))
    );
  }, [ecsData, eventType]);

  const { navigateToAnalyzer } = useNavigateToAnalyzer({
    isFlyoutOpen: false,
    eventId,
    indexName: ecsData._index,
    scopeId: timelineId,
  });

  const { navigateToSessionView } = useNavigateToSessionView({
    isFlyoutOpen: false,
    eventId,
    indexName: ecsData._index,
    scopeId: timelineId,
  });

  const handleClick = useCallback(() => {
    startTransaction({ name: ALERTS_ACTIONS.OPEN_ANALYZER });
    navigateToAnalyzer();
  }, [startTransaction, navigateToAnalyzer]);

  const sessionViewConfig = useMemo(() => {
    const { process, _id, _index, timestamp, kibana } = ecsData;
    const sessionEntityId = process?.entry_leader?.entity_id?.[0];
    const sessionStartTime = process?.entry_leader?.start?.[0];
    const index = kibana?.alert?.ancestors?.index?.[0] || _index;

    if (index === undefined || sessionEntityId === undefined || sessionStartTime === undefined) {
      return null;
    }

    const jumpToEntityId = process?.entity_id?.[0];
    const investigatedAlertId = eventType === 'signal' || eventType === 'eql' ? _id : undefined;
    const jumpToCursor =
      (investigatedAlertId && ecsData.kibana?.alert.original_time?.[0]) || timestamp;

    return {
      index,
      sessionEntityId,
      sessionStartTime,
      jumpToEntityId,
      jumpToCursor,
      investigatedAlertId,
    };
  }, [ecsData, eventType]);

  const openSessionView = useCallback(() => {
    startTransaction({ name: ALERTS_ACTIONS.OPEN_SESSION_VIEW });
    navigateToSessionView();
  }, [navigateToSessionView, startTransaction]);

  const onExpandEvent = useCallback(() => {
    onEventDetailsPanelOpened();
  }, [onEventDetailsPanelOpened]);

  const securitySolutionNotesDisabled = useIsExperimentalFeatureEnabled(
    'securitySolutionNotesDisabled'
  );
  const selectNotesByDocumentId = useMemo(() => makeSelectNotesByDocumentId(), []);
  /* only applicable for new event based notes */
  const documentBasedNotes = useSelector((state: State) => selectNotesByDocumentId(state, eventId));
  const selectDocumentNotesBySavedObjectId = useMemo(
    () => makeSelectDocumentNotesBySavedObjectId(),
    []
  );
  const documentBasedNotesInTimeline = useSelector((state: State) =>
    selectDocumentNotesBySavedObjectId(state, eventId, savedObjectId ?? '')
  );

  /* note ids associated with the document AND attached to the current timeline, used for pinning */
  const timelineNoteIds = useMemo(() => {
    if (!securitySolutionNotesDisabled) {
      // if timeline is unsaved, there is no notes associated to timeline yet
      return savedObjectId ? documentBasedNotesInTimeline.map((note) => note.noteId) : [];
    }
    return eventIdToNoteIds?.[eventId] ?? emptyNotes;
  }, [
    eventIdToNoteIds,
    eventId,
    documentBasedNotesInTimeline,
    savedObjectId,
    securitySolutionNotesDisabled,
  ]);

  /* note count of the document */
  const notesCount = useMemo(
    () => (securitySolutionNotesDisabled ? timelineNoteIds.length : documentBasedNotes.length),
    [documentBasedNotes, timelineNoteIds, securitySolutionNotesDisabled]
  );

  // we hide the analyzer icon if the data is not available for the resolver
  // or if we are on the cases alerts table and the the visualization in flyout advanced setting is disabled
  const showAnalyzerIcon = useIsInvestigateInResolverActionEnabled(ecsData);

  // we hide the session view icon if the session view is not available
  // or if we are on the cases alerts table and the the visualization in flyout advanced setting is disabled
  // or if the user is not on an enterprise license or on the kubernetes page
  const isEnterprisePlus = useLicense().isEnterprise();
  const showSessionViewIcon = useMemo(
    () => sessionViewConfig !== null && isEnterprisePlus,

    [isEnterprisePlus, sessionViewConfig]
  );

  return (
    <ActionsContainer data-test-subj="actions-container">
      <>
        {!disableExpandAction && (
          <div key="expand-event">
            <EventsTdContent textAlign="center" width={DEFAULT_ACTION_BUTTON_WIDTH}>
              <EuiToolTip data-test-subj="expand-event-tool-tip" content={i18n.VIEW_DETAILS}>
                <EuiButtonIcon
                  aria-label={i18n.VIEW_DETAILS_FOR_ROW({ ariaRowindex, columnValues })}
                  data-test-subj="expand-event"
                  iconType="expand"
                  onClick={onExpandEvent}
                  size="s"
                  color="text"
                />
              </EuiToolTip>
            </EventsTdContent>
          </div>
        )}
        <>
          {!disableTimelineAction && timelineId !== TimelineId.active && (
            <InvestigateInTimelineAction
              ariaLabel={i18n.SEND_ALERT_TO_TIMELINE_FOR_ROW({ ariaRowindex, columnValues })}
              key="investigate-in-timeline"
              ecsRowData={ecsData}
            />
          )}
        </>
        {!isEventViewer && showNotes && (
          <AddEventNoteAction
            ariaLabel={i18n.ADD_NOTES_FOR_ROW({ ariaRowindex, columnValues })}
            key="add-event-note"
            timelineType={timelineType}
            notesCount={notesCount}
            eventId={eventId}
            toggleShowNotes={toggleShowNotes}
          />
        )}

        {!isEventViewer && !disablePinAction && (
          <PinEventAction
            ariaLabel={i18n.PIN_EVENT_FOR_ROW({ ariaRowindex, columnValues, isEventPinned })}
            isAlert={isAlert(eventType)}
            key="pin-event"
            onPinClicked={handlePinClicked}
            noteIds={timelineNoteIds}
            eventIsPinned={isEventPinned}
            timelineType={timelineType}
          />
        )}
        <AlertContextMenu
          ariaLabel={i18n.MORE_ACTIONS_FOR_ROW({ ariaRowindex, columnValues })}
          ariaRowindex={ariaRowindex}
          columnValues={columnValues}
          key="alert-context-menu"
          ecsRowData={ecsData}
          scopeId={timelineId}
          disabled={isContextMenuDisabled}
          onRuleChange={onRuleChange}
          refetch={refetch}
        />
        {showAnalyzerIcon ? (
          <div>
            <EventsTdContent textAlign="center" width={DEFAULT_ACTION_BUTTON_WIDTH}>
              <EuiToolTip
                data-test-subj="view-in-analyzer-tool-tip"
                content={i18n.ACTION_INVESTIGATE_IN_RESOLVER}
              >
                <EuiButtonIcon
                  aria-label={i18n.ACTION_INVESTIGATE_IN_RESOLVER_FOR_ROW({
                    ariaRowindex,
                    columnValues,
                  })}
                  data-test-subj="view-in-analyzer"
                  iconType="analyzeEvent"
                  onClick={handleClick}
                  size="s"
                  color="text"
                />
              </EuiToolTip>
            </EventsTdContent>
          </div>
        ) : null}
        {showSessionViewIcon ? (
          <div>
            <EventsTdContent textAlign="center" width={DEFAULT_ACTION_BUTTON_WIDTH}>
              <EuiToolTip data-test-subj="expand-event-tool-tip" content={i18n.OPEN_SESSION_VIEW}>
                <EuiButtonIcon
                  aria-label={i18n.VIEW_DETAILS_FOR_ROW({ ariaRowindex, columnValues })}
                  data-test-subj="session-view-button"
                  iconType="sessionViewer"
                  onClick={openSessionView}
                  size="s"
                  color="text"
                />
              </EuiToolTip>
            </EventsTdContent>
          </div>
        ) : null}
      </>
    </ActionsContainer>
  );
};

ActionsComponent.displayName = 'ActionsComponent';

export const Actions = React.memo(ActionsComponent);
