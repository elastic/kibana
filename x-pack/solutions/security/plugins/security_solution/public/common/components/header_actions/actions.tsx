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
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { TimelineTabs, TableId } from '@kbn/securitysolution-data-table';
import { ENABLE_VISUALIZATIONS_IN_FLYOUT_SETTING } from '../../../../common/constants';
import {
  selectNotesByDocumentId,
  selectDocumentNotesBySavedObjectId,
} from '../../../notes/store/notes.slice';
import type { State } from '../../store';
import { selectTimelineById } from '../../../timelines/store/selectors';
import {
  eventHasNotes,
  getEventType,
  getPinOnClick,
} from '../../../timelines/components/timeline/body/helpers';
import { getScopedActions, isTimelineScope } from '../../../helpers';
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
import { useGlobalFullScreen, useTimelineFullScreen } from '../../containers/use_full_screen';
import { ALERTS_ACTIONS } from '../../lib/apm/user_actions';
import { setActiveTabTimeline } from '../../../timelines/store/actions';
import { EventsTdContent } from '../../../timelines/components/timeline/styles';
import { AlertContextMenu } from '../../../detections/components/alerts_table/timeline_actions/alert_context_menu';
import { InvestigateInTimelineAction } from '../../../detections/components/alerts_table/timeline_actions/investigate_in_timeline_action';
import * as i18n from './translations';
import { useTourContext } from '../guided_onboarding_tour';
import { AlertsCasesTourSteps, SecurityStepId } from '../guided_onboarding_tour/tour_config';
import { isDetectionsAlertsTable } from '../top_n/helpers';
import { GuidedOnboardingTourStep } from '../guided_onboarding_tour/tour_step';
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

  const [visualizationInFlyoutEnabled] = useUiSetting$<boolean>(
    ENABLE_VISUALIZATIONS_IN_FLYOUT_SETTING
  );

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

  const { setGlobalFullScreen } = useGlobalFullScreen();
  const { setTimelineFullScreen } = useTimelineFullScreen();
  const handleClick = useCallback(() => {
    startTransaction({ name: ALERTS_ACTIONS.OPEN_ANALYZER });

    if (visualizationInFlyoutEnabled) {
      navigateToAnalyzer();
    } else {
      const scopedActions = getScopedActions(timelineId);

      const dataGridIsFullScreen = document.querySelector('.euiDataGrid--fullScreen');
      if (scopedActions) {
        dispatch(scopedActions.updateGraphEventId({ id: timelineId, graphEventId: ecsData._id }));
      }
      if (timelineId === TimelineId.active) {
        if (dataGridIsFullScreen) {
          setTimelineFullScreen(true);
        }
        dispatch(setActiveTabTimeline({ id: timelineId, activeTab: TimelineTabs.graph }));
      } else {
        if (dataGridIsFullScreen) {
          setGlobalFullScreen(true);
        }
      }
    }
  }, [
    startTransaction,
    timelineId,
    dispatch,
    ecsData._id,
    setTimelineFullScreen,
    setGlobalFullScreen,
    visualizationInFlyoutEnabled,
    navigateToAnalyzer,
  ]);

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
    const dataGridIsFullScreen = document.querySelector('.euiDataGrid--fullScreen');
    startTransaction({ name: ALERTS_ACTIONS.OPEN_SESSION_VIEW });

    if (
      visualizationInFlyoutEnabled &&
      sessionViewConfig !== null &&
      timelineId !== TableId.kubernetesPageSessions
    ) {
      navigateToSessionView();
    } else {
      const scopedActions = getScopedActions(timelineId);

      if (timelineId === TimelineId.active) {
        if (dataGridIsFullScreen) {
          setTimelineFullScreen(true);
        }
        if (sessionViewConfig !== null) {
          dispatch(setActiveTabTimeline({ id: timelineId, activeTab: TimelineTabs.session }));
        }
      } else {
        if (dataGridIsFullScreen) {
          setGlobalFullScreen(true);
        }
      }
      if (sessionViewConfig !== null) {
        if (scopedActions) {
          dispatch(scopedActions.updateSessionViewConfig({ id: timelineId, sessionViewConfig }));
        }
      }
    }
  }, [
    startTransaction,
    timelineId,
    sessionViewConfig,
    setTimelineFullScreen,
    dispatch,
    setGlobalFullScreen,
    visualizationInFlyoutEnabled,
    navigateToSessionView,
  ]);

  const { activeStep, isTourShown, incrementStep } = useTourContext();

  const isTourAnchor = useMemo(
    () =>
      isTourShown(SecurityStepId.alertsCases) &&
      eventType === 'signal' &&
      isDetectionsAlertsTable(timelineId) &&
      ariaRowindex === 1,
    [isTourShown, ariaRowindex, eventType, timelineId]
  );

  const onExpandEvent = useCallback(() => {
    if (
      isTourAnchor &&
      activeStep === AlertsCasesTourSteps.expandEvent &&
      isTourShown(SecurityStepId.alertsCases)
    ) {
      incrementStep(SecurityStepId.alertsCases);
    }
    onEventDetailsPanelOpened();
  }, [activeStep, incrementStep, isTourAnchor, isTourShown, onEventDetailsPanelOpened]);

  const securitySolutionNotesDisabled = useIsExperimentalFeatureEnabled(
    'securitySolutionNotesDisabled'
  );

  /* only applicable for new event based notes */
  const documentBasedNotes = useSelector((state: State) => selectNotesByDocumentId(state, eventId));
  const documentBasedNotesInTimeline = useSelector((state: State) =>
    selectDocumentNotesBySavedObjectId(state, {
      documentId: eventId,
      savedObjectId: savedObjectId ?? '',
    })
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
  const ecsHasDataForAnalyzer = useIsInvestigateInResolverActionEnabled(ecsData);
  const showAnalyzerIcon = useMemo(() => {
    return (
      ecsHasDataForAnalyzer &&
      (timelineId !== TableId.alertsOnCasePage ||
        (timelineId === TableId.alertsOnCasePage && visualizationInFlyoutEnabled))
    );
  }, [ecsHasDataForAnalyzer, timelineId, visualizationInFlyoutEnabled]);

  // we hide the session view icon if the session view is not available
  // or if we are on the cases alerts table and the the visualization in flyout advanced setting is disabled
  // or if the user is not on an enterprise license or on the kubernetes page
  const isEnterprisePlus = useLicense().isEnterprise();
  const showSessionViewIcon = useMemo(() => {
    return (
      sessionViewConfig !== null &&
      (isEnterprisePlus || timelineId === TableId.kubernetesPageSessions) &&
      (timelineId !== TableId.alertsOnCasePage ||
        (timelineId === TableId.alertsOnCasePage && visualizationInFlyoutEnabled))
    );
  }, [sessionViewConfig, isEnterprisePlus, timelineId, visualizationInFlyoutEnabled]);

  return (
    <ActionsContainer data-test-subj="actions-container">
      <>
        {!disableExpandAction && (
          <GuidedOnboardingTourStep
            isTourAnchor={isTourAnchor}
            onClick={onExpandEvent}
            step={AlertsCasesTourSteps.expandEvent}
            tourId={SecurityStepId.alertsCases}
          >
            <div key="expand-event">
              <EventsTdContent textAlign="center" width={DEFAULT_ACTION_BUTTON_WIDTH}>
                <EuiToolTip data-test-subj="expand-event-tool-tip" content={i18n.VIEW_DETAILS}>
                  <EuiButtonIcon
                    aria-label={i18n.VIEW_DETAILS_FOR_ROW({ ariaRowindex, columnValues })}
                    data-test-subj="expand-event"
                    iconType="expand"
                    onClick={onExpandEvent}
                    size="s"
                  />
                </EuiToolTip>
              </EventsTdContent>
            </div>
          </GuidedOnboardingTourStep>
        )}
        <>
          {timelineId !== TimelineId.active && (
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
