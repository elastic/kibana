/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { RelatedEntity } from '../../../../../entity_analytics/components/ai_security/types';
import { getAgentDisplayName } from '../../../../../entity_analytics/components/ai_security/utils';
import { RiskLevelBadge } from '../../../shared/components/risk_level_badge';
import { EntityLink, useOpenRelatedEntity, type OpenRelatedEntity } from './entity_link';
import { AI_AGENT_TEST_IDS } from '../test_ids';
import { relatedAgentsTitle, SAME_ACCOUNT, SAME_HOST } from '../translations';

const agentLabel = ({ agentName, userName, hostName, hostId }: RelatedEntity): string =>
  [getAgentDisplayName(agentName ?? ''), userName, hostName ?? hostId].filter(Boolean).join(' · ');

const AgentList = ({
  title,
  rows,
  onOpen,
  testId,
}: {
  title: string;
  rows: readonly RelatedEntity[];
  onOpen: OpenRelatedEntity;
  testId: string;
}) => (
  <div data-test-subj={testId}>
    <EuiTitle size="xxxs">
      <h4>{title}</h4>
    </EuiTitle>
    <EuiSpacer size="xs" />
    <EuiFlexGroup direction="column" gutterSize="xs">
      {rows.map((row) => (
        <EuiFlexItem key={row.entityId}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <EntityLink row={row} label={agentLabel(row)} onOpen={onOpen} />
              </EuiText>
            </EuiFlexItem>
            {row.riskLevel && (
              <EuiFlexItem grow={false}>
                <RiskLevelBadge riskLevel={row.riskLevel} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  </div>
);

export interface RelatedAgentsSectionProps {
  /** Other installs that signed in with an account this install used. */
  readonly sameAccount: readonly RelatedEntity[];
  /** Other agent installs on the same host. */
  readonly sameHost: readonly RelatedEntity[];
  readonly scopeId: string;
  readonly isOpen: boolean;
  readonly onToggle: (isOpen: boolean) => void;
}

/** Other installs on the same account and other agents on the same host. Hidden when both are empty. */
export const RelatedAgentsSection = memo(
  ({ sameAccount, sameHost, scopeId, isOpen, onToggle }: RelatedAgentsSectionProps) => {
    const { euiTheme } = useEuiTheme();
    const accordionId = useGeneratedHtmlId({ prefix: 'aiAgentRelatedAgents' });
    const onOpen = useOpenRelatedEntity(scopeId);
    const count = new Set([...sameAccount, ...sameHost].map((row) => row.entityId)).size;
    if (count === 0) return null;

    return (
      <>
        <EuiAccordion
          id={accordionId}
          forceState={isOpen ? 'open' : 'closed'}
          onToggle={onToggle}
          buttonContent={
            <EuiTitle size="xs">
              <h3>{relatedAgentsTitle(count)}</h3>
            </EuiTitle>
          }
          buttonProps={{
            'data-test-subj': AI_AGENT_TEST_IDS.relatedAgentsToggle,
            css: css`
              color: ${euiTheme.colors.primary};
            `,
          }}
          data-test-subj={AI_AGENT_TEST_IDS.relatedAgents}
        >
          <EuiSpacer size="s" />
          {sameAccount.length > 0 && (
            <AgentList
              title={SAME_ACCOUNT}
              rows={sameAccount}
              onOpen={onOpen}
              testId={AI_AGENT_TEST_IDS.sameAccount}
            />
          )}
          {sameAccount.length > 0 && sameHost.length > 0 && <EuiSpacer size="m" />}
          {sameHost.length > 0 && (
            <AgentList
              title={SAME_HOST}
              rows={sameHost}
              onOpen={onOpen}
              testId={AI_AGENT_TEST_IDS.sameHost}
            />
          )}
        </EuiAccordion>
        <EuiHorizontalRule margin="m" />
      </>
    );
  }
);
RelatedAgentsSection.displayName = 'RelatedAgentsSection';
