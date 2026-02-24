/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiSplitButton } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ChromeHeaderAppActionsConfig } from '@kbn/core-chrome-browser';

const noop = () => {};

/**
 * Run split button: left = Run + play icon; right = noop (no popover).
 */
const AttackDiscoveryRunSplitButton: React.FC = () => {
  const primaryActionButtonCss = css`
    background-color: transparent !important;
    height: 28px !important;
    margin-left: 4px;
  `;
  const primaryActionButtonSecondaryCss = css`
    background-color: transparent !important;
    height: 28px !important;
    margin-left: 0;
  `;
  return (
    <EuiSplitButton
      css={primaryActionButtonCss}
      size="s"
      color="text"
      fill={false}
      data-test-subj="headerGlobalNav-appActionsRunSplitButton"
      aria-label={i18n.translate(
        'xpack.securitySolution.attackDiscovery.headerAppActions.runAriaLabel',
        { defaultMessage: 'Run' }
      )}
    >
      <EuiSplitButton.ActionPrimary
        css={primaryActionButtonCss}
        iconType="play"
        data-test-subj="headerGlobalNav-appActionsRunButton"
        minWidth={false}
      >
        {i18n.translate('xpack.securitySolution.attackDiscovery.headerAppActions.runButton', {
          defaultMessage: 'Run',
        })}
      </EuiSplitButton.ActionPrimary>
      <EuiSplitButton.ActionSecondary
        css={primaryActionButtonSecondaryCss}
        iconType="indexSettings"
        onClick={noop}
        aria-label={i18n.translate(
          'xpack.securitySolution.attackDiscovery.headerAppActions.runOptionsAriaLabel',
          { defaultMessage: 'Run options' }
        )}
        data-test-subj="headerGlobalNav-appActionsRunDropdown"
      />
    </EuiSplitButton>
  );
};

/**
 * Header app actions config for the Security > Attack Discovery app.
 * Two primary actions: Run (split button, right side noop) and Schedule (success button).
 * No overflow menu. Set when the Attack Discovery page is active; cleared when navigating away.
 */
export function getAttackDiscoveryHeaderAppActionsConfig(): ChromeHeaderAppActionsConfig {
  return {
    primaryActions: [
      <AttackDiscoveryScheduleButton key="schedule" />,
      <AttackDiscoveryRunSplitButton key="run" />,
    ],
  };
}

const AttackDiscoveryScheduleButton: React.FC = () => {
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
      minWidth={false}
      iconType="calendar"
      onClick={noop}
      data-test-subj="headerGlobalNav-appActionsScheduleButton"
      aria-label={i18n.translate(
        'xpack.securitySolution.attackDiscovery.headerAppActions.scheduleAriaLabel',
        { defaultMessage: 'Schedule' }
      )}
    >
      {i18n.translate('xpack.securitySolution.attackDiscovery.headerAppActions.scheduleButton', {
        defaultMessage: 'Schedule',
      })}
    </EuiButton>
  );
};
