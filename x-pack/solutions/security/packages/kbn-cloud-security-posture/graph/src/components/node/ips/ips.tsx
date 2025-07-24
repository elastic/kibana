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

export interface IpsProps {
  ips?: string[];
}

type IpWithCount = [string, number]; // [IP address, count]

const VISIBLE_IPS_LIMIT = 1;

const toolTipTitle = i18n.translate('securitySolutionPackages.csp.graph.ips.toolTipTitle', {
  defaultMessage: 'IP Addresses',
});

/**
 * Groups IP addresses and counts occurrences
 * @param ips Array of IP addresses that may contain duplicates
 * @returns Array of [ip, count] tuples
 */
const groupAndCountIps = (ips: string[]): IpWithCount[] => {
  const ipCounts = new Map<string, number>();

  for (const ip of ips) {
    const currentCount = ipCounts.get(ip) || 0;
    ipCounts.set(ip, currentCount + 1);
  }

  return Array.from(ipCounts.entries());
};

export const Ips = ({ ips }: IpsProps) => {
  const sFontSize = useEuiFontSize('s');
  const xsFontSize = useEuiFontSize('xs');

  if (!ips || ips.length === 0) return null;

  const groupedIps = groupAndCountIps(ips);
  const totalUniqueIps = groupedIps.length;

  return (
    <EuiToolTip
      data-test-subj="ips-tooltip"
      position="right"
      title={toolTipTitle}
      content={
        totalUniqueIps > VISIBLE_IPS_LIMIT ? (
          <ul data-test-subj="ips-plus-tooltip-content">
            {groupedIps.map(([ip, count]) => (
              <li key={ip}>
                <EuiText data-test-subj="ips-tooltip-ip" size="m">
                  {count > 1 ? `${count}x: ` : null}
                  {ip}
                </EuiText>
              </li>
            ))}
          </ul>
        ) : null
      }
    >
      <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center" justifyContent="center">
        <EuiText
          data-test-subj="ips-text"
          size="s"
          color="subdued"
          css={css`
            font-weight: medium;
            ${sFontSize};
          `}
        >
          {'IP: '}
          {groupedIps
            .slice(0, VISIBLE_IPS_LIMIT)
            .map(([ip]) => ip)
            .join(', ')}
        </EuiText>
        {totalUniqueIps > VISIBLE_IPS_LIMIT ? (
          <EuiText
            size="xs"
            color="default"
            data-test-subj="ips-plus-count"
            css={css`
              font-weight: medium;
              ${xsFontSize};
            `}
          >
            {`+${totalUniqueIps - VISIBLE_IPS_LIMIT}`}
          </EuiText>
        ) : null}
      </EuiFlexGroup>
    </EuiToolTip>
  );
};