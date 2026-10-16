/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EngineSeverity, EvidenceVerdict } from '../../../common';
import type { AgentAnswer, AgentCase, CaseEvidence, IDiscoveryAgent } from './types';

/** Joins across a dependency are confirmed only when the symptoms are this close in time. */
const DEPENDENCY_JOIN_MAX_MINUTES = 30;

const SEVERITY_ORDER: EngineSeverity[] = ['low', 'medium', 'high', 'critical'];

function severityFromImportance(importance: number): EngineSeverity {
  if (importance >= 85) {
    return 'critical';
  }
  if (importance >= 65) {
    return 'high';
  }
  if (importance >= 45) {
    return 'medium';
  }
  return 'low';
}

function verdictFor(evidence: CaseEvidence): { verdict: EvidenceVerdict; note: string } {
  // For a silence check, no rows at all means the service sent nothing: that confirms it.
  if (evidence.unit === 'drop' && evidence.result === 'empty') {
    return { verdict: 'confirms', note: 'No documents in the last 30 minutes.' };
  }
  if (evidence.result === 'found') {
    return { verdict: 'confirms', note: `${evidence.rows.length} row(s) show the problem.` };
  }
  return {
    verdict: 'inconclusive',
    note:
      evidence.result === 'error'
        ? `The query failed: ${evidence.error ?? 'unknown error'}`
        : 'The query returned no rows.',
  };
}

function mentions(rows: CaseEvidence['rows'], service: string): boolean {
  const pattern = new RegExp(`\\b${service.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  return rows.some((row) =>
    Object.entries(row).some(
      ([column, value]) => column !== 'service.name' && pattern.test(String(value))
    )
  );
}

/**
 * A dependency alone does not make two symptoms one problem. Confirm only when the evidence
 * links them: the new detection's rows name a service in the event ("Call to payments failed"),
 * or the event's rows name the new detection's service.
 */
function evidenceLinksServices(agentCase: AgentCase): boolean {
  const [own, ...eventEvidence] = agentCase.evidence;
  const eventServices = agentCase.event?.services ?? [];
  const ownLinks =
    own !== undefined && eventServices.some((service) => mentions(own.rows, service));
  const eventLinks = eventEvidence.some((evidence) =>
    mentions(evidence.rows, agentCase.detection.service)
  );
  return ownLinks || eventLinks;
}

/**
 * A deterministic stand-in for the discovery agent. It answers in the same shape as the model,
 * so the pipeline around it is the same, and runs with no connector and no cost.
 */
export function createHeuristicAgent(): IDiscoveryAgent {
  return {
    kind: 'heuristic',
    usesModel: false,

    async assess(agentCase: AgentCase) {
      return { answer: assessHeuristically(agentCase) };
    },
  };
}

/** The heuristic's judgment of one case: deterministic, so the same case gets the same answer. */
function assessHeuristically(agentCase: AgentCase): AgentAnswer {
  const verdicts = agentCase.evidence.map((evidence) => ({
    evidence_id: evidence.id,
    ...verdictFor(evidence),
  }));

  const proposal = agentCase.join_proposal;
  const linked = proposal !== undefined && evidenceLinksServices(agentCase);
  const joinConfirmed =
    proposal !== undefined &&
    (proposal.relation === 'same_service' ||
      (linked && proposal.minutes_apart <= DEPENDENCY_JOIN_MAX_MINUTES));

  const importance = Math.max(
    agentCase.detection.importance,
    ...agentCase.firing_customer_alerts.map(() => 75)
  );
  const baseSeverity = severityFromImportance(importance);
  const previous = agentCase.event?.severity;
  // A join never lowers the event's severity.
  const raised =
    previous && SEVERITY_ORDER.indexOf(previous) > SEVERITY_ORDER.indexOf(baseSeverity)
      ? previous
      : baseSeverity;
  // Past dismissals as expected behaviour lower the judgment by one step.
  const dismissedAsExpected = agentCase.memory.some((note) => note.includes('expected_behavior'));
  const severity = dismissedAsExpected
    ? SEVERITY_ORDER[Math.max(0, SEVERITY_ORDER.indexOf(raised) - 1)]
    : raised;

  const confirming = verdicts.filter((verdict) => verdict.verdict === 'confirms').length;
  const { detection } = agentCase;
  const keepEventText = agentCase.event && (joinConfirmed || agentCase.kind === 'reopen');

  return {
    join_decision: proposal ? (joinConfirmed ? 'confirm' : 'veto') : undefined,
    join_reason: proposal
      ? joinConfirmed
        ? `Confirmed: ${proposal.reason}, ${Math.round(proposal.minutes_apart)} min apart.`
        : linked
        ? `Vetoed: ${proposal.reason}, but ${Math.round(
            proposal.minutes_apart
          )} min apart is too far to be one problem without more evidence.`
        : `Vetoed: ${proposal.reason}, but no evidence row names the other service, so a dependency alone does not make them one problem.`
      : undefined,
    verdicts,
    severity,
    title: keepEventText ? agentCase.event!.title : detection.title,
    summary: keepEventText
      ? `${agentCase.event!.summary} Also: ${detection.title} (${detection.service}).`
      : `${detection.title} on ${detection.service}. ${detection.description} ${confirming} of ${
          verdicts.length
        } evidence check(s) confirm it.${
          agentCase.firing_customer_alerts.length > 0
            ? ` ${agentCase.firing_customer_alerts.length} customer alert(s) firing at the same time.`
            : ''
        }`,
  };
}
