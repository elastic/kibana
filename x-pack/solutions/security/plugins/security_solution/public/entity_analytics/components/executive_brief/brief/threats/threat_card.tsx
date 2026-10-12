/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { AiButtonEmpty } from '@kbn/shared-ux-ai-components';
import type {
  Brief,
  BriefThreat,
} from '../../../../../../common/entity_analytics/executive_brief/brief';
import type { Evidence } from '../../../../../../common/entity_analytics/executive_brief/evidence';
import { useBriefActions } from '../../actions/brief_actions_context';
import { EntityChip } from '../../evidence/entity_chip';
import { FactTimeline } from '../../evidence/fact_timeline';
import { HowFound } from '../../evidence/how_found';
import {
  getKeyEventFacts,
  getResponseFacts,
  getTactics,
  getThreatFacts,
} from '../../evidence/resolve';
import { useThreatOpenRequest } from '../../flyout/threat_open_request';
import { ActionRow } from '../actions/action_row';
import { TRIAGE_LABEL } from '../actions/labels';
import { buildThreatTriageRequest } from '../triage_requests';
import { CONFIDENCE_LABEL, SEVERITY_LABEL, STATUS_LABEL } from './labels';
import { ThreatResponse } from './threat_response';
import { BriefText } from '../../evidence/brief_text';

const SHOW_DETAILS = 'Show threat details';
const HIDE_DETAILS = 'Hide threat details';
const NEXT_STEP = 'Next step: ';
const WHY_IT_MATTERS = 'Why it matters: ';
const TIMELINE_TITLE = 'Timeline';
const ACTIONS_TITLE = 'Recommended actions';

const useSeverityColor = (severity: BriefThreat['severity']): string => {
  const { euiTheme } = useEuiTheme();
  const { danger, risk, warning, neutral } = euiTheme.colors.severity;
  return { critical: danger, high: risk, medium: warning, low: neutral }[severity];
};

interface ThreatCardProps {
  threat: BriefThreat;
  /** 1-based position in the brief's threats. */
  rank: number;
  brief: Brief;
  evidence: Evidence;
}

/** One priority threat: the header always shows what matters; the details expand below. */
export const ThreatCard: React.FC<ThreatCardProps> = ({ threat, rank, brief, evidence }) => {
  const actions = useBriefActions();
  const triage = actions?.triage;
  const bodyId = useGeneratedHtmlId({ prefix: 'executiveBriefThreatBody' });
  const [isOpen, setIsOpen] = useState(rank === 1);
  const openRequest = useThreatOpenRequest();
  useEffect(() => {
    if (openRequest?.rank === rank) setIsOpen(true);
  }, [openRequest, rank]);
  const severityColor = useSeverityColor(threat.severity);

  const facts = getThreatFacts(threat, evidence);
  const keyEvents = getKeyEventFacts(threat, evidence);
  const responseFacts = getResponseFacts(facts);
  const tactics = getTactics(facts).join(' → ');
  const threatActions = brief.actions
    .map((action, index) => ({ action, index }))
    .filter(({ action }) => action.threat === rank);

  const toggle = () => setIsOpen(!isOpen);
  const toggleLabel = isOpen ? HIDE_DETAILS : SHOW_DETAILS;

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj={`executiveBriefThreatCard-${rank}`}>
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={toggleLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType={isOpen ? 'chevronSingleDown' : 'chevronSingleRight'}
              color="text"
              onClick={toggle}
              aria-expanded={isOpen}
              aria-controls={bodyId}
              aria-label={toggleLabel}
              data-test-subj={`executiveBriefThreatToggle-${rank}`}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem>
          <div data-test-subj={`executiveBriefThreatHeader-${rank}`}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiBadge color={severityColor} data-test-subj={`executiveBriefSeverity-${rank}`}>
                  {SEVERITY_LABEL[threat.severity]}
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h4>
                    <EuiLink
                      color="text"
                      onClick={toggle}
                      aria-expanded={isOpen}
                      aria-controls={bodyId}
                      data-test-subj={`executiveBriefThreatTitle-${rank}`}
                    >
                      <BriefText text={threat.title} evidence={evidence} />
                    </EuiLink>
                  </h4>
                </EuiTitle>
              </EuiFlexItem>
              {triage && (
                <EuiFlexItem grow={false}>
                  <AiButtonEmpty
                    size="xs"
                    iconType="productAgent"
                    onClick={() => triage(buildThreatTriageRequest({ threat, rank, evidence }))}
                    data-test-subj={`executiveBriefThreatTriage-${rank}`}
                  >
                    {TRIAGE_LABEL}
                  </AiButtonEmpty>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="subdued" data-test-subj={`executiveBriefThreatMeta-${rank}`}>
              <span data-test-subj="executiveBriefThreatStatus">{STATUS_LABEL[threat.status]}</span>
              {' · '}
              <span data-test-subj="executiveBriefThreatConfidence">
                {CONFIDENCE_LABEL[threat.confidence]}
              </span>
              {tactics && (
                <>
                  {' · '}
                  <span data-test-subj="executiveBriefThreatTactics">{tactics}</span>
                </>
              )}
            </EuiText>
            <EuiSpacer size="s" />
            <EuiFlexGroup
              gutterSize="xs"
              wrap
              responsive={false}
              data-test-subj={`executiveBriefThreatEntities-${rank}`}
            >
              {threat.entities.map((id) => (
                <EuiFlexItem grow={false} key={id}>
                  <EntityChip id={id} evidence={evidence} />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiText size="s" data-test-subj={`executiveBriefThreatNextStep-${rank}`}>
              <strong>{NEXT_STEP}</strong>
              <BriefText text={threat.nextStep.action} evidence={evidence} />
            </EuiText>
            {!isOpen && (
              <>
                <EuiSpacer size="xs" />
                <EuiText
                  size="s"
                  color="subdued"
                  data-test-subj={`executiveBriefNarrativePreview-${rank}`}
                  css={css`
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                  `}
                >
                  <BriefText text={threat.narrative} evidence={evidence} />
                </EuiText>
              </>
            )}
          </div>
          {isOpen && (
            <div id={bodyId} data-test-subj={`executiveBriefThreatBody-${rank}`}>
              <EuiSpacer size="m" />
              <EuiText size="s">
                <p>
                  <BriefText text={threat.narrative} evidence={evidence} />
                </p>
                <p>
                  <strong>{WHY_IT_MATTERS}</strong>
                  <BriefText text={threat.whyItMatters} evidence={evidence} />
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              <HowFound threat={threat} evidence={evidence} />
              {keyEvents.length > 0 && (
                <>
                  <EuiSpacer size="m" />
                  <EuiTitle size="xxs">
                    <h5>{TIMELINE_TITLE}</h5>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <FactTimeline facts={keyEvents} />
                </>
              )}
              <EuiSpacer size="m" />
              <ThreatResponse threat={threat} responseFacts={responseFacts} />
              {threatActions.length > 0 && (
                <>
                  <EuiSpacer size="m" />
                  <EuiTitle size="xxs">
                    <h5>{ACTIONS_TITLE}</h5>
                  </EuiTitle>
                  {threatActions.map(({ action, index }) => (
                    <ActionRow
                      key={`${action.action}-${index}`}
                      action={action}
                      index={index}
                      brief={brief}
                      evidence={evidence}
                      inline
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
