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
import {
  GRAPH_IPS_TEXT_ID,
  GRAPH_IPS_PLUS_COUNT_ID,
  GRAPH_IPS_TOOLTIP_CONTENT_ID,
  GRAPH_IPS_TOOLTIP_IP_ID,
} from '../../test_ids';

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
    <ul data-test-subj={GRAPH_IPS_TOOLTIP_CONTENT_ID}>
      {ips.slice(0, MAX_IPS_IN_TOOLTIP).map((ip, index) => (
        <li key={`${index}-${ip}`}>
          <EuiText data-test-subj={GRAPH_IPS_TOOLTIP_IP_ID} size="m">
            {ip}
          </EuiText>
        </li>
      ))}
    </ul>
  );

  const visibleIps = (
    <EuiText
      data-test-subj={GRAPH_IPS_TEXT_ID}
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
        data-test-subj={GRAPH_IPS_PLUS_COUNT_ID}
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
