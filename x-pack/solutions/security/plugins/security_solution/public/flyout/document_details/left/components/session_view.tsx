/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { TableId } from '@kbn/securitysolution-data-table';
import { EuiPanel } from '@elastic/eui';
import {
  ANCESTOR_INDEX,
  ENTRY_LEADER_ENTITY_ID,
  ENTRY_LEADER_START,
} from '../../shared/constants/field_names';
import { getField } from '../../shared/utils';
import { SESSION_VIEW_TEST_ID } from './test_ids';
import { isActiveTimeline } from '../../../../helpers';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { DocumentDetailsPreviewPanelKey } from '../../shared/constants/panel_keys';
import { useKibana } from '../../../../common/lib/kibana';
import { useDocumentDetailsContext } from '../../shared/context';
import { SourcererScopeName } from '../../../../sourcerer/store/model';
import { detectionsTimelineIds } from '../../../../timelines/containers/helpers';
import { ALERT_PREVIEW_BANNER } from '../../preview/constants';
import { useLicense } from '../../../../common/hooks/use_license';
import { useSessionPreview } from '../../right/hooks/use_session_preview';
import { SessionViewNoDataMessage } from '../../shared/components/session_view_no_data_message';
import { DocumentEventTypes } from '../../../../common/lib/telemetry';

export const SESSION_VIEW_ID = 'session-view';

/**
 * Session view displayed in the document details expandable flyout left section under the Visualize tab
 */
export const SessionView: FC = () => {
  const { sessionView, telemetry } = useKibana().services;
  const { getFieldsData, indexName, scopeId, dataFormattedForFieldBrowser } =
    useDocumentDetailsContext();

  const sessionViewConfig = useSessionPreview({ getFieldsData, dataFormattedForFieldBrowser });
  const isEnterprisePlus = useLicense().isEnterprise();
  const isEnabled = sessionViewConfig && isEnterprisePlus;

  const ancestorIndex = getField(getFieldsData(ANCESTOR_INDEX)); // e.g in case of alert, we want to grab it's origin index
  const sessionEntityId = getField(getFieldsData(ENTRY_LEADER_ENTITY_ID)) || '';
  const sessionStartTime = getField(getFieldsData(ENTRY_LEADER_START)) || '';
  const index = ancestorIndex || indexName;

  const sourcererScope = useMemo(() => {
    if (isActiveTimeline(scopeId)) {
      return SourcererScopeName.timeline;
    } else if (detectionsTimelineIds.includes(scopeId as TableId)) {
      return SourcererScopeName.detections;
    } else {
      return SourcererScopeName.default;
    }
  }, [scopeId]);

  const { selectedPatterns } = useSourcererDataView(sourcererScope);
  const eventDetailsIndex = useMemo(() => selectedPatterns.join(','), [selectedPatterns]);

  const { openPreviewPanel } = useExpandableFlyoutApi();
  const openAlertDetailsPreview = useCallback(
    (eventId?: string, onClose?: () => void) => {
      openPreviewPanel({
        id: DocumentDetailsPreviewPanelKey,
        params: {
          id: eventId,
          indexName: eventDetailsIndex,
          scopeId,
          banner: ALERT_PREVIEW_BANNER,
          isPreviewMode: true,
        },
      });
      telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
        location: scopeId,
        panel: 'preview',
      });
    },
    [openPreviewPanel, eventDetailsIndex, scopeId, telemetry]
  );

  return isEnabled ? (
    <div data-test-subj={SESSION_VIEW_TEST_ID}>
      {sessionView.getSessionView({
        index,
        sessionEntityId,
        sessionStartTime,
        isFullScreen: true,
        loadAlertDetails: openAlertDetailsPreview,
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
};

SessionView.displayName = 'SessionView';
