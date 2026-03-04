/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiButtonIcon } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ChromeHeaderAppActionsConfig } from '@kbn/core-chrome-browser';

const noop = () => {};

const AlertsManageRulesButton: React.FC = () => {
  const primaryActionButtonCss = css`
    background-color: transparent !important;
    height: 28px !important;
    margin-left: 4px;
  `;
  return (
    <EuiButton
      css={primaryActionButtonCss}
      size="s"
      color="text"
      fill={false}
      minWidth={false}
      iconType="gear"
      onClick={noop}
      data-test-subj="headerGlobalNav-appActionsManageRulesButton"
      aria-label={i18n.translate(
        'xpack.securitySolution.alerts.headerAppActions.manageRulesAriaLabel',
        { defaultMessage: 'Manage rules' }
      )}
    >
      {i18n.translate('xpack.securitySolution.alerts.headerAppActions.manageRulesButton', {
        defaultMessage: 'Manage rules',
      })}
    </EuiButton>
  );
};

/**
 * Header app actions config for the Security > Alerts app.
 * Single primary action "Manage rules"; no overflow menu.
 * Set when the Alerts page is active; cleared when navigating away (handled by GlobalHeader).
 */
export function getAlertsHeaderAppActionsConfig(): ChromeHeaderAppActionsConfig {
  return {
    primaryActions: [<AlertsManageRulesButton key="alerts-manage-rules" />],
  };
}

/**
 * Header app actions config for the Security > Dashboards landing page.
 * Single icon-only "New" (plusInCircle) secondary action that navigates to create dashboard.
 * Set when the Security Dashboards landing page is active; cleared when navigating away (handled by GlobalHeader).
 */
export function getSecurityDashboardsHeaderAppActionsConfig(
  onCreateDashboard: () => void
): ChromeHeaderAppActionsConfig {
  return {
    secondaryActions: [
      <EuiButtonIcon
        key="security-dashboards-new"
        size="xs"
        color="text"
        iconType="plusInCircle"
        onClick={onCreateDashboard}
        data-test-subj="headerGlobalNav-appActionsNewButton"
        aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.newAriaLabel', {
          defaultMessage: 'New',
        })}
      />,
    ],
  };
}

/**
 * Header app actions config for the Security > Cases page.
 * Single icon-only "New" (plusInCircle) secondary action that opens the create case flyout.
 * Set when the Cases page is active (from Cases page); cleared on unmount.
 */
export function getSecurityCasesHeaderAppActionsConfig(
  onCreateCase: () => void
): ChromeHeaderAppActionsConfig {
  return {
    secondaryActions: [
      <EuiButtonIcon
        key="security-cases-new"
        size="xs"
        color="text"
        iconType="plusInCircle"
        onClick={onCreateCase}
        data-test-subj="headerGlobalNav-appActionsNewButton"
        aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.newAriaLabel', {
          defaultMessage: 'New',
        })}
      />,
    ],
  };
}

export interface TimelinesHeaderAppActionsParams {
  onImport: () => void;
  onNew: () => void;
  showImport?: boolean;
}

/**
 * Header app actions config for the Security > Timelines page.
 * Icon-only "Import" and "New" secondary actions. Set when the Timelines page is active (from TimelinesPage); cleared on unmount.
 */
export function getTimelinesHeaderAppActionsConfig({
  onImport,
  onNew,
  showImport = true,
}: TimelinesHeaderAppActionsParams): ChromeHeaderAppActionsConfig {
  const secondaryActions: React.ReactNode[] = [];
  if (showImport) {
    secondaryActions.push(
      <EuiButtonIcon
        key="timelines-import"
        size="xs"
        color="text"
        iconType="download"
        onClick={onImport}
        data-test-subj="headerGlobalNav-appActionsImportButton"
        aria-label={i18n.translate('xpack.securitySolution.timelines.headerAppActions.importAriaLabel', {
          defaultMessage: 'Import',
        })}
      />
    );
  }
  secondaryActions.push(
    <EuiButtonIcon
      key="timelines-new"
      size="xs"
      color="text"
      iconType="plusInCircle"
      onClick={onNew}
      data-test-subj="headerGlobalNav-appActionsNewButton"
      aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.newAriaLabel', {
        defaultMessage: 'New',
      })}
    />
  );
  return { secondaryActions };
}
