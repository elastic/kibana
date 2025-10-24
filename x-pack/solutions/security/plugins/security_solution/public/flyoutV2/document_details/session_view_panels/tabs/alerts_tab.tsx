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
import { useFlyoutApi } from '@kbn/flyout';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import {
  DocumentDetailsMainSessionViewPanelKeyV2,
  DocumentDetailsPreviewPanelKeyV2,
} from '../../shared/constants/panel_keys';
import { ALERT_PREVIEW_BANNER } from '../../preview/constants';
import { useSessionViewPanelContext } from '../context';
import { SourcererScopeName } from '../../../../sourcerer/store/model';
import { useSourcererDataView } from '../../../../sourcerer/containers';
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

  const { selectedPatterns: oldSelectedPatterns } = useSourcererDataView(
    SourcererScopeName.detections
  );
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const experimentalSelectedPatterns = useSelectedPatterns(SourcererScopeName.detections);

  const selectedPatterns = newDataViewPickerEnabled
    ? experimentalSelectedPatterns
    : oldSelectedPatterns;

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

  const { openChildPanel } = useFlyoutApi();
  const { openMainPanel } = useFlyoutApi();

  const openAlertDetailsPreview = useCallback(
    (evtId?: string, onClose?: () => void) => {
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
    },
    [openChildPanel, scopeId, alertsIndex]
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

      openMainPanel({
        id: DocumentDetailsMainSessionViewPanelKeyV2,
        params: {
          id: eventId,
          indexName,
          scopeId,
          jumpToEntityId,
          jumpToCursor,
        },
      });
    },
    [eventId, indexName, openMainPanel, scopeId, sessionEntityId]
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
