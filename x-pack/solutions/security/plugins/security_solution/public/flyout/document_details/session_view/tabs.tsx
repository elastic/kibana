/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { ProcessEvent } from '@kbn/session-view-plugin/common';
import { ProcessTab } from '../../../flyout_v2/document/tools/session_view/components/process_tab';
import { MetadataTab } from '../../../flyout_v2/document/tools/session_view/components/metadata_tab';
import { AlertsTab } from '../../../flyout_v2/document/tools/session_view/components/alerts_tab';
import { ALERTS_TAB_TEST_ID, METADATA_TAB_TEST_ID, PROCESS_TAB_TEST_ID } from './test_ids';
import type { SessionViewPanelPaths } from '.';
import { useSessionViewPanelContext } from './context';
import { LeftPanelVisualizeTab } from '../left';
import { SESSION_VIEW_ID } from '../left/components/session_view';
import {
  DocumentDetailsLeftPanelKey,
  DocumentDetailsPreviewPanelKey,
} from '../shared/constants/panel_keys';
import { ALERT_PREVIEW_BANNER } from '../preview/constants';

export interface SessionViewPanelTabType {
  id: SessionViewPanelPaths;
  name: ReactElement;
  content: React.ReactElement;
  'data-test-subj': string;
}

const ProcessTabContent = () => {
  const { selectedProcess, index } = useSessionViewPanelContext();

  return <ProcessTab selectedProcess={selectedProcess} index={index} />;
};

const MetadataTabContent = () => {
  const { selectedProcess } = useSessionViewPanelContext();

  return <MetadataTab selectedProcess={selectedProcess} />;
};

const AlertsTabContent = () => {
  const { eventId, indexName, investigatedAlertId, sessionEntityId, sessionStartTime, scopeId } =
    useSessionViewPanelContext();
  const { openPreviewPanel, openLeftPanel } = useExpandableFlyoutApi();

  const onShowAlertDetails = useCallback(
    (alertId: string, alertIndex: string) => {
      openPreviewPanel({
        id: DocumentDetailsPreviewPanelKey,
        params: {
          id: alertId,
          indexName: alertIndex,
          scopeId,
          banner: ALERT_PREVIEW_BANNER,
          isPreviewMode: true,
        },
      });
    },
    [openPreviewPanel, scopeId]
  );

  const onJumpToEvent = useCallback(
    (event: ProcessEvent) => {
      let jumpToEntityId = null;
      let jumpToCursor = null;
      if (event.process) {
        const { entity_id: entityId } = event.process;
        if (entityId !== sessionEntityId) {
          const alert = event.kibana?.alert;
          const cursor = alert ? alert?.original_time : event['@timestamp'];

          if (cursor) {
            jumpToEntityId = entityId;
            jumpToCursor = cursor;
          }
        }
      }

      openLeftPanel({
        id: DocumentDetailsLeftPanelKey,
        params: {
          id: eventId,
          indexName,
          scopeId,
          jumpToEntityId,
          jumpToCursor,
        },
        path: {
          tab: LeftPanelVisualizeTab,
          subTab: SESSION_VIEW_ID,
        },
      });
    },
    [eventId, indexName, openLeftPanel, scopeId, sessionEntityId]
  );

  return (
    <AlertsTab
      investigatedAlertId={investigatedAlertId}
      sessionEntityId={sessionEntityId}
      sessionStartTime={sessionStartTime}
      onJumpToEvent={onJumpToEvent}
      onShowAlertDetails={onShowAlertDetails}
    />
  );
};

export const processTab: SessionViewPanelTabType = {
  id: 'process',
  'data-test-subj': PROCESS_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.preview.sessionview.header.processTabLabel"
      defaultMessage="Process"
    />
  ),
  content: <ProcessTabContent />,
};

export const metadataTab: SessionViewPanelTabType = {
  id: 'metadata',
  'data-test-subj': METADATA_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.preview.sessionview.header.metadataTabLabel"
      defaultMessage="Metadata"
    />
  ),
  content: <MetadataTabContent />,
};

export const alertsTab: SessionViewPanelTabType = {
  id: 'alerts',
  'data-test-subj': ALERTS_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.preview.sessionview.header.alertsTabLabel"
      defaultMessage="Alerts"
    />
  ),
  content: <AlertsTabContent />,
};
