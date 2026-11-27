/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiButton, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { isNonLocalIndexName } from '@kbn/es-query';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { ALERT_WORKFLOW_STATUS, EVENT_KIND } from '@kbn/rule-data-utils';
import type { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { EventKind } from '../constants/event_kinds';
import type { Status } from '../../../../../common/api/detection_engine';
import { useAddToCaseActions } from '../../../../detections/components/alerts_table/timeline_actions/use_add_to_case_actions';
import { useAlertsActions } from '../../../../detections/components/alerts_table/timeline_actions/use_alerts_actions';
import { useAlertAssigneesActions } from '../../../../detections/components/alerts_table/timeline_actions/use_alert_assignees_actions';
import { useAlertTagsActions } from '../../../../detections/components/alerts_table/timeline_actions/use_alert_tags_actions';
import { useAlertExceptionActions } from '../../../../detections/components/alerts_table/timeline_actions/use_add_exception_actions';
import { useInvestigateInTimeline } from '../../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline';
import { useIsInSecurityApp } from '../../../../common/hooks/is_in_security_app';
import { useRunAlertWorkflowPanel } from '../../../../detections/components/alerts_table/timeline_actions/use_run_alert_workflow_panel';
import { useRunDocumentWorkflowPanel } from '../../../../detections/components/alerts_table/timeline_actions/use_run_document_workflow_panel';
import { toDocumentSelections } from '../../../../detections/components/alerts_table/timeline_actions/to_document_selections';
import type { HostIsolationAction } from '../../../../common/components/endpoint/host_isolation/from_alerts/use_host_isolation_action';
import { useHostIsolationAction } from '../../../../common/components/endpoint/host_isolation/from_alerts/use_host_isolation_action';
import { HostIsolationFlyout } from '../../../../common/components/endpoint/host_isolation/from_alerts/host_isolation_flyout';
import { useResponderActionItem } from '../../../../common/components/endpoint/responder';
import { useExploreActions } from '../hooks/use_explore_actions';
import { AddExceptionFlyoutWrapper } from '../../../../detections/components/alerts_table/timeline_actions/alert_context_menu';
import { getOsqueryActionItem } from '../../../../detections/components/osquery/osquery_action_item';
import { OsqueryFlyout } from '../../../../detections/components/osquery/osquery_flyout';
import { getAlertDetailsFieldValue } from '../../../../common/lib/endpoint/utils/get_event_details_field_values';
import { APP_UI_ID, SecurityPageName } from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';
import { getTimelineEventsDetailsFromRecord } from '../utils/get_timeline_events_details_from_record';
import { useFlyoutTelemetry } from '../../../shared/hooks/use_flyout_telemetry';
import { ADD_NOTE_ACTION_ID, DETONATE_ACTION_ID } from '../../../../common/constants/action_ids';
import { useFlyoutApi } from '../../../use_flyout_api';
import { DETONATE_ACTION } from '../../../detonation/translations';
import type { DetonateSample } from '../../../detonation/submit_modal';
import { DetonateSubmitModal } from '../../../detonation/submit_modal';
import { DetonateChat } from '../../../detonation/detonate_chat';
import type { DetonateFileOption } from '../../../detonation/select_file_panel';
import {
  DETONATE_FILE_PANEL_ID,
  DETONATE_FILE_PANEL_WIDTH,
  DetonateSelectFilePanel,
} from '../../../detonation/select_file_panel';
import * as detonateFileI18n from '../../../detonation/select_file_translations';
import { useFlowVariant } from '../../../detonation/flow_variant';
import { addPendingDetonation } from '../../../detonation/pending_detonations';
import {
  DETONATION_SUBMITTED_TITLE,
  DetonationSubmittedToastContent,
} from '../../../detonation/submitted_toast';
import { FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID } from './test_ids';
import { ActionMenu, getActionGroups } from './action_menu';

const TAKE_ACTION = i18n.translate('xpack.securitySolution.flyoutV2.footer.takeActionButtonLabel', {
  defaultMessage: 'Take action',
});

const TAKE_ACTION_MENU = i18n.translate(
  'xpack.securitySolution.flyoutV2.footer.takeActionMenuLabel',
  {
    defaultMessage: 'Take action menu',
  }
);

const ADD_NOTE = i18n.translate('xpack.securitySolution.flyoutV2.footer.takeAction.addNoteLabel', {
  defaultMessage: 'Add note',
});

export interface TakeActionButtonProps {
  /**
   * The raw document record, used to extract alert metadata
   */
  hit: DataTableRecord;
  /**
   * ECS data for the document
   */
  ecsData: Ecs;
  /**
   * Callback to refetch flyout data
   */
  refetchFlyoutData: () => Promise<void>;
  /**
   * Callback invoked after alert mutations to refresh flyout data.
   */
  onAlertUpdated: () => void;
  /**
   * Callback to open the notes flyout. Shown in the dropdown only for raw events (not alerts).
   */
  onShowNotes: () => void;
}

/**
 * Take action button with dropdown used to show all the options available to the user on a document rendered in the expandable flyout
 * // TODO: refactor all actions to take a DataTableRecord as input.
 */
export const TakeActionButton = memo(
  ({ hit, ecsData, refetchFlyoutData, onAlertUpdated, onShowNotes }: TakeActionButtonProps) => {
    const { reportActionClicked } = useFlyoutTelemetry();
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const togglePopoverHandler = useCallback(() => setIsPopoverOpen((open) => !open), []);
    const closePopoverHandler = useCallback(() => setIsPopoverOpen(false), []);
    const [isolateAction, setIsolateAction] = useState<HostIsolationAction | null>(null);

    const isInSecurityApp = useIsInSecurityApp();

    const documentId = hit.raw._id ?? '';
    const isRemoteDocument = useMemo(
      () => isNonLocalIndexName(hit.raw._index ?? (getFieldValue(hit, '_index') as string) ?? ''),
      [hit]
    );
    const isAlert = useMemo(
      () => (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
      [hit]
    );
    const alertStatus = useMemo(() => getFieldValue(hit, ALERT_WORKFLOW_STATUS) as Status, [hit]);
    const isEndpointAlert = useMemo(
      () =>
        getFieldValue(hit, 'kibana.alert.original_event.module') === 'endpoint' &&
        getFieldValue(hit, 'kibana.alert.original_event.kind') === 'alert',
      [hit]
    );

    const dataFormattedForFieldBrowser = useMemo(
      () => getTimelineEventsDetailsFromRecord(hit),
      [hit]
    );

    const nonEcsData = useMemo(
      () => dataFormattedForFieldBrowser.map((d) => ({ field: d.field, value: d.values ?? null })),
      [dataFormattedForFieldBrowser]
    );

    const hostIsolationActionItems = useHostIsolationAction({
      closePopover: closePopoverHandler,
      detailsData: dataFormattedForFieldBrowser,
      onAddIsolationStatusClick: setIsolateAction,
    });

    const { addToCaseActionItems } = useAddToCaseActions({
      ecsData,
      nonEcsData,
      onMenuItemClick: closePopoverHandler,
      onSuccess: refetchFlyoutData,
    });

    const { actionItems: statusActionItems, panels: statusActionPanels } = useAlertsActions({
      alertStatus,
      closePopover: closePopoverHandler,
      eventId: documentId,
      scopeId: '',
      refetch: onAlertUpdated,
    });

    const { alertTagsItems, alertTagsPanels } = useAlertTagsActions({
      closePopover: closePopoverHandler,
      ecsRowData: ecsData,
      refetch: onAlertUpdated,
    });

    const onAssigneesUpdate = useCallback(() => {
      onAlertUpdated();
      refetchFlyoutData();
    }, [onAlertUpdated, refetchFlyoutData]);

    const { alertAssigneesItems, alertAssigneesPanels } = useAlertAssigneesActions({
      closePopover: closePopoverHandler,
      ecsRowData: ecsData,
      refetch: onAssigneesUpdate,
    });

    const { investigateInTimelineActionItems } = useInvestigateInTimeline({
      ecsRowData: ecsData,
      onInvestigateInTimelineAlertClick: closePopoverHandler,
    });

    const noteItems = useMemo(
      () => [
        {
          'data-test-subj': ADD_NOTE_ACTION_ID,
          key: ADD_NOTE_ACTION_ID,
          name: ADD_NOTE,
          onClick: () => {
            closePopoverHandler();
            onShowNotes();
          },
        },
      ],
      [closePopoverHandler, onShowNotes]
    );

    const { runWorkflowMenuItem, runAlertWorkflowPanel } = useRunAlertWorkflowPanel({
      ecsRowData: ecsData,
      closePopover: closePopoverHandler,
    });

    const documentIds = useMemo(
      () => toDocumentSelections([{ _id: documentId, _index: hit.raw._index }]),
      [documentId, hit.raw._index]
    );

    const { runWorkflowMenuItem: documentWorkflowMenuItem, runDocumentWorkflowPanel } =
      useRunDocumentWorkflowPanel({
        closePopover: closePopoverHandler,
        documentIds,
      });

    const { exploreActionItems } = useExploreActions({
      hit,
      closePopover: closePopoverHandler,
    });

    const responderActionItems = useResponderActionItem(
      dataFormattedForFieldBrowser,
      closePopoverHandler
    );

    // Prototype: "Detonate" opens a submit modal; submitting opens a fake detonation report flyout.
    const { openDetonationFlyoutAsChild } = useFlyoutApi();
    const [detonateSample, setDetonateSample] = useState<DetonateSample | null>(null);
    const flowVariant = useFlowVariant();
    const kibanaServices = useKibana().services;
    const [isDetonateSubmitting, setIsDetonateSubmitting] = useState(false);
    const detonateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(
      () => () => {
        if (detonateTimeoutRef.current) clearTimeout(detonateTimeoutRef.current);
      },
      []
    );

    // "Flow toast": no modal. Spin briefly, then confirm with a toast linking to the Detonate page.
    const submitDetonationWithToast = useCallback(
      (file: Pick<DetonateFileOption, 'fileName' | 'hostName' | 'sha256'>) => {
        setIsDetonateSubmitting(true);
        detonateTimeoutRef.current = setTimeout(() => {
          setIsDetonateSubmitting(false);
          closePopoverHandler();
          // The detonation keeps running after the toast: the Detonate page shows it as a pending row.
          addPendingDetonation(file);
          const { notifications, application } = kibanaServices;
          const toast = notifications.toasts.addSuccess({
            title: DETONATION_SUBMITTED_TITLE,
            text: toMountPoint(
              <DetonationSubmittedToastContent
                onView={() => {
                  notifications.toasts.remove(toast);
                  application.navigateToApp(APP_UI_ID, { deepLinkId: SecurityPageName.detonate });
                }}
              />,
              kibanaServices
            ),
            toastLifeTimeMs: 15000,
          });
        }, 2000);
      },
      [closePopoverHandler, kibanaServices]
    );
    const hostName = (getFieldValue(hit, 'host.name') as string | undefined) ?? '-';
    const detonateFiles = useMemo<DetonateFileOption[]>(
      () => [
        {
          id: 'alert-file',
          fileName:
            (getFieldValue(hit, 'file.name') as string | undefined) ??
            (getFieldValue(hit, 'process.name') as string | undefined) ??
            'invoice_Q3_final.exe',
          sha256:
            (getFieldValue(hit, 'file.hash.sha256') as string | undefined) ??
            '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
          hostName,
          description: 'File on the host that triggered this alert',
          badge: detonateFileI18n.BADGE_DETONATED,
          badgeColor: 'danger',
          isDetonated: true,
        },
        {
          id: 'dropped-file',
          fileName: 'svchost32.exe',
          sha256: 'a41f09c2d7e83b6f1c5a9d04e7b2c8f13a6d5e90b4c7f2a1d8e6b3095c4a77c2',
          hostName,
          description: 'Dropped by the process in %APPDATA%\\Roaming',
        },
        {
          id: 'downloaded-file',
          fileName: 'update_helper.dll',
          sha256: 'e0c7bb53a19d4f8e62b07c3d5a1f9e84d6b2c70a3f5e19d8c4b6a2071e3f1d90',
          hostName,
          description: 'Downloaded from 185.220.101.47 over HTTPS',
        },
      ],
      [hit, hostName]
    );
    const [isDetonateChatOpen, setIsDetonateChatOpen] = useState(false);
    const detonateItems = useMemo(
      () => [
        flowVariant === 'chat'
          ? {
              'data-test-subj': DETONATE_ACTION_ID,
              key: DETONATE_ACTION_ID,
              name: DETONATE_ACTION,
              onClick: () => {
                closePopoverHandler();
                setIsDetonateChatOpen(true);
              },
            }
          : {
              'data-test-subj': DETONATE_ACTION_ID,
              key: DETONATE_ACTION_ID,
              name: DETONATE_ACTION,
              panel: DETONATE_FILE_PANEL_ID,
            },
      ],
      [flowVariant, closePopoverHandler]
    );
    const detonatePanels = useMemo<EuiContextMenuPanelDescriptor[]>(
      () => [
        {
          id: DETONATE_FILE_PANEL_ID,
          title: detonateFileI18n.PANEL_TITLE,
          width: DETONATE_FILE_PANEL_WIDTH,
          content: (
            <DetonateSelectFilePanel
              files={detonateFiles}
              isSubmitting={isDetonateSubmitting}
              submitLabel={flowVariant === 'toast' ? DETONATE_ACTION : undefined}
              onContinue={(file) => {
                if (flowVariant === 'toast') {
                  submitDetonationWithToast(file);
                } else {
                  closePopoverHandler();
                  setDetonateSample(file);
                }
              }}
            />
          ),
        },
      ],
      [
        detonateFiles,
        closePopoverHandler,
        flowVariant,
        isDetonateSubmitting,
        submitDetonationWithToast,
      ]
    );
    const handleDetonateSubmit = useCallback(() => {
      setDetonateSample(null);
      openDetonationFlyoutAsChild();
    }, [openDetonationFlyoutAsChild]);
    const handleSeeAnalysis = useCallback(() => {
      setDetonateSample(null);
      openDetonationFlyoutAsChild({ skipDetonation: true });
    }, [openDetonationFlyoutAsChild]);
    const endpointResponseActionsConsoleItems = useMemo(
      () => [...responderActionItems, ...detonateItems],
      [responderActionItems, detonateItems]
    );

    const [osqueryAgentId, setOsqueryAgentId] = useState<string | null>(null);

    const agentId = useMemo(
      () =>
        getAlertDetailsFieldValue(
          { category: 'agent', field: 'agent.id' },
          dataFormattedForFieldBrowser
        ),
      [dataFormattedForFieldBrowser]
    );

    const handleOnCloseOsqueryFlyout = useCallback(() => {
      setOsqueryAgentId(null);
    }, []);

    const osQueryFlyoutDefaultValues = useMemo(
      () => (isAlert ? { alertIds: [documentId] } : undefined),
      [isAlert, documentId]
    );

    const handleOnOsqueryClick = useCallback(() => {
      setOsqueryAgentId(agentId);
      closePopoverHandler();
    }, [agentId, closePopoverHandler]);

    const osqueryActionItem = useMemo(
      () =>
        getOsqueryActionItem({
          handleClick: handleOnOsqueryClick,
        }),
      [handleOnOsqueryClick]
    );
    const osqueryItemsArray = useMemo(() => [osqueryActionItem], [osqueryActionItem]);

    const { osquery } = useKibana().services;
    const osqueryAvailable = osquery?.isOsqueryAvailable({
      agentId,
    });

    const [isExceptionFlyoutOpen, setIsExceptionFlyoutOpen] = useState(false);
    const [exceptionFlyoutType, setExceptionFlyoutType] = useState<ExceptionListTypeEnum | null>(
      null
    );
    const handleOpenAddRuleException = useCallback(
      (type?: ExceptionListTypeEnum) => {
        closePopoverHandler();
        setExceptionFlyoutType(type ?? null);
        setIsExceptionFlyoutOpen(true);
      },
      [closePopoverHandler]
    );
    const handleExceptionCancel = useCallback((_didRuleChange: boolean) => {
      setIsExceptionFlyoutOpen(false);
    }, []);
    const handleExceptionConfirm = useCallback(
      (_didRuleChange: boolean, didCloseAlert: boolean, didBulkCloseAlert: boolean) => {
        if (didCloseAlert || didBulkCloseAlert) {
          onAlertUpdated();
        }
        setIsExceptionFlyoutOpen(false);
      },
      [onAlertUpdated]
    );
    const { exceptionActionItems } = useAlertExceptionActions({
      isEndpointAlert,
      onAddExceptionTypeClick: handleOpenAddRuleException,
    });

    const osqueryAvailableFlag = Boolean(osqueryAvailable);
    const hasItems = useMemo(
      () =>
        getActionGroups({
          addToCaseItems: addToCaseActionItems,
          alertAssigneeItems: alertAssigneesItems,
          alertTagItems: alertTagsItems,
          documentWorkflowItems: documentWorkflowMenuItem,
          endpointResponseItems: endpointResponseActionsConsoleItems,
          exceptionItems: exceptionActionItems,
          exploreItems: exploreActionItems,
          hostIsolationItems: hostIsolationActionItems,
          investigateInTimelineItems: investigateInTimelineActionItems,
          isAlert,
          isInSecurityApp,
          isRemoteDocument,
          noteItems,
          osqueryAvailable: osqueryAvailableFlag,
          osqueryItems: osqueryItemsArray,
          runAlertWorkflowItems: runWorkflowMenuItem,
          statusItems: statusActionItems,
        }).some((group) => group.length > 0),
      [
        addToCaseActionItems,
        alertAssigneesItems,
        alertTagsItems,
        documentWorkflowMenuItem,
        endpointResponseActionsConsoleItems,
        exceptionActionItems,
        exploreActionItems,
        hostIsolationActionItems,
        investigateInTimelineActionItems,
        isAlert,
        isInSecurityApp,
        isRemoteDocument,
        noteItems,
        osqueryAvailableFlag,
        osqueryItemsArray,
        runWorkflowMenuItem,
        statusActionItems,
      ]
    );

    const takeActionButton = (
      <EuiButton
        data-test-subj={FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID}
        fill
        iconSide="right"
        iconType="chevronSingleDown"
        isDisabled={!hasItems}
        onClick={togglePopoverHandler}
      >
        {TAKE_ACTION}
      </EuiButton>
    );

    return (
      <>
        {isolateAction !== null && (
          <HostIsolationFlyout
            hit={hit}
            detailsData={dataFormattedForFieldBrowser}
            isolateAction={isolateAction}
            onClose={() => setIsolateAction(null)}
          />
        )}
        {detonateSample && (
          <DetonateSubmitModal
            sample={detonateSample}
            onClose={() => setDetonateSample(null)}
            onSubmit={handleDetonateSubmit}
            onSeeAnalysis={handleSeeAnalysis}
          />
        )}
        {isDetonateChatOpen && (
          <DetonateChat
            files={detonateFiles}
            onClose={() => setIsDetonateChatOpen(false)}
            onViewReport={handleSeeAnalysis}
          />
        )}
        {osqueryAgentId && (
          <OsqueryFlyout
            agentId={osqueryAgentId}
            defaultValues={osQueryFlyoutDefaultValues}
            onClose={handleOnCloseOsqueryFlyout}
            ecsData={ecsData}
          />
        )}
        <EuiPopover
          id="AlertTakeActionPanel"
          aria-label={TAKE_ACTION_MENU}
          button={takeActionButton}
          isOpen={isPopoverOpen}
          closePopover={closePopoverHandler}
          panelPaddingSize="none"
          anchorPosition="downLeft"
          repositionOnScroll
        >
          <ActionMenu
            addToCaseItems={addToCaseActionItems}
            alertAssigneeItems={alertAssigneesItems}
            alertAssigneePanels={alertAssigneesPanels}
            alertTagItems={alertTagsItems}
            alertTagPanels={alertTagsPanels}
            detonatePanels={detonatePanels}
            documentWorkflowItems={documentWorkflowMenuItem}
            endpointResponseItems={endpointResponseActionsConsoleItems}
            exceptionItems={exceptionActionItems}
            exploreItems={exploreActionItems}
            hostIsolationItems={hostIsolationActionItems}
            investigateInTimelineItems={investigateInTimelineActionItems}
            isAlert={isAlert}
            isInSecurityApp={isInSecurityApp}
            isRemoteDocument={isRemoteDocument}
            noteItems={noteItems}
            osqueryAvailable={Boolean(osqueryAvailable)}
            osqueryItems={osqueryItemsArray}
            reportActionClicked={reportActionClicked}
            runAlertWorkflowItems={runWorkflowMenuItem}
            runAlertWorkflowPanels={runAlertWorkflowPanel}
            runDocumentWorkflowPanels={runDocumentWorkflowPanel}
            statusItems={statusActionItems}
            statusPanels={statusActionPanels}
          />
        </EuiPopover>
        {isExceptionFlyoutOpen && (
          <AddExceptionFlyoutWrapper
            hit={hit}
            exceptionListType={exceptionFlyoutType}
            onCancel={handleExceptionCancel}
            onConfirm={handleExceptionConfirm}
          />
        )}
      </>
    );
  }
);

TakeActionButton.displayName = 'TakeActionButton';
