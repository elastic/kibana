/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import { useParams } from 'react-router-dom';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';

import { useKibana } from '../../../utils/kibana_react';
import { useFetchAlertDetail } from '../../../hooks/use_fetch_alert_detail';
import { useFetchRule } from '../../../hooks/use_fetch_rule';

import { UnlinkDashboardConfirmationModal } from './related_dashboards/unlink_confirmation_modal';

interface DashboardActionsProps {
  dashboardId: string;
  dashboardTitle: string;
}

interface AlertDetailsPathParams {
  alertId: string;
}

export function DashboardActions({ dashboardId, dashboardTitle }: DashboardActionsProps) {
  const {
    services: {
      share: { url: urlService },
    },
  } = useKibana();

  const { alertId } = useParams<AlertDetailsPathParams>();
  const [isLoading, alertDetail] = useFetchAlertDetail(alertId);
  const ruleId = alertDetail?.formatted.fields[ALERT_RULE_UUID];
  const { rule } = useFetchRule({
    ruleId,
  });

  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const [dashboardToUnlink, setDashboardToUnlink] = useState<string | undefined>(undefined);
  const [isDashboardUnlinking, setIsDashboardUnlinking] = useState(false);

  const handleGoToDashboard = async () => {
    const dashboardLocator = urlService.locators.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);
    if (!dashboardLocator) {
      return undefined;
    }
    dashboardLocator.navigate({ dashboardId });
  };

  const handleUnlinkDashboard = async () => {
    setDashboardToUnlink({ dashboardId, ruleId });
  };

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
  if (isLoading || isDashboardUnlinking)
    return (
      <EuiFlexGroup data-test-subj="centerJustifiedSpinner" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size={'xl'} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );

  return (
    <>
      <EuiPopover
        anchorPosition="downLeft"
        button={btn}
        panelPaddingSize="none"
        isOpen={isActionsPopoverOpen}
      >
        <EuiContextMenuPanel
          items={[
            <EuiContextMenuItem
              key="viewDashboard"
              icon="dashboardApp"
              onClick={handleGoToDashboard}
            >
              {i18n.translate('xpack.observability.dashboardActions.viewDashboard', {
                defaultMessage: 'Go to dashboard',
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
      {dashboardToUnlink ? (
        <UnlinkDashboardConfirmationModal
          rule={rule}
          ruleId={ruleId}
          dashboardId={dashboardId}
          title={dashboardTitle}
          onCancel={() => setDashboardToUnlink(undefined)}
          onDeleted={() => {
            setDashboardToUnlink(undefined);
            setIsDashboardUnlinking(false);
            // location.reload(); TODO how do I reload the page with related dashboards tab selected?
          }}
          onDeleting={() => setIsDashboardUnlinking(true)}
        />
      ) : null}
    </>
  );
}
