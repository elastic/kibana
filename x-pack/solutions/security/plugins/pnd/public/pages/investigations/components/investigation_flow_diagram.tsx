/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiText,
  EuiTimeline,
  EuiTimelineItem,
  type EuiStepsHorizontalProps,
  type IconType,
} from '@elastic/eui';
import type { Investigation, Proposal, TimelineEvent, WatchTier } from '@kbn/pnd-common';
import * as i18n from '../translations';

/**
 * Maps a raw `TimelineEvent.type` (free-text — see investigation.gen.ts) onto a
 * (icon, color) pair for the flow visualization. Unknown/future event types fall
 * back to a neutral dot rather than breaking the render.
 */
const EVENT_TYPE_STYLE: Record<string, { icon: IconType; color: string }> = {
  triage: { icon: 'magnifyWithExclamation', color: 'primary' },
  classification: { icon: 'tag', color: 'primary' },
  sweep: { icon: 'search', color: 'primary' },
  corroboration: { icon: 'link', color: 'primary' },
  evidence: { icon: 'document', color: 'primary' },
  network: { icon: 'globe', color: 'primary' },
  process: { icon: 'console', color: 'primary' },
  action: { icon: 'play', color: 'accent' },
  contain: { icon: 'lock', color: 'accent' },
  proposal_created: { icon: 'sparkles', color: 'accent' },
  escalate: { icon: 'sortUp', color: 'warning' },
  escalation: { icon: 'sortUp', color: 'warning' },
  resolution: { icon: 'checkInCircleFilled', color: 'success' },
  alert: { icon: 'bell', color: 'danger' },
};

const DEFAULT_EVENT_STYLE = { icon: 'dot' as IconType, color: 'subdued' };

const eventStyle = (type: string) => EVENT_TYPE_STYLE[type] ?? DEFAULT_EVENT_STYLE;

const WATCH_TIER_ICON: Partial<Record<WatchTier, IconType>> = {
  floor: 'layers',
  officer: 'securityApp',
  dark: 'eye',
  deep: 'magnifyWithPlus',
  detection: 'bolt',
};

interface FlowEvent extends TimelineEvent {
  /** Which conversation produced this event, for the "source" tag on each row. */
  source: 'investigation' | { proposalId: string; proposalType: string };
}

/**
 * Merges the Investigation's own events[] with every visible Proposal's events[]
 * into one chronologically-sorted flow, so the diagram reads as a single causal
 * chain (Watch detection -> investigation triage -> proposal drafted -> decided)
 * instead of two disconnected lists.
 */
const buildFlow = (investigation: Investigation, proposals: Proposal[]): FlowEvent[] => {
  const investigationEvents: FlowEvent[] = (investigation.events ?? []).map((event) => ({
    ...event,
    source: 'investigation',
  }));
  const proposalEvents: FlowEvent[] = proposals.flatMap((proposal) =>
    (proposal.events ?? []).map((event) => ({
      ...event,
      source: { proposalId: proposal.id, proposalType: proposal.type },
    }))
  );
  return [...investigationEvents, ...proposalEvents].sort((a, b) =>
    a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0
  );
};

/** Coarse pipeline stage a flow reaches, for the EuiStepsHorizontal ribbon. */
const currentStageIndex = (investigation: Investigation, proposals: Proposal[]): number => {
  const hasProposals = proposals.length > 0;
  const isDecided = proposals.some((proposal) => proposal.status !== 'pending');
  const isClosed = (investigation.pendingProposalCount ?? 0) === 0 && hasProposals;
  if (isClosed || isDecided) {
    return 3;
  }
  if (hasProposals) {
    return 2;
  }
  return 1;
};

const STAGE_LABELS = [
  i18n.FLOW_STAGE_DETECTED,
  i18n.FLOW_STAGE_INVESTIGATED,
  i18n.FLOW_STAGE_PROPOSED,
  i18n.FLOW_STAGE_DECIDED,
];

