/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiButtonIconProps,
  EuiPopover,
  EuiContextMenuItem,
  EuiContextMenuPanel,
} from '@elastic/eui';

interface DashboardActionsProps {
  dashboardId: string;
  buttonProps?: Partial<EuiButtonIconProps>;
}

export function DashboardActions({ dashboardId, btnProps }: DashboardActionsProps) {
  const btn = (
    <EuiButtonIcon
      data-test-subj="o11ySloListItemButton"
      aria-label={i18n.translate('xpack.slo.item.actions.button', {
        defaultMessage: 'Actions',
      })}
      color="text"
      display="empty"
      iconType="boxesVertical"
      size="s"
      onClick={() => {}}
      {...btnProps}
    />
  );

  return (
    <EuiPopover
      anchorPosition="downRight"
      button={btn}
      panelPaddingSize="none"
      panelClassName="euiContextMenuPanel--fixed"
      repositionOnScroll
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key="viewDashboard"
            icon="dashboardApp"
            onClick={() => {
              window.location.href = `#/dashboards/view/${dashboardId}`;
            }}
          >
            {i18n.translate('xpack.observability.dashboardActions.viewDashboard', {
              defaultMessage: 'View dashboard',
            })}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="editDashboard"
            icon="pencil"
            onClick={() => {
              window.location.href = `#/dashboards/edit/${dashboardId}`;
            }}
          >
            {i18n.translate('xpack.observability.dashboardActions.editDashboard', {
              defaultMessage: 'Edit dashboard',
            })}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
}
