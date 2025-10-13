/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type {
  BulkActionsConfig,
  ContentPanelConfig,
  RenderContentPanelProps,
} from '@kbn/response-ops-alerts-table/types';
import { BulkAlertClosingReason } from './alert_bulk_closing_reason';
import * as i18n from './translations';
import type { AlertClosingReason } from '../../../../../common/types';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';

export const ALERT_CLOSING_REASON_PANEL_ID = 'ALERT_CLOSING_REASON_PANEL_ID';

interface OnSubmitCloseReasonParams extends RenderContentPanelProps {
  /**
   * The reason the alert(s) are being closed
   */
  reason?: AlertClosingReason;
}

export interface UseBulkAlertClosingReasonItemsProps {
  /**
   * Called once the user confirms the closing reason
   */
  onSubmitCloseReason?: (params: OnSubmitCloseReasonParams) => void;
}

/**
 * Returns items and panels to be used in a EuiContextMenu component
 */
export const useBulkAlertClosingReasonItems = ({
  onSubmitCloseReason,
}: UseBulkAlertClosingReasonItemsProps = {}) => {
  const { hasIndexWrite } = useAlertsPrivileges();
  const item = useMemo(
    () =>
      hasIndexWrite
        ? ({
            key: 'close-alert-with-reason',
            'data-test-subj': 'alert-close-context-menu-item',
            label: i18n.BULK_ACTION_CLOSE_SELECTED,
            panel: ALERT_CLOSING_REASON_PANEL_ID,
          } as BulkActionsConfig)
        : undefined,
    [hasIndexWrite]
  );

  const getRenderContent = useCallback(
    ({
      onSubmitCloseReason: onSubmitCloseReasonCb,
    }: {
      onSubmitCloseReason?: UseBulkAlertClosingReasonItemsProps['onSubmitCloseReason'];
    }) => {
      function renderContent(renderProps: RenderContentPanelProps) {
        const handleSubmit = (reason: AlertClosingReason) => {
          onSubmitCloseReasonCb?.({
            ...renderProps,
            reason,
          });
        };

        return <BulkAlertClosingReason onSubmit={handleSubmit} />;
      }

      return renderContent;
    },
    []
  );

  const panels = useMemo(
    () =>
      hasIndexWrite
        ? ([
            {
              id: ALERT_CLOSING_REASON_PANEL_ID,
              title: i18n.ALERT_CLOSING_REASON_MENU_TITLE,
              renderContent: getRenderContent({ onSubmitCloseReason }),
            },
          ] as ContentPanelConfig[])
        : [],
    [hasIndexWrite, getRenderContent, onSubmitCloseReason]
  );

  /**
   * function to use instead of `panels` in case we need to
   * pass the `onSubmitCloseReason` at run time
   */
  const getPanels = useCallback(
    ({
      onSubmitCloseReason: onSubmitCloseReasonCb,
    }: {
      onSubmitCloseReason?: UseBulkAlertClosingReasonItemsProps['onSubmitCloseReason'];
    }) =>
      hasIndexWrite
        ? ([
            {
              id: ALERT_CLOSING_REASON_PANEL_ID,
              title: i18n.ALERT_CLOSING_REASON_MENU_TITLE,
              renderContent: getRenderContent({ onSubmitCloseReason: onSubmitCloseReasonCb }),
            },
          ] as ContentPanelConfig[])
        : [],
    [getRenderContent, hasIndexWrite]
  );

  return useMemo(
    () => ({
      item,
      panels,
      getPanels,
    }),
    [item, panels, getPanels]
  );
};
