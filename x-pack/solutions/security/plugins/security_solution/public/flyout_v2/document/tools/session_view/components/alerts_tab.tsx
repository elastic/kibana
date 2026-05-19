/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DetailPanelAlertTab, useFetchSessionViewAlerts } from '@kbn/session-view-plugin/public';
import type { ProcessEvent } from '@kbn/session-view-plugin/common';

export interface AlertsTabProps {
  /**
   * Id of the alert document
   */
  investigatedAlertId: string;
  /**
   * Id of the session entity being displayed in SessionView, used to fetch related alerts
   */
  sessionEntityId: string;
  /**
   * Start time of the session being displayed in SessionView, used to fetch related alerts
   */
  sessionStartTime: string;
  /**
   * Callback function to jump to a specific event in SessionView
   */
  onJumpToEvent: (event: ProcessEvent) => void;
  /**
   * Callback function to show the alert details flyout
   */
  onShowAlertDetails: (alertId: string, alertIndex: string) => void;
}

/**
 * Tab displayed in the SessionView preview panel, shows alerts related to the session.
 */
export const AlertsTab = memo(
  ({
    investigatedAlertId,
    sessionEntityId,
    sessionStartTime,
    onJumpToEvent,
    onShowAlertDetails,
  }: AlertsTabProps) => {
    const {
      data: alertsData,
      fetchNextPage: fetchNextPageAlerts,
      isFetching: isFetchingAlerts,
      hasNextPage: hasNextPageAlerts,
    } = useFetchSessionViewAlerts(sessionEntityId, sessionStartTime, investigatedAlertId);

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
          onJumpToEvent={onJumpToEvent}
          onShowAlertDetails={onShowAlertDetails}
          investigatedAlertId={investigatedAlertId}
        />
      </EuiPanel>
    );
  }
);

AlertsTab.displayName = 'AlertsTab';
