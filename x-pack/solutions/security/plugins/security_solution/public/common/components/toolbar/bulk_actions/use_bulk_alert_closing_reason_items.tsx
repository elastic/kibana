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
import type { AlertClosingReason } from '../../../../../common/constants';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';

const ALERT_CLOSING_REASON_PANEL_ID = 'ALERT_CLOSING_REASON_PANEL_ID';

interface OnSubmitCloseReasonParams extends RenderContentPanelProps {
  reason?: AlertClosingReason;
}

interface UseBulkAlertClosingReasonItemsProps {
  onSubmitCloseReason: (params: OnSubmitCloseReasonParams) => void;
}

export const useBulkAlertClosingReasonItems = ({
  onSubmitCloseReason,
}: UseBulkAlertClosingReasonItemsProps) => {
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

  const renderContent = useCallback(
    (renderProps: RenderContentPanelProps) => {
      const handleSubmit = (reason: AlertClosingReason) => {
        onSubmitCloseReason({
          ...renderProps,
          reason,
        });
      };

      return <BulkAlertClosingReason onSubmit={handleSubmit} />;
    },
    [onSubmitCloseReason]
  );

  const panels = useMemo(
    () =>
      hasIndexWrite
        ? ([
            {
              id: ALERT_CLOSING_REASON_PANEL_ID,
              title: i18n.ALERT_CLOSING_REASON_MENU_TITLE,
              renderContent,
            },
          ] as ContentPanelConfig[])
        : [],
    [hasIndexWrite, renderContent]
  );

  return useMemo(
    () => ({
      item,
      panels,
    }),
    [item, panels]
  );
};