interface InvestigationFlowDiagramProps {
  investigation: Investigation;
  proposals: Proposal[];
  onSelectProposal?: (proposalId: string) => void;
}

/**
 * Renders the Investigation Detail "Timeline" tab as a data-flow diagram: a
 * horizontal pipeline-stage ribbon (Detected -> Investigated -> Proposed ->
 * Decided) followed by a vertical EuiTimeline that interleaves the
 * investigation's own events with every proposal's events in chronological
 * order, tagging each row with its source conversation (investigation vs a
 * specific proposal) and color-coding by event type.
 */
export const InvestigationFlowDiagram: React.FC<InvestigationFlowDiagramProps> = ({
  investigation,
  proposals,
  onSelectProposal,
}) => {
  const flow = useMemo(() => buildFlow(investigation, proposals), [investigation, proposals]);
  const activeStep = useMemo(
    () => currentStageIndex(investigation, proposals),
    [investigation, proposals]
  );

  // EuiStepsHorizontal requires an onClick per step; these are read-only status
  // indicators, not navigation, so it's intentionally a no-op.
  const steps: EuiStepsHorizontalProps['steps'] = STAGE_LABELS.map((label, index) => ({
    title: label,
    status: index < activeStep ? 'complete' : index === activeStep ? 'current' : 'incomplete',
    onClick: () => {},
  }));

  const watchTierIcon = investigation.watch_tier
    ? WATCH_TIER_ICON[investigation.watch_tier]
    : undefined;

  return (
    <>
      <EuiSpacer size="m" />
      <EuiStepsHorizontal steps={steps} data-test-subj="pndInvestigationFlowStages" />
      <EuiSpacer size="l" />

      <EuiPanel paddingSize="s" hasBorder color="subdued">
        <EuiFlexGroup gutterSize="s" alignItems="center">
          {watchTierIcon ? <EuiIcon type={watchTierIcon} size="m" /> : null}
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{investigation.watch_id}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon type="sortRight" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{investigation.title}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer size="m" />

      {flow.length === 0 ? (
        <EuiText size="s" color="subdued">
          <p>{i18n.FLOW_EMPTY}</p>
        </EuiText>
      ) : (
        <EuiTimeline data-test-subj="pndInvestigationFlowTimeline">
          {flow.map((event) => {
            const style = eventStyle(event.type);
            const proposalSource = typeof event.source === 'object' ? event.source : undefined;
            return (
              <EuiTimelineItem
                key={event.id}
                verticalAlign="top"
                icon={<EuiIcon type={style.icon} color={style.color} size="m" />}
                iconAriaLabel={event.type}
              >
                <EuiPanel paddingSize="s" hasShadow={false} hasBorder>
                  <EuiFlexGroup
                    gutterSize="s"
                    justifyContent="spaceBetween"
                    alignItems="flexStart"
                    responsive={false}
                  >
                    <EuiFlexItem>
                      <EuiText size="s">
                        <p>{event.summary}</p>
                      </EuiText>
                      <EuiText size="xs" color="subdued">
                        {event.timestamp}
                        {event.actor ? ` · ${event.actor}` : ''}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText
                        size="xs"
                        color={proposalSource && onSelectProposal ? 'accent' : 'subdued'}
                        onClick={
                          proposalSource && onSelectProposal
                            ? () => onSelectProposal(proposalSource.proposalId)
                            : undefined
                        }
                        css={proposalSource && onSelectProposal ? { cursor: 'pointer' } : undefined}
                        data-test-subj={`pndFlowEventSource-${event.id}`}
                      >
                        {proposalSource
                          ? i18n.flowSourceProposal(proposalSource.proposalType)
                          : i18n.FLOW_SOURCE_INVESTIGATION}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiTimelineItem>
            );
          })}
        </EuiTimeline>
      )}
    </>
  );
};
