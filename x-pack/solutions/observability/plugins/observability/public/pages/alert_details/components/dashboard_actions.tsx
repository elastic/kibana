/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiPopover, EuiContextMenuItem, EuiContextMenuPanel } from '@elastic/eui';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { DashboardLocatorParams } from '@kbn/dashboard-plugin/public';
import { useKibana } from '../../../utils/kibana_react';

interface DashboardActionsProps {
  dashboardId: string;
}

export function DashboardActions({ dashboardId }: DashboardActionsProps) {
  const {
    services: {
      share: { url: urlService },
    },
  } = useKibana();

  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);

  const handleGoToDashboard = async () => {
    const dashboardLocator = urlService.locators.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);
    if (!dashboardLocator) {
      return undefined;
    }
    dashboardLocator.navigate({ dashboardId });
  };

  const handleUnlinkDashboard = () => {};

  const handleDuplicateDashboard = () => {};

  const btn = (
    <EuiButtonIcon
      data-test-subj="o11ySloListItemButton"
      aria-label={i18n.translate('xpack.observability.item.actions.button', {
        defaultMessage: 'Actions',
      })}
      color="text"
      display="empty"
      iconType="boxesHorizontal"
      size="s"
      onClick={() => setIsActionsPopoverOpen(!isActionsPopoverOpen)}
    />
  );

  return (
    <EuiPopover
      anchorPosition="downLeft"
      button={btn}
      panelPaddingSize="none"
      isOpen={isActionsPopoverOpen}
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem key="viewDashboard" icon="dashboardApp" onClick={handleGoToDashboard}>
            {i18n.translate('xpack.observability.dashboardActions.viewDashboard', {
              defaultMessage: 'Go to dashboard',
            })}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="duplicateDashboard"
            icon="copy"
            onClick={handleDuplicateDashboard}
          >
            {i18n.translate('xpack.observability.dashboardActions.duplicateDashboard', {
              defaultMessage: 'Duplicate dashboard',
            })}
          </EuiContextMenuItem>,
          <EuiContextMenuItem key="unlinkDashboard" icon="unlink" onClick={handleUnlinkDashboard}>
            {i18n.translate('xpack.observability.dashboardActions.unlinkDashboard', {
              defaultMessage: 'Remove from linked dashboards',
            })}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
}
