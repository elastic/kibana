/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { AiButtonIcon } from '@kbn/shared-ux-ai-components';
import type { ExecutiveBriefDecision } from '../../../../../common/entity_analytics/executive_brief/types';
import { useKibana } from '../../../../common/lib/kibana';
import { buildDecisionPrompt } from '../utils/decision_prompt';
import { getEvidenceLabel } from '../utils/resolve_evidence';
import { TEST_IDS } from '../test_ids';
import { ClaimFlag, useBriefSnapshot, useIsPrintMode } from './brief_context';
import { EvidenceChip } from './evidence_chip';

const noop = (): void => {};

const TRIAGE_LABEL = 'Triage with AI Agent';

export const URGENCY_LABEL: Record<ExecutiveBriefDecision['urgency'], string> = {
  now: 'Now',
  this_week: 'This week',
  next_review: 'Next review',
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
  /** Inside a threat card: the urgency joins the meta line and the threat link is dropped. */
  inline?: boolean;
}

/** One decision row: the action, a quiet meta line and a triage button; details expand below. */
export const DecisionAccordion: React.FC<DecisionAccordionProps> = ({
  decision,
  index,
  inline = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const snapshot = useBriefSnapshot();
  const isPrintMode = useIsPrintMode();
  const { agentBuilder } = useKibana().services;
  const accordionId = useGeneratedHtmlId({ prefix: 'executiveBriefDecision' });
  const canInvestigate = Boolean(agentBuilder?.openChat);

  const investigate = () => {
    agentBuilder?.openChat?.({
      autoSendInitialMessage: false,
      newConversation: true,
      initialMessage: buildDecisionPrompt(decision, snapshot),
      sessionTag: 'security',
    });
  };

  const meta = [
    inline ? URGENCY_LABEL[decision.urgency] : undefined,
    decision.owner ? (
      <span key="owner" data-test-subj="executiveBriefDecisionOwner">
        {`Owner: ${OWNER_LABEL[decision.owner]}`}
      </span>
    ) : undefined,
    inline ? undefined : getEvidenceLabel(snapshot, decision.relatesTo),
  ].filter(Boolean);

  return (
    <div
      data-test-subj={`${TEST_IDS.decision(index)}${inline ? '-inline' : ''}`}
      css={css`
        padding: ${euiTheme.size.m} ${inline ? 0 : euiTheme.size.m};
        border-top: ${euiTheme.border.thin};
      `}
    >
      <EuiAccordion
        id={accordionId}
        arrowDisplay={isPrintMode ? 'none' : 'left'}
        forceState={isPrintMode ? 'open' : undefined}
        onToggle={isPrintMode ? noop : undefined}
        paddingSize="none"
        buttonContent={
          <div>
            <EuiText size="s">{decision.action}</EuiText>
            {meta.length > 0 && (
              <EuiText size="xs" color="subdued" data-test-subj="executiveBriefDecisionMeta">
                {meta.map((item, itemIndex) => (
                  <React.Fragment key={itemIndex}>
                    {itemIndex > 0 && ' · '}
                    {item}
                  </React.Fragment>
                ))}
              </EuiText>
            )}
          </div>
        }
        extraAction={
          isPrintMode || !canInvestigate ? undefined : (
            <AiButtonIcon
              variant="empty"
              size="s"
              iconType="productAgent"
              withToolTip
              aria-label={TRIAGE_LABEL}
              onClick={investigate}
              data-test-subj={`${TEST_IDS.investigate(index)}${inline ? '-inline' : ''}`}
            />
          )
        }
      >
        <div
          css={css`
            padding-top: ${euiTheme.size.s};
            padding-left: ${isPrintMode ? 0 : euiTheme.size.l};
          `}
        >
          <EuiText size="s" color="subdued">
            <p>
              {decision.rationale} <ClaimFlag claimPath={`decisions[${index}]`} />
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
            {!inline && (
              <>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {'Relates to'}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EvidenceChip id={decision.relatesTo} />
                </EuiFlexItem>
              </>
            )}
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
        </div>
      </EuiAccordion>
    </div>
  );
};
