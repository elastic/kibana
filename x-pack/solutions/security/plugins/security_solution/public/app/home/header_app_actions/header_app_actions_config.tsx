/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ChromeHeaderAppActionsConfig } from '@kbn/core-chrome-browser';

const primaryButtonCss = css`
  block-size: 28px;
  margin-left: 4px;
`;

const noop = () => {};

/**
 * Header app actions config for the Security > Alerts app.
 * Single primary action "Manage rules"; no overflow menu.
 * Set when the Alerts page is active; cleared when navigating away (handled by GlobalHeader).
 */
export function getAlertsHeaderAppActionsConfig(): ChromeHeaderAppActionsConfig {
  return {
    primaryActions: [
      <EuiButton
        key="alerts-manage-rules"
        css={primaryButtonCss}
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
      </EuiButton>,
    ],
  };
}
