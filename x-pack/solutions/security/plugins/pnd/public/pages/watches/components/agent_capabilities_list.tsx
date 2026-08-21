/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSwitch,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { WatchCallableRef } from '@kbn/pnd-common';
import * as i18n from '../translations';

interface AgentCapabilitiesListProps {
  callables: WatchCallableRef[];
  onToggle?: (callableId: string) => void;
  /**
   * Builds the Workflows Management deep-link href for a `kind: 'workflow'` callable
   * (`callable.id` is itself the workflow id). Omit to render the name as plain text —
   * used in tests/storybooks that don't have `core.application` available.
   */
  getWorkflowHref?: (workflowId: string) => string;
}

export const AgentCapabilitiesList: React.FC<AgentCapabilitiesListProps> = ({
  callables,
  onToggle,
  getWorkflowHref,
}) => {
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
      {callables.map((callable) => {
        const workflowHref =
          callable.kind === 'workflow' ? getWorkflowHref?.(callable.id) : undefined;
        return (
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
                  {workflowHref ? (
                    <EuiLink
                      href={workflowHref}
                      target="_blank"
                      data-test-subj={`pndCallableWorkflowLink-${callable.id}`}
                    >
                      <strong>{callable.name}</strong>
                    </EuiLink>
                  ) : (
                    <strong>{callable.name}</strong>
                  )}
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
                    <EuiSwitch
                      label={i18n.capabilityToggleAriaLabel(callable.name)}
                      checked={callable.enabled}
                      onChange={() => onToggle?.(callable.id)}
                      compressed
                      showLabel={false}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              responsive={false}
              css={css`
                margin-top: ${euiTheme.size.s};
                flex-wrap: wrap;
              `}
            >
              <EuiFlexItem grow={false}>
                <EuiBadge color={callable.kind === 'workflow' ? 'accent' : 'primary'}>
                  {callable.kind === 'workflow' ? i18n.KIND_WORKFLOW : i18n.KIND_SKILL}
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" iconType="bolt">
                  {callable.summary}
                </EuiBadge>
              </EuiFlexItem>
              {callable.gated ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="warning">{i18n.GATED_BADGE}</EuiBadge>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiPanel>
        );
      })}
    </div>
  );
};
