/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { AiButton } from '@kbn/shared-ux-ai-components';
import type { ExecutiveBriefDecision } from '../../../../../common/entity_analytics/executive_brief/types';
import { useKibana } from '../../../../common/lib/kibana';
import { buildDecisionPrompt } from '../utils/decision_prompt';
import { TEST_IDS } from '../test_ids';
import { ClaimFlag, useBriefSnapshot, useIsPrintMode } from './brief_context';
import { EvidenceChip } from './evidence_chip';

const noop = (): void => {};

const URGENCY: Record<
  ExecutiveBriefDecision['urgency'],
  { label: string; color: 'danger' | 'warning' | 'hollow' }
> = {
  now: { label: 'Now', color: 'danger' },
  this_week: { label: 'This week', color: 'warning' },
  next_review: { label: 'Next review', color: 'hollow' },
};

const OWNER_LABEL: Record<NonNullable<ExecutiveBriefDecision['owner']>, string> = {
  soc: 'SOC',
  it: 'IT',
  iam: 'IAM',
  cloud: 'Cloud',
  detection_engineering: 'Detection engineering',
  leadership: 'Leadership',
};

interface DecisionAccordionProps {
  decision: ExecutiveBriefDecision;
  index: number;
  /** Open by default (print layout / first item). */
  initialIsOpen?: boolean;
  /** Inline decisions inside a storyline card get a distinct test id suffix. */
  inline?: boolean;
}

export const DecisionAccordion: React.FC<DecisionAccordionProps> = ({
  decision,
  index,
  initialIsOpen = false,
  inline = false,
}) => {
  const snapshot = useBriefSnapshot();
  const isPrintMode = useIsPrintMode();
  const { agentBuilder } = useKibana().services;
  const accordionId = useGeneratedHtmlId({ prefix: 'executiveBriefDecision' });
  const urgency = URGENCY[decision.urgency];
  const ownerLabel = decision.owner ? OWNER_LABEL[decision.owner] : undefined;
  const canInvestigate = Boolean(agentBuilder?.openChat);

  const investigate = () => {
    agentBuilder?.openChat?.({
      autoSendInitialMessage: false,
      newConversation: true,
      initialMessage: buildDecisionPrompt(decision, snapshot),
      sessionTag: 'security',
    });
  };

  return (
    <EuiAccordion
      id={accordionId}
      initialIsOpen={initialIsOpen}
      arrowDisplay={isPrintMode ? 'none' : 'left'}
      forceState={isPrintMode ? 'open' : undefined}
      onToggle={isPrintMode ? noop : undefined}
      paddingSize="s"
      data-test-subj={`${TEST_IDS.decision(index)}${inline ? '-inline' : ''}`}
      buttonContent={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiBadge color={urgency.color}>{urgency.label}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{decision.action}</strong>
            </EuiText>
          </EuiFlexItem>
          {ownerLabel && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" iconType="user" data-test-subj="executiveBriefDecisionOwner">
                {ownerLabel}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
    >
      <EuiText size="s">
        <p>
          {decision.rationale} <ClaimFlag claimPath={`decisions[${index}]`} />
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {'Relates to'}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EvidenceChip id={decision.relatesTo} />
        </EuiFlexItem>
        {decision.targets.length > 0 && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {'Targets'}
            </EuiText>
          </EuiFlexItem>
        )}
        {decision.targets.map((id) => (
          <EuiFlexItem grow={false} key={id}>
            <EvidenceChip id={id} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {!isPrintMode && (
        <AiButton
          variant="outlined"
          size="s"
          iconType="productAgent"
          isDisabled={!canInvestigate}
          onClick={investigate}
          data-test-subj={`${TEST_IDS.investigate(index)}${inline ? '-inline' : ''}`}
        >
          {'Investigate with AI Agent'}
        </AiButton>
      )}
    </EuiAccordion>
  );
};
