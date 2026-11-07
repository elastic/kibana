/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type {
  AgentIdentityReference,
  AgentInventoryItem,
  AgentInvocation,
  AgentToolCall,
} from './types';
import { AgentOutcome, AgentTimestamp } from './agent_evidence';

const PREFIX = 'xpack.securitySolution.entityAnalytics.intelligence.agents';

const identityLabel = (identity: AgentIdentityReference | undefined): string =>
  identity?.name ??
  identity?.id ??
  (identity?.hash
    ? i18n.translate(`${PREFIX}.pseudonymousIdentity`, {
        defaultMessage: 'Pseudonymous identity: {hash}',
        values: { hash: identity.hash },
      })
    : i18n.translate(`${PREFIX}.identityNotRecorded`, { defaultMessage: 'Not recorded' }));

export const AgentExecutionPath: React.FC<{
  agent: AgentInventoryItem;
  invocation: AgentInvocation;
  toolCalls: AgentToolCall[];
}> = ({ agent, invocation, toolCalls }) => {
  const { euiTheme } = useEuiTheme();
  const cardStyle = css`
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
    padding: ${euiTheme.size.m};
    height: 100%;
    min-width: 0;
    overflow-wrap: anywhere;
    background: ${euiTheme.colors.backgroundBasePlain};
  `;

  return (
    <div
      data-test-subj="agentExecutionPath"
      css={css`
        padding: ${euiTheme.size.m};
        background: ${euiTheme.colors.backgroundBaseSubdued};
        border-radius: ${euiTheme.border.radius.medium};
      `}
    >
      <EuiDescriptionList
        type="column"
        listItems={[
          {
            title: i18n.translate(`${PREFIX}.initiatingActor`, {
              defaultMessage: 'Initiating actor',
            }),
            description: identityLabel(invocation.attribution?.initiatingActor),
          },
          {
            title: i18n.translate(`${PREFIX}.kibanaCaller`, {
              defaultMessage: 'Authenticated Kibana caller',
            }),
            description: identityLabel(invocation.attribution?.caller),
          },
          {
            title: i18n.translate(`${PREFIX}.apiKeyReference`, {
              defaultMessage: 'Caller API key reference',
            }),
            description:
              invocation.attribution?.caller?.apiKeyId ??
              (invocation.attribution?.caller?.apiKeyHash
                ? i18n.translate(`${PREFIX}.pseudonymousIdentity`, {
                    defaultMessage: 'Pseudonymous identity: {hash}',
                    values: { hash: invocation.attribution.caller.apiKeyHash },
                  })
                : i18n.translate(`${PREFIX}.identityNotRecorded`, {
                    defaultMessage: 'Not recorded',
                  })),
          },
        ]}
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem>
          <div css={cardStyle}>
            <EuiText size="xs" color="subdued">
              <strong>
                {i18n.translate(`${PREFIX}.pathAgent`, { defaultMessage: 'Agent invocation' })}
              </strong>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <strong>{agent.name}</strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiText size="xs">
              <AgentTimestamp value={invocation.timestamp} />
            </EuiText>
            <EuiSpacer size="s" />
            <AgentOutcome outcome={invocation.outcome} />
          </div>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={css`
            justify-content: center;
          `}
        >
          <EuiIcon type="chevronSingleRight" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem>
          <div css={cardStyle}>
            <EuiText size="xs" color="subdued">
              <strong>
                {i18n.translate(`${PREFIX}.pathTools`, {
                  defaultMessage: 'Observed tool execution',
                })}
              </strong>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <strong>
                {i18n.translate(`${PREFIX}.pathToolCount`, {
                  defaultMessage:
                    '{count, number} attributed tool {count, plural, one {call} other {calls}}',
                  values: { count: toolCalls.length },
                })}
              </strong>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiBadge color="hollow">
              {i18n.translate(`${PREFIX}.observedEdge`, {
                defaultMessage: 'Linked by trace ancestry',
              })}
            </EuiBadge>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate(`${PREFIX}.pathCredentialGap`, {
            defaultMessage:
              'Downstream credentials, delegated scopes, and resource access are not established by these execution records.',
          })}
        </p>
      </EuiText>
    </div>
  );
};
