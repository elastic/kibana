/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import type { WatchCallableRef } from '@kbn/pnd-common';
import * as i18n from '../translations';

interface AgentCapabilitiesListProps {
  callables: WatchCallableRef[];
}

export const AgentCapabilitiesList: React.FC<AgentCapabilitiesListProps> = ({ callables }) => {
  const { euiTheme } = useEuiTheme();

  if (callables.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        —
      </EuiText>
    );
  }

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.s};
      `}
    >
      {callables.map((callable) => (
        <EuiPanel
          key={callable.id}
          hasBorder
          paddingSize="m"
          css={css`
            opacity: ${callable.enabled ? 1 : 0.55};
          `}
        >
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{callable.name}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {callable.lastRun
                      ? `${i18n.LAST_RUN_PREFIX} ${callable.lastRun}`
                      : i18n.NEVER_RUN_CAPABILITY}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={callable.enabled ? 'success' : 'default'}>
                    {callable.enabled
                      ? i18n.CAPABILITY_ENABLED_BADGE
                      : i18n.CAPABILITY_DISABLED_BADGE}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>

          {callable.summary || callable.gated ? (
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              responsive={false}
              css={css`
                margin-top: ${euiTheme.size.s};
                flex-wrap: wrap;
              `}
            >
              {callable.summary ? (
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {callable.summary}
                  </EuiText>
                </EuiFlexItem>
              ) : null}
              {callable.gated ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="warning">{i18n.GATED_BADGE}</EuiBadge>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          ) : null}
        </EuiPanel>
      ))}
    </div>
  );
};
