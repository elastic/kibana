/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiPanel, EuiTabbedContent } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Process, ProcessEvent } from '@kbn/session-view-plugin/common';
import { useStore } from 'react-redux';
import { useHistory } from 'react-router-dom';
import type { CellActionRenderer } from '../../shared/components/cell_actions';
import { DocumentFlyoutWrapper } from '../../document/document_flyout_wrapper';
import { flyoutProviders } from '../../shared/components/flyout_provider';
import { PREFIX } from '../../../flyout/shared/test_ids';
import { type CustomProcess } from '../../../flyout/document_details/session_view/context';
import { AlertsTab } from './alerts_tab';
import { MetadataTab } from './metadata_tab';
import { ProcessTab } from './process_tab';
import { useKibana } from '../../../common/lib/kibana';
import { useDefaultDocumentFlyoutProperties } from '../../shared/hooks/use_default_flyout_properties';

export const SESSION_VIEW_DETAILS_TEST_ID = `${PREFIX}SessionViewDetails` as const;

export interface SessionViewDetailsProps {
  /**
   *
   */
  selectedProcess: CustomProcess | Process;
  /**
   * Index coming from the session view config
   */
  index: string;
  /**
   * Id of the session entity displayed, coming from the session view config
   */
  sessionEntityId: string;
  /**
   * Start time of the session, coming from the session view config
   */
  sessionStartTime: string;
  /**
   * Id of the investigated alert document, coming from the session view config
   */
  investigatedAlertId: string;
  /**
   * Renderer used by Session View panels for field cell actions.
   */
  renderCellActions: CellActionRenderer;
  /**
   * Callback function to jump to a specific event in SessionView
   */
  onJumpToEvent: (event: ProcessEvent) => void;
  /**
   * Callback invoked after alert mutations to refresh parent flyout content.
   */
  onAlertUpdated: () => void;
}

/**
 * Detail panel shown when a user click on an entry in the Session View component.
 */
export const SessionViewDetails = memo(
  ({
    selectedProcess,
    index,
    sessionEntityId,
    sessionStartTime,
    investigatedAlertId,
    renderCellActions,
    onJumpToEvent,
    onAlertUpdated,
  }: SessionViewDetailsProps) => {
    const { services } = useKibana();
    const { overlays } = services;
    const store = useStore();
    const history = useHistory();
    const defaultFlyoutProperties = useDefaultDocumentFlyoutProperties();

    const onShowAlertDetails = useCallback(
      (alertId: string, alertIndex: string) => {
        overlays.openSystemFlyout(
          flyoutProviders({
            services,
            store,
            history,
            children: (
              <DocumentFlyoutWrapper
                documentId={alertId}
                indexName={alertIndex}
                renderCellActions={renderCellActions}
                onAlertUpdated={onAlertUpdated}
              />
            ),
          }),
          {
            ...defaultFlyoutProperties,
            session: 'inherit',
          }
        );
      },
      [
        defaultFlyoutProperties,
        history,
        onAlertUpdated,
        overlays,
        renderCellActions,
        services,
        store,
      ]
    );

    const handleJumpToEvent = useCallback(
      (event: ProcessEvent) => {
        onJumpToEvent(event);
      },
      [onJumpToEvent]
    );

    const tabs = useMemo(
      () => [
        {
          id: 'process',
          name: (
            <FormattedMessage
              id="xpack.securitySolution.flyout.preview.sessionview.header.processTabLabel"
              defaultMessage="Process"
            />
          ),
          content: <ProcessTab selectedProcess={selectedProcess} index={index} />,
        },
        {
          id: 'metadata',
          name: (
            <FormattedMessage
              id="xpack.securitySolution.flyout.preview.sessionview.header.metadataTabLabel"
              defaultMessage="Metadata"
            />
          ),
          content: <MetadataTab selectedProcess={selectedProcess} />,
        },
        {
          id: 'alerts',
          name: (
            <FormattedMessage
              id="xpack.securitySolution.flyout.preview.sessionview.header.alertsTabLabel"
              defaultMessage="Alerts"
            />
          ),
          content: (
            <AlertsTab
              investigatedAlertId={investigatedAlertId}
              sessionEntityId={sessionEntityId}
              sessionStartTime={sessionStartTime}
              onJumpToEvent={handleJumpToEvent}
              onShowAlertDetails={onShowAlertDetails}
            />
          ),
        },
      ],
      [
        index,
        investigatedAlertId,
        handleJumpToEvent,
        onShowAlertDetails,
        selectedProcess,
        sessionEntityId,
        sessionStartTime,
      ]
    );

    return (
      <EuiPanel data-test-subj={SESSION_VIEW_DETAILS_TEST_ID}>
        <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} autoFocus="selected" />
      </EuiPanel>
    );
  }
);

SessionViewDetails.displayName = 'SessionViewDetails';
