/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DetailPanelAlertTab, useFetchSessionViewAlerts } from '@kbn/session-view-plugin/public';
import type { ProcessEvent } from '@kbn/session-view-plugin/common';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { PageScope } from '../../../../data_view_manager/constants';
import { LeftPanelVisualizeTab } from '../../left';
import { SESSION_VIEW_ID } from '../../left/components/session_view';
import {
  DocumentDetailsLeftPanelKey,
  DocumentDetailsPreviewPanelKey,
} from '../../shared/constants/panel_keys';
import { ALERT_PREVIEW_BANNER } from '../../preview/constants';
import { useSessionViewPanelContext } from '../context';
import { useSelectedPatterns } from '../../../../data_view_manager/hooks/use_selected_patterns';

/**
 * Tab displayed in the SessionView preview panel, shows alerts related to the session.
 */
export const AlertsTab = memo(() => {
  const { eventId, indexName, investigatedAlertId, sessionEntityId, sessionStartTime, scopeId } =
    useSessionViewPanelContext();

  const {
    data: alertsData,
    fetchNextPage: fetchNextPageAlerts,
    isFetching: isFetchingAlerts,
    hasNextPage: hasNextPageAlerts,
  } = useFetchSessionViewAlerts(sessionEntityId, sessionStartTime, investigatedAlertId);

  const selectedPatterns = useSelectedPatterns(PageScope.alerts);

  const alertsIndex = useMemo(() => selectedPatterns.join(','), [selectedPatterns]);

  // this code mimics what is being done in the x-pack/plugins/session_view/public/components/session_view/index.tsx file
  const alerts = useMemo(() => {
    let events: ProcessEvent[] = [];

    if (alertsData) {
      alertsData.pages.forEach((page) => {
        events = events.concat(page.events);
      });
    }

    return events;
  }, [alertsData]);

  const { openPreviewPanel, openLeftPanel } = useExpandableFlyoutApi();
  const openAlertDetailsPreview = useCallback(
    (evtId?: string, onClose?: () => void) => {
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
    },
    [openPreviewPanel, scopeId, alertsIndex]
  );

  // this code mimics what is being done in the x-pack/plugins/session_view/public/components/session_view/index.tsx file
  const jumpToEvent = useCallback(
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
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      aria-label={i18n.translate(
        'xpack.securitySolution.flyout.preview.sessionview.alertsContentAriaLabel',
        { defaultMessage: 'Process' }
      )}
    >
      <DetailPanelAlertTab
        alerts={alerts}
        isFetchingAlerts={isFetchingAlerts}
        hasNextPageAlerts={hasNextPageAlerts}
        fetchNextPageAlerts={fetchNextPageAlerts}
        onJumpToEvent={jumpToEvent}
        onShowAlertDetails={openAlertDetailsPreview}
        investigatedAlertId={investigatedAlertId}
      />
    </EuiPanel>
  );
});

AlertsTab.displayName = 'AlertsTab';
