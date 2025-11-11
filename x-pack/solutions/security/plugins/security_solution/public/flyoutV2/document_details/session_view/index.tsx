/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import { EuiPanel, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useFlyoutApi } from '@kbn/flyout';
import { ALERT_PREVIEW_BANNER } from '../../../flyout/document_details/preview/constants';
import {
  DocumentDetailsPreviewPanelKeyV2,
  DocumentDetailsSessionViewPanelKeyV2,
} from '../shared/constants/panel_keys';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { useSessionViewConfig } from '../shared/hooks/use_session_view_config';
import { SessionViewNoDataMessage } from '../shared/components/session_view_no_data_message';
import { PREFIX } from '../../shared/test_ids';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useDocumentDetailsContext } from '../shared/context';
import type { DocumentDetailsProps } from '../shared/types';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { useSelectedPatterns } from '../../../data_view_manager/hooks/use_selected_patterns';
import { useLicense } from '../../../common/hooks/use_license';
import { useKibana } from '../../../common/lib/kibana';
import { SourcererScopeName } from '../../../sourcerer/store/model';

const SESSION_VIEW_TEST_ID = `${PREFIX}SessionView` as const;

export const SESSION_VIEWER_BANNER = {
  title: i18n.translate('xpack.securitySolution.flyout.preview.sessionViewerTitle', {
    defaultMessage: 'Preview session view panel',
  }),
  backgroundColor: 'warning',
  textColor: 'warning',
};

export const SessionViewMainPanel: FC<Partial<DocumentDetailsProps>> = memo(() => {
  const { euiTheme } = useEuiTheme();
  const { sessionView } = useKibana().services;
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

  const { selectedPatterns: oldSelectedPatterns } = useSourcererDataView(
    SourcererScopeName.detections
  );

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const experimentalSelectedPatterns = useSelectedPatterns(SourcererScopeName.detections);

  const selectedPatterns = newDataViewPickerEnabled
    ? experimentalSelectedPatterns
    : oldSelectedPatterns;

  const alertsIndex = useMemo(() => selectedPatterns.join(','), [selectedPatterns]);

  const { openChildPanel, closeChildPanel } = useFlyoutApi();

  const openAlertDetailsPreview = useCallback(
    (evtId?: string, onClose?: () => void) => {
      // In the SessionView component, when the user clicks on the
      // expand button to open a alert in the preview panel, this actually also selects the row and opens
      // the detailed panel in preview.
      // In order to NOT modify the SessionView code, the setTimeout here guarantees that the alert details preview
      // will be opened in second, so that we have a correct order in the opened preview panels
      setTimeout(() => {
        openChildPanel(
          {
            id: DocumentDetailsPreviewPanelKeyV2,
            params: {
              id: evtId,
              indexName: alertsIndex,
              scopeId,
              banner: ALERT_PREVIEW_BANNER,
              isPreviewMode: true,
            },
          },
          's'
        );
      }, 100);
    },
    [openChildPanel, alertsIndex, scopeId]
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

      openChildPanel(
        {
          id: DocumentDetailsSessionViewPanelKeyV2,
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
        },
        's'
      );
    },
    [
      openChildPanel,
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

  const closeDetailsInPreview = useCallback(() => closeChildPanel(), [closeChildPanel]);

  return (
    <FlyoutBody
      css={css`
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
      `}
    >
      {isEnabled ? (
        <div data-test-subj={SESSION_VIEW_TEST_ID}>
          {sessionView.getSessionView({
            ...sessionViewConfig,
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
      )}
    </FlyoutBody>
  );
});

SessionViewMainPanel.displayName = 'SessionViewMainPanel';
