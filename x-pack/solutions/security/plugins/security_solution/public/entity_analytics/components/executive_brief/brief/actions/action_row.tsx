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
  EuiLink,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { AiButtonIcon } from '@kbn/shared-ux-ai-components';
import type {
  Brief,
  BriefAction,
} from '../../../../../../common/entity_analytics/executive_brief/brief';
import type { Evidence } from '../../../../../../common/entity_analytics/executive_brief/evidence';
import { useBriefActions } from '../../actions/brief_actions_context';
import { EntityChip } from '../../evidence/entity_chip';
import { buildActionTriageRequest } from '../triage_requests';
import { OWNER_LABEL, TRIAGE_LABEL, URGENCY_LABEL } from './labels';
import { BriefText } from '../../evidence/brief_text';

const threatLabel = (rank: number): string => `Threat ${rank}`;
const goToThreatLabel = (rank: number): string => `Go to threat ${rank}`;

interface ActionRowProps {
  action: BriefAction;
  /** Position in `brief.actions`; used for test ids. */
  index: number;
  brief: Brief;
  evidence: Evidence;
  /** Inside a threat card: the urgency joins the meta line and the threat reference is dropped. */
  inline?: boolean;
}

/** One recommended action: the action, a quiet meta line and a triage button; details expand below. */
export const ActionRow: React.FC<ActionRowProps> = ({
  action,
  index,
  brief,
  evidence,
  inline = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const actions = useBriefActions();
  const accordionId = useGeneratedHtmlId({ prefix: 'executiveBriefAction' });
  const suffix = inline ? '-inline' : '';
  const { threat: threatRank } = action;
  const triage = actions?.triage;

  const renderThreatReference = (rank: number): React.ReactNode =>
    actions ? (
      <EuiLink
        color="subdued"
        onClick={(event: React.MouseEvent) => {
          event.stopPropagation();
          actions.openThreat(rank);
        }}
        aria-label={goToThreatLabel(rank)}
        data-test-subj={`executiveBriefActionThreat-${index}${suffix}`}
      >
        {threatLabel(rank)}
      </EuiLink>
    ) : (
      threatLabel(rank)
    );

  const metaItems: React.ReactNode[] = [
    inline ? URGENCY_LABEL[action.urgency] : undefined,
    <span key="owner" data-test-subj="executiveBriefActionOwner">
      {`Owner: ${OWNER_LABEL[action.owner]}`}
    </span>,
    !inline && threatRank !== undefined ? renderThreatReference(threatRank) : undefined,
  ].filter(Boolean);

  return (
    <div
      data-test-subj={`executiveBriefAction-${index}${suffix}`}
      css={css`
        padding: ${euiTheme.size.m} ${inline ? 0 : euiTheme.size.m};
        border-top: ${euiTheme.border.thin};
      `}
    >
      <EuiAccordion
        id={accordionId}
        arrowDisplay="left"
        // The meta line holds a link, which can't sit inside a <button>.
        buttonElement="div"
        paddingSize="none"
        buttonContent={
          <div>
            <EuiText size="s">
              <BriefText text={action.action} evidence={evidence} />
            </EuiText>
            <EuiText size="xs" color="subdued" data-test-subj="executiveBriefActionMeta">
              {metaItems.map((item, itemIndex) => (
                <React.Fragment key={itemIndex}>
                  {itemIndex > 0 && ' · '}
                  {item}
                </React.Fragment>
              ))}
            </EuiText>
          </div>
        }
        extraAction={
          triage ? (
            <AiButtonIcon
              variant="empty"
              size="s"
              iconType="productAgent"
              withToolTip
              aria-label={TRIAGE_LABEL}
              onClick={() => triage(buildActionTriageRequest({ action, brief, evidence }))}
              data-test-subj={`executiveBriefActionTriage-${index}${suffix}`}
            />
          ) : undefined
        }
      >
        <div
          css={css`
            padding-top: ${euiTheme.size.s};
            padding-left: ${euiTheme.size.l};
          `}
        >
          <EuiText size="s" color="subdued">
            <p data-test-subj="executiveBriefActionRationale">
              <BriefText text={action.rationale} evidence={evidence} />
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
            {!inline && threatRank !== undefined && (
              <>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {'Relates to'}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {actions ? (
                    <EuiBadge
                      color="hollow"
                      iconType="timeline"
                      onClick={() => actions.openThreat(threatRank)}
                      onClickAriaLabel={goToThreatLabel(threatRank)}
                      data-test-subj={`executiveBriefActionThreatChip-${index}${suffix}`}
                    >
                      {threatLabel(threatRank)}
                    </EuiBadge>
                  ) : (
                    <EuiBadge color="hollow" iconType="timeline">
                      {threatLabel(threatRank)}
                    </EuiBadge>
                  )}
                </EuiFlexItem>
              </>
            )}
            {action.targets.length > 0 && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {'Targets'}
                </EuiText>
              </EuiFlexItem>
            )}
            {action.targets.map((id) => (
              <EuiFlexItem grow={false} key={id}>
                <EntityChip id={id} evidence={evidence} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </div>
      </EuiAccordion>
    </div>
  );
};
