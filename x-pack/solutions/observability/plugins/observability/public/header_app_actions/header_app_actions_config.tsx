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

const primaryActionButtonCss = css`
  background-color: transparent !important;
  height: 28px !important;
  margin-left: 4px;
`;

const ObservabilityAlertsManageRulesButton: React.FC<{ href: string }> = ({ href }) => (
  <EuiButton
    css={primaryActionButtonCss}
    size="s"
    color="text"
    fill={false}
    minWidth={false}
    iconType="gear"
    href={href}
    data-test-subj="headerGlobalNav-appActionsManageRulesButton"
    aria-label={i18n.translate('xpack.observability.alerts.headerAppActions.manageRulesAriaLabel', {
      defaultMessage: 'Manage rules',
    })}
  >
    {i18n.translate('xpack.observability.alerts.headerAppActions.manageRulesButton', {
      defaultMessage: 'Manage rules',
    })}
  </EuiButton>
);

/**
 * Header app actions config for Observability > Alerts.
 * Primary action "Manage rules"; secondary overflow (•••) with Manage rules, Docs, and Feedback.
 * Set when the Alerts page is active; cleared when navigating away (handled by platform on app change).
 * POC: overflow items are dumb (noop).
 */
export const getObservabilityAlertsHeaderAppActionsConfig = (
  manageRulesHref: string
): ChromeHeaderAppActionsConfig => ({
  overflowPanels: [
    {
      id: 0,
      title: '',
      items: [
        {
          name: i18n.translate('xpack.observability.alerts.headerAppActions.overflowManageRules', {
            defaultMessage: 'Manage rules',
          }),
          icon: 'gear',
          onClick: noop,
        },
        {
          name: i18n.translate('xpack.observability.alerts.headerAppActions.overflowDocs', {
            defaultMessage: 'Docs',
          }),
          icon: 'documentation',
          onClick: noop,
        },
        {
          name: i18n.translate('xpack.observability.alerts.headerAppActions.overflowFeedback', {
            defaultMessage: 'Feedback',
          }),
          icon: 'editorComment',
          onClick: noop,
        },
      ],
    },
  ],
  // primaryActions: [
  //   <ObservabilityAlertsManageRulesButton
  //     key="observability-alerts-manage-rules"
  //     href={manageRulesHref}
  //   />,
  // ],
});

/**
 * Header app actions config for Observability > Cases.
 * Single icon-only "New" (plusInCircle) secondary action (dumb button, no-op).
 * Set when the Cases page is active; cleared when navigating away (handled by platform on app change).
 */
export const getObservabilityCasesHeaderAppActionsConfig = (): ChromeHeaderAppActionsConfig => ({
  secondaryActions: [
    <EuiButtonIcon
      key="observability-cases-new"
      size="xs"
      color="text"
      iconType="plusInCircle"
      onClick={noop}
      data-test-subj="headerGlobalNav-appActionsNewButton"
      aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.newAriaLabel', {
        defaultMessage: 'New',
      })}
    />,
  ],
});
