/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EuiPanel } from '@elastic/eui';
import type { Process } from '@kbn/session-view-plugin/common';
import { i18n } from '@kbn/i18n';
import { PageScope } from '../../../../data_view_manager/constants';
import type { CustomProcess } from '../../session_view/context';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { SESSION_VIEW_TEST_ID } from './test_ids';
import {
  DocumentDetailsPreviewPanelKey,
  DocumentDetailsSessionViewPanelKey,
} from '../../shared/constants/panel_keys';
import { useKibana } from '../../../../common/lib/kibana';
import { useDocumentDetailsContext } from '../../shared/context';
import { ALERT_PREVIEW_BANNER } from '../../preview/constants';
import { useLicense } from '../../../../common/hooks/use_license';
import { useSessionViewConfig } from '../../shared/hooks/use_session_view_config';
import { SessionViewNoDataMessage } from '../../shared/components/session_view_no_data_message';
import { DocumentEventTypes } from '../../../../common/lib/telemetry';
import { useSelectedPatterns } from '../../../../data_view_manager/hooks/use_selected_patterns';

export const SESSION_VIEW_ID = 'session-view';

export const SESSION_VIEWER_BANNER = {
  title: i18n.translate('xpack.securitySolution.flyout.preview.sessionViewerTitle', {
    defaultMessage: 'Preview session view panel',
  }),
  backgroundColor: 'warning',
  textColor: 'warning',
};

const EUI_HEADER_HEIGHT = 96;
const EXPANDABLE_FLYOUT_LEFT_SECTION_HEADER_HEIGHT = 72;
const VISUALIZE_WRAPPER_PADDING = 16;
const VISUALIZE_BUTTON_GROUP_HEIGHT = 32;
const EUI_SPACER_HEIGHT = 16;
const SESSION_VIEW_SEARCH_BAR_HEIGHT = 64;

/**
 * Session view displayed in the document details expandable flyout left section under the Visualize tab
 */
export const SessionView: FC = memo(() => {
  const { sessionView, telemetry } = useKibana().services;
  const {
    eventId,
    indexName,
    getFieldsData,
    scopeId,
    dataFormattedForFieldBrowser,
    jumpToEntityId,
    jumpToCursor,
  } = useDocumentDetailsContext();

  const { canReadPolicyManagement } = useUserPrivileges().endpointPrivileges;

  const sessionViewConfig = useSessionViewConfig({ getFieldsData, dataFormattedForFieldBrowser });
  const isEnterprisePlus = useLicense().isEnterprise();
  const isEnabled = sessionViewConfig && isEnterprisePlus;

  const selectedPatterns = useSelectedPatterns(PageScope.alerts);
  const alertsIndex = useMemo(() => selectedPatterns.join(','), [selectedPatterns]);

  const { openPreviewPanel, closePreviewPanel } = useExpandableFlyoutApi();
  const openAlertDetailsPreview = useCallback(
    (evtId?: string, onClose?: () => void) => {
      // In the SessionView component, when the user clicks on the
      // expand button to open a alert in the preview panel, this actually also selects the row and opens
      // the detailed panel in preview.
      // In order to NOT modify the SessionView code, the setTimeout here guarantees that the alert details preview
      // will be opened in second, so that we have a correct order in the opened preview panels
      setTimeout(() => {
        openPreviewPanel({
          id: DocumentDetailsPreviewPanelKey,
          params: {
            id: evtId,
            indexName: alertsIndex,
            scopeId,
            banner: ALERT_PREVIEW_BANNER,
            isPreviewMode: true,
          },
        });
      }, 100);
      telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
        location: scopeId,
        panel: 'preview',
      });
    },
    [openPreviewPanel, alertsIndex, scopeId, telemetry]
  );

  const openDetailsInPreview = useCallback(
    (selectedProcess: Process | null) => {
      // We cannot pass the original Process object sent from the SessionView component
      // as it contains functions (that should not put into Redux)
      // and also some recursive properties (that will break rison.encode when updating the URL)
      const simplifiedSelectedProcess: CustomProcess | null = selectedProcess
        ? {
            id: selectedProcess.id,
            details: selectedProcess.getDetails(),
            endTime: selectedProcess.getEndTime(),
          }
        : null;

      openPreviewPanel({
        id: DocumentDetailsSessionViewPanelKey,
        params: {
          eventId,
          indexName,
          selectedProcess: simplifiedSelectedProcess,
          index: sessionViewConfig?.index,
          sessionEntityId: sessionViewConfig?.sessionEntityId,
          sessionStartTime: sessionViewConfig?.sessionStartTime,
          investigatedAlertId: sessionViewConfig?.investigatedAlertId,
          scopeId,
          jumpToEntityId,
          jumpToCursor,
          banner: SESSION_VIEWER_BANNER,
        },
      });
    },
    [
      openPreviewPanel,
      eventId,
      indexName,
      sessionViewConfig?.index,
      sessionViewConfig?.sessionEntityId,
      sessionViewConfig?.sessionStartTime,
      sessionViewConfig?.investigatedAlertId,
      scopeId,
      jumpToEntityId,
      jumpToCursor,
    ]
  );

  const closeDetailsInPreview = useCallback(() => closePreviewPanel(), [closePreviewPanel]);

  const height =
    window.innerHeight -
    EUI_HEADER_HEIGHT -
    EXPANDABLE_FLYOUT_LEFT_SECTION_HEADER_HEIGHT -
    2 * VISUALIZE_WRAPPER_PADDING -
    VISUALIZE_BUTTON_GROUP_HEIGHT -
    EUI_SPACER_HEIGHT -
    SESSION_VIEW_SEARCH_BAR_HEIGHT;

  return isEnabled ? (
    <div data-test-subj={SESSION_VIEW_TEST_ID}>
      {sessionView.getSessionView({
        ...sessionViewConfig,
        height,
        isFullScreen: true,
        loadAlertDetails: openAlertDetailsPreview,
        openDetails: (selectedProcess: Process | null) => openDetailsInPreview(selectedProcess),
        closeDetails: () => closeDetailsInPreview(),
        canReadPolicyManagement,
        resetJumpToEntityId: jumpToEntityId,
        resetJumpToCursor: jumpToCursor,
      })}
    </div>
  ) : (
    <EuiPanel hasShadow={false}>
      <SessionViewNoDataMessage
        isEnterprisePlus={isEnterprisePlus}
        hasSessionViewConfig={sessionViewConfig !== null}
      />
    </EuiPanel>
  );
});

SessionView.displayName = 'SessionView';
