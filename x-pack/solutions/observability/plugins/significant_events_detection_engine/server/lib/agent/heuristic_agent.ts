/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EngineSeverity, EvidenceVerdict } from '../../../common';
import { mentions, sharedIds } from './mentions';
import type { AgentAnswer, AgentCase, CaseEvidence, ITriageAgent } from './types';

/** Joins across a dependency are confirmed only when the symptoms are this close in time. */
const DEPENDENCY_JOIN_MAX_MINUTES = 30;
/**
 * A joining signal this much more important than everything in the event leads its text: a
 * service going silent must not hide inside an event about routine rejections.
 */
const ESCALATION_MARGIN = 15;

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

/**
 * A dependency alone does not make two symptoms one problem. Confirm only when the evidence
 * links them: the new signal's rows name a service in the event ("Call to payments failed"),
 * or the event's rows name the new signal's service.
 */
function evidenceLinksServices(agentCase: AgentCase): boolean {
  const [own, ...eventEvidence] = agentCase.evidence;
  // Siblings are one problem when both sides name the dependency they share.
  if (agentCase.join_proposal?.relation === 'shared_dependency') {
    const via = agentCase.join_proposal.via;
    return (
      own !== undefined &&
      mentions(own.rows, via) &&
      eventEvidence.some((evidence) => mentions(evidence.rows, via))
    );
  }
  const eventServices = agentCase.event?.services ?? [];
  const ownLinks =
    own !== undefined && eventServices.some((service) => mentions(own.rows, service));
  const eventLinks = eventEvidence.some((evidence) =>
    mentions(evidence.rows, agentCase.signal.service)
  );
  // The same request or trace id in both services' rows links them, named or not.
  const sameRequest =
    own !== undefined &&
    eventEvidence.some((evidence) => sharedIds(own.rows, evidence.rows).length > 0);
  return ownLinks || eventLinks || sameRequest;
}

/** How close in time two symptoms on a call edge must start to anchor a join. */
const ANCHOR_MINUTES = 3;

/**
 * The anchor rule: a direct call edge, and the service at its other end in the event already
 * shows the same kind of symptom, starting within minutes. Latency on the gateway and latency on
 * the search it calls are one slowdown even though latency rows never name a service; in the lab,
 * vetoing these split one supplier slowdown into three events. One hop only, and never a shared
 * dependency, because topology propagation beyond the anchor is where wrong joins come from.
 */
function anchoredOnCallEdge(agentCase: AgentCase): boolean {
  const proposal = agentCase.join_proposal;
  if (
    !proposal ||
    (proposal.relation !== 'upstream' && proposal.relation !== 'downstream') ||
    proposal.minutes_apart > ANCHOR_MINUTES
  ) {
    return false;
  }
  return (agentCase.event?.members ?? []).some(
    (member) => member.service === proposal.via && member.unit === agentCase.signal.unit
  );
}

/**
 * A deterministic stand-in for the triage agent. It answers in the same shape as the model,
 * so the pipeline around it is the same, and runs with no connector and no cost.
 */
export function createHeuristicAgent(): ITriageAgent {
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
  const linked =
    proposal !== undefined && (evidenceLinksServices(agentCase) || anchoredOnCallEdge(agentCase));
  const joinConfirmed =
    proposal !== undefined &&
    (proposal.relation === 'same_service' ||
      (linked && proposal.minutes_apart <= DEPENDENCY_JOIN_MAX_MINUTES));

  const importance = Math.max(
    agentCase.signal.importance,
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
  const { signal } = agentCase;
  const eventImportance = Math.max(
    0,
    ...(agentCase.event?.members ?? []).map((member) => member.importance)
  );
  const escalates = signal.importance >= eventImportance + ESCALATION_MARGIN;
  const keepEventText =
    agentCase.event && (joinConfirmed || agentCase.kind === 'reopen') && !escalates;

  return {
    // A recurrence is the same problem for the heuristic: it cannot tell two causes apart.
    join_event_id:
      agentCase.kind === 'reopen'
        ? agentCase.event?.event_id
        : proposal && joinConfirmed
        ? proposal.event_id
        : undefined,
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
    title: keepEventText ? agentCase.event!.title : signal.title,
    summary: keepEventText
      ? `${agentCase.event!.summary} Also: ${signal.title} (${signal.service}).`
      : `${signal.title} on ${signal.service}. ${signal.description} ${confirming} of ${
          verdicts.length
        } evidence check(s) confirm it.${
          agentCase.firing_customer_alerts.length > 0
            ? ` ${agentCase.firing_customer_alerts.length} customer alert(s) firing at the same time.`
            : ''
        }${
          escalates && joinConfirmed && agentCase.event
            ? ` It joined an event that was about: ${agentCase.event.title}.`
            : ''
        }`,
  };
}
