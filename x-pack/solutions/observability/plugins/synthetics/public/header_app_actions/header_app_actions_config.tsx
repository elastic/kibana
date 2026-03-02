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

const ALERTS_PANEL_ID = 1;
const MONITOR_STATUS_RULE_PANEL_ID = 2;
const TLS_CERTIFICATE_RULE_PANEL_ID = 3;

const primaryActionButtonCss = css`
  background-color: transparent !important;
  height: 28px !important;
`;

/**
 * POC: Header app actions for Synthetics.
 * - Secondary: New (icon-only) (dumb).
 * - Primary: Refresh, Auto refresh (Off) (all dumb).
 * - Overflow (•••): Inspect, Explore data, Alerts, Settings (all dumb).
 * Set when app mounts; platform clears on app change.
 */
export function getSyntheticsHeaderAppActionsConfig(): ChromeHeaderAppActionsConfig {
  return {
    secondaryActions: [
      <EuiButtonIcon
        key="new"
        size="xs"
        color="text"
        iconType="plusInCircle"
        onClick={noop}
        data-test-subj="headerGlobalNav-appActionsNewButton"
        aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.newAriaLabel', {
          defaultMessage: 'New',
        })}
      />,
      <EuiButtonIcon
        key="refresh"
        size="xs"
        color="text"
        iconType="refresh"
        onClick={noop}
        aria-label={i18n.translate('xpack.synthetics.headerAppActions.refreshAriaLabel', {
          defaultMessage: 'Refresh',
        })}
        data-test-subj="headerGlobalNav-appActionsRefreshButton"
      />,

    ],
    primaryActions: [
      <EuiButton
        key="autoRefresh"
        css={primaryActionButtonCss}
        size="s"
        color="text"
        fill={false}
        minWidth={false}
        iconType="refreshTime"
        onClick={noop}
        data-test-subj="headerGlobalNav-appActionsAutoRefreshButton"
        aria-label={i18n.translate('xpack.synthetics.headerAppActions.autoRefreshAriaLabel', {
          defaultMessage: 'Auto refresh',
        })}
      >
        Off
      </EuiButton>,
    ],
    overflowPanels: [
      {
        id: 0,
        title: '',
        items: [
          {
            name: i18n.translate('xpack.synthetics.page_header.inspectLink', {
              defaultMessage: 'Inspect',
            }),
            icon: 'inspect',
            onClick: noop,
          },
          {
            name: i18n.translate('xpack.synthetics.analyzeDataButtonLabel', {
              defaultMessage: 'Explore data',
            }),
            icon: 'stats',
            onClick: noop,
          },
          {
            name: i18n.translate('xpack.synthetics.page_header.alertsLink', {
              defaultMessage: 'Alerts',
            }),
            icon: 'bell',
            onClick: noop,
            panel: ALERTS_PANEL_ID,
          },
          { isSeparator: true as const, key: 'sepSettings' },
          {
            name: i18n.translate('xpack.synthetics.page_header.settingsLink', {
              defaultMessage: 'Settings',
            }),
            icon: 'gear',
            onClick: noop,
          },
          { isSeparator: true as const, key: 'sepFeedback' },
          {
            name: i18n.translate('xpack.synthetics.headerAppActions.overflow.giveFeedback', {
              defaultMessage: 'Give feedback',
            }),
            icon: 'comment',
            onClick: noop,
          },
        ],
      },
      {
        id: ALERTS_PANEL_ID,
        title: i18n.translate('xpack.synthetics.page_header.alertsLink', {
          defaultMessage: 'Alerts',
        }),
        items: [
          {
            name: i18n.translate('xpack.synthetics.headerAppActions.overflow.monitorStatusRule', {
              defaultMessage: 'Monitor status rule',
            }),
            icon: 'bell',
            onClick: noop,
            panel: MONITOR_STATUS_RULE_PANEL_ID,
          },
          {
            name: i18n.translate('xpack.synthetics.headerAppActions.overflow.tlsCertificateRule', {
              defaultMessage: 'TLS certificate rule',
            }),
            icon: 'lock',
            onClick: noop,
            panel: TLS_CERTIFICATE_RULE_PANEL_ID,
          },
          {
            name: i18n.translate('xpack.synthetics.headerAppActions.overflow.manageRules', {
              defaultMessage: 'Manage rules',
            }),
            icon: 'tableOfContents',
            onClick: noop,
          },
        ],
      },
      {
        id: MONITOR_STATUS_RULE_PANEL_ID,
        title: i18n.translate('xpack.synthetics.headerAppActions.overflow.monitorStatusRule', {
          defaultMessage: 'Monitor status rule',
        }),
        items: [
          {
            name: i18n.translate('xpack.synthetics.headerAppActions.overflow.createStatusRule', {
              defaultMessage: 'Create status rule',
            }),
            icon: 'plusInCircle',
            onClick: noop,
          },
          {
            name: i18n.translate(
              'xpack.synthetics.headerAppActions.overflow.editDefaultStatusRule',
              {
                defaultMessage: 'Edit default status rule',
              }
            ),
            icon: 'bell',
            onClick: noop,
          },
        ],
      },
      {
        id: TLS_CERTIFICATE_RULE_PANEL_ID,
        title: i18n.translate('xpack.synthetics.headerAppActions.overflow.tlsCertificateRule', {
          defaultMessage: 'TLS certificate rule',
        }),
        items: [
          {
            name: i18n.translate('xpack.synthetics.headerAppActions.overflow.createTlsRule', {
              defaultMessage: 'Create TLS rule',
            }),
            icon: 'plusInCircle',
            onClick: noop,
          },
          {
            name: i18n.translate('xpack.synthetics.headerAppActions.overflow.editDefaultTlsRule', {
              defaultMessage: 'Edit default TLS rule',
            }),
            icon: 'bell',
            onClick: noop,
          },
        ],
      },
    ],
  };
}
