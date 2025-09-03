/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiText, EuiToolTip, useEuiFontSize } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { ToolTipButton } from '../styles';

export const TEST_SUBJ_TEXT = 'ips-text';
export const TEST_SUBJ_PLUS_COUNT = 'ips-plus-count';
export const TEST_SUBJ_TOOLTIP_CONTENT = 'ips-tooltip-content';
export const TEST_SUBJ_TOOLTIP_IP = 'ips-tooltip-ip';

export const VISIBLE_IPS_LIMIT = 1;
export const MAX_IPS_IN_TOOLTIP = 10;

const toolTipAriaLabel = i18n.translate('securitySolutionPackages.csp.graph.ips.toolTipAriaLabel', {
  defaultMessage: 'Show IP address details',
});

export interface IpsProps {
  ips: string[];
}

export const Ips = ({ ips }: IpsProps) => {
  const sFontSize = useEuiFontSize('s');
  const xsFontSize = useEuiFontSize('xs');

  if (ips.length === 0) return null;

  const toolTipContent = (
    <ul data-test-subj={TEST_SUBJ_TOOLTIP_CONTENT}>
      {ips.slice(0, MAX_IPS_IN_TOOLTIP).map((ip, index) => (
        <li key={`${index}-${ip}`}>
          <EuiText data-test-subj={TEST_SUBJ_TOOLTIP_IP} size="m">
            {ip}
          </EuiText>
        </li>
      ))}
    </ul>
  );

  const visibleIps = (
    <EuiText
      data-test-subj={TEST_SUBJ_TEXT}
      size="s"
      color="subdued"
      css={css`
        font-weight: medium;
        ${sFontSize};
      `}
    >
      {'IP: '}
      {ips.slice(0, VISIBLE_IPS_LIMIT).join(', ')}
    </EuiText>
  );

  const counter =
    ips.length > VISIBLE_IPS_LIMIT ? (
      <EuiText
        size="xs"
        color="default"
        data-test-subj={TEST_SUBJ_PLUS_COUNT}
        css={css`
          font-weight: medium;
          ${xsFontSize};
        `}
      >
        {`+${ips.length - VISIBLE_IPS_LIMIT}`}
      </EuiText>
    ) : null;

  return (
    <EuiToolTip position="right" content={ips.length > VISIBLE_IPS_LIMIT ? toolTipContent : null}>
      {/* Wrap badge with button to make it focusable and open ToolTip with keyboard */}
      <ToolTipButton aria-label={toolTipAriaLabel}>
        <EuiFlexGroup
          responsive={false}
          gutterSize="xs"
          alignItems="center"
          justifyContent="center"
        >
          {visibleIps}
          {counter}
        </EuiFlexGroup>
      </ToolTipButton>
    </EuiToolTip>
  );
};
