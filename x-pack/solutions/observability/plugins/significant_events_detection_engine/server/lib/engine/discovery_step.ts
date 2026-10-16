/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  AgentKind,
  BaselineSummary,
  DetectionOutcome,
  DetectionStrategyId,
  EngineConfig,
  EngineDetection,
  EngineEvent,
  EngineSeverity,
  EventMember,
} from '../../../common';
import { BUCKET_MS, OPEN_EVENT_STATUSES } from '../../../common';
import { buildCase } from '../agent/build_case';
import type { AgentAnswer, AgentCase, CaseDetection } from '../agent/types';
import { guardSeverity } from '../agent/validate_answer';
import type { PendingDetection, TaggedObservation } from '../domain';
import { type Dependency, type JoinProposal, proposeJoins } from '../pipeline/join_proposals';
import { nextEventStatus } from '../pipeline/state_machine';
import { STRATEGIES } from '../strategies/strategy_registry';
import type { IAgentRunner } from './agent_runner';
import type { IEngineScope } from './engine_scope';
import type { IEventWorkingSet } from './event_working_set';
import type { IRunRecorder } from './run_recorder';

const SEVERITY_RANK: Record<EngineSeverity, number> = { low: 0, medium: 1, high: 2, critical: 3 };

function maxSeverity(a: EngineSeverity, b: EngineSeverity): EngineSeverity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

/** A value in its unit as people read it in the activity log: 44.2%, 1,214 ms, 51.7. */
function formatMeasure(value: number, unit: string): string {
  if (unit === 'ratio' || unit === 'drop') {
    return `${Math.round(value * 1000) / 10}%`;
  }
  if (unit === 'ms') {
    return `${Math.round(value).toLocaleString('en-US')} ms`;
  }
  return (Math.round(value * 10) / 10).toLocaleString('en-US');
}

// A plain boolean on purpose: a type predicate would narrow a closed owner to `never`.
const isOpen = (event: EngineEvent | undefined): boolean =>
  event !== undefined && OPEN_EVENT_STATUSES.includes(event.status);

function relatedServicesOf(service: string, dependencies: Dependency[]): string[] {
  return [
    ...new Set(
      dependencies.flatMap((dependency) => {
        if (dependency.source === service) {
          return [dependency.target];
        }
        if (dependency.target === service) {
          return [dependency.source];
        }
        return [];
      })
    ),
  ];
}

function toMember({
  observation,
  detectionId,
  threshold,
  at,
  joinReason,
}: {
  observation: TaggedObservation;
  detectionId: string;
  threshold?: number;
  at: string;
  joinReason: string;
}): EventMember {
  return {
    fingerprint: observation.fingerprint,
    strategy: observation.strategy,
    service: observation.service,
    title: observation.title,
    latest_detection_id: detectionId,
    value: observation.value,
    peak_value: observation.value,
    threshold,
    unit: observation.unit,
    importance: observation.importance,
    evidence_esql: observation.evidence_esql,
    source_id: observation.source_id,
    healthy: false,
    healthy_streak: 0,
    last_evaluated_bucket: at,
    first_seen: at,
    last_seen: at,
    joined_at: at,
    join_reason: joinReason,
  };
}

/** Applies validated verdicts to the members they are about. */
function applyVerdicts(event: EngineEvent, agentCase: AgentCase, answer: AgentAnswer): EngineEvent {
  const byFingerprint = new Map(
    answer.verdicts.flatMap((verdict) => {
      const evidence = agentCase.evidence.find((item) => item.id === verdict.evidence_id);
      return evidence ? [[evidence.fingerprint, { verdict, evidence }] as const] : [];
    })
  );
  return {
    ...event,
    members: event.members.map((member) => {
      const match = byFingerprint.get(member.fingerprint);
      return match
        ? { ...member, verdict: match.verdict.verdict, evidence_result: match.evidence.result }
        : member;
    }),
  };
}

/** Customer alerts firing in a bucket, which every case lists next to its detection. */
export interface FiringAlert {
  title: string;
  service: string;
}

/** The decisions after the baseline check, one detection at a time. */
export interface IDiscoveryStep {
  /**
   * Decides what one detection does: continue, reopen, join, open, or nothing. The baseline
   * check already ran; `pending` detections come back here on a later run with their baseline.
   */
  process(params: {
    observation: TaggedObservation;
    baseline: BaselineSummary;
    firingAlerts: FiringAlert[];
    fromPending?: PendingDetection;
  }): Promise<void>;
  /** Records a detection the baseline check stopped. */
  recordBelowNormal(params: { observation: TaggedObservation; baseline: BaselineSummary }): void;
  /** Detections that waited for budget, to retry on the next run. */
  pending(): PendingDetection[];
}

/** Gives up on a detection that waited for budget this many runs. */
const MAX_PENDING_ATTEMPTS = 5;

/**
 * Code decides everything it can compute: identity, the dismissal hold, join proposals, the daily
 * cap and status. The agent checks evidence, rates severity, explains, and confirms or vetoes
 * joins. Detections are handled one at a time on purpose: each decision can open an event the
 * next detection may join.
 */
export function createDiscoveryStep({
  scope,
  config,
  recorder,
  events,
  dependencies,
  agent,
  openedToday,
  memoryFor,
  signal,
  maxPending,
  maxDetections,
}: {
  scope: IEngineScope;
  config: EngineConfig;
  recorder: IRunRecorder;
  events: IEventWorkingSet;
  dependencies: Dependency[];
  agent: IAgentRunner;
  /** New events per origin strategy today, for the daily caps. Updated as events open. */
  openedToday: Map<DetectionStrategyId, number>;
  memoryFor: (fingerprints: string[]) => Promise<string[]>;
  signal: AbortSignal;
  maxPending: number;
  maxDetections: number;
}): IDiscoveryStep {
  const { summary } = recorder;
  const queued: PendingDetection[] = [];
  let aboveNormal = 0;

  const record = ({
    observation,
    baseline,
    detectionId,
    outcome,
    reason,
    eventId,
  }: {
    observation: TaggedObservation;
    baseline: BaselineSummary;
    detectionId: string;
    outcome: DetectionOutcome;
    reason: string;
    eventId?: string;
  }) => {
    const at = new Date(observation.bucket_start).toISOString();
    const detection: EngineDetection = {
      detection_id: detectionId,
      '@timestamp': new Date(observation.bucket_start + BUCKET_MS).toISOString(),
      run_id: recorder.runId,
      strategy: observation.strategy,
      mode: config.strategies[observation.strategy].mode,
      fingerprint: observation.fingerprint,
      service: observation.service,
      title: observation.title,
      description: observation.description,
      since: observation.since ?? at,
      bucket_start: at,
      bucket_end: new Date(observation.bucket_start + BUCKET_MS).toISOString(),
      value: observation.value,
      unit: observation.unit,
      importance: observation.importance,
      evidence_esql: observation.evidence_esql,
      source_id: observation.source_id,
      rule_id: observation.rule_id,
      baseline,
      outcome,
      outcome_reason: reason,
      event_id: eventId,
    };
    recorder.recordDetection(detection);
  };

  const defer = ({
    observation,
    baseline,
    detectionId,
    reason,
    fromPending,
  }: {
    observation: TaggedObservation;
    baseline: BaselineSummary;
    detectionId: string;
    reason: string;
    fromPending?: PendingDetection;
  }) => {
    const attempts = (fromPending?.attempts ?? 0) + 1;
    const keep = attempts < MAX_PENDING_ATTEMPTS && queued.length < maxPending;
    if (keep) {
      queued.push({
        observation,
        baseline,
        queued_at: fromPending?.queued_at ?? new Date().toISOString(),
        attempts,
      });
    }
    record({
      observation,
      baseline,
      detectionId,
      outcome: 'deferred',
      reason: keep
        ? `${reason}; retried on the next run.`
        : `${reason}; dropped after ${attempts} attempt(s) or because the retry queue is full.`,
    });
    recorder.log({
      step: 'agent',
      action: keep ? 'deferred' : 'dropped',
      strategy: observation.strategy,
      service: observation.service,
      detection_id: detectionId,
      message: `${observation.title}: ${reason}${
        keep ? ', waiting for the next run' : ', dropped'
      }.`,
    });
  };

  const recordAssessment = ({
    event,
    agentCase,
    answer,
    agentKind,
    corrections,
  }: {
    event: EngineEvent;
    agentCase: AgentCase;
    answer: AgentAnswer;
    agentKind: AgentKind;
    corrections: string[];
  }): EngineEvent => {
    const withVerdicts = applyVerdicts(event, agentCase, answer);
    const confirmations = withVerdicts.members.filter(
      (member) => member.verdict === 'confirms'
    ).length;
    const hasCustomerAlert = withVerdicts.members.some(
      (member) => member.strategy === 'customer_alerts'
    );
    const guarded = guardSeverity({ severity: answer.severity, confirmations, hasCustomerAlert });
    return {
      ...withVerdicts,
      title: answer.title,
      summary: answer.summary,
      severity: guarded.severity,
      assessment: {
        agent: agentKind,
        connector_id: agentKind === 'agent_builder' ? config.agent.connector_id : undefined,
        at: new Date().toISOString(),
        explanation: [answer.join_reason, ...corrections].filter(Boolean).join(' '),
        verdicts: answer.verdicts.map((verdict) => ({
          ...verdict,
          fingerprint:
            agentCase.evidence.find((item) => item.id === verdict.evidence_id)?.fingerprint ?? '',
        })),
        proposed_severity: answer.severity,
        severity_guard: guarded.guard,
      },
    };
  };

  return {
    pending: () => queued,

    recordBelowNormal({ observation, baseline }) {
      const owner = events.ownerOf(observation.fingerprint);
      const detectionId = uuidv4();
      const reason =
        baseline.decision === 'warming_up'
          ? `Warming up: ${baseline.samples} of ${config.baseline.min_samples} samples needed.`
          : `Within normal: ${formatMeasure(observation.value, observation.unit)} is not above ${
              baseline.threshold === undefined
                ? 'its threshold'
                : formatMeasure(baseline.threshold, observation.unit)
            }.`;
      record({
        observation,
        baseline,
        detectionId,
        outcome: baseline.decision === 'warming_up' ? 'warming_up' : 'background',
        reason,
        eventId: owner && isOpen(owner) ? owner.event_id : undefined,
      });
      recorder.log({
        step: 'baseline',
        action: baseline.decision,
        strategy: observation.strategy,
        service: observation.service,
        detection_id: detectionId,
        message: `${observation.title}: ${reason}`,
      });
    },

    async process({ observation, baseline, firingAlerts, fromPending }) {
      const strategyConfig = config.strategies[observation.strategy];
      const descriptor = STRATEGIES[observation.strategy].descriptor;
      const detectionId = uuidv4();
      const at = new Date(observation.bucket_start).toISOString();
      const bucketEndIso = new Date(observation.bucket_start + BUCKET_MS).toISOString();
      const owner = events.ownerOf(observation.fingerprint);

      if (!fromPending) {
        recorder.log({
          step: 'baseline',
          action: baseline.decision,
          strategy: observation.strategy,
          service: observation.service,
          detection_id: detectionId,
          message:
            baseline.decision === 'skipped'
              ? `${observation.title}: the customer's rule already decided; baseline check skipped.`
              : `${observation.title}: above normal, ${formatMeasure(
                  observation.value,
                  observation.unit
                )} against up to ${formatMeasure(
                  baseline.threshold ?? 0,
                  observation.unit
                )} (median ${formatMeasure(baseline.median ?? 0, observation.unit)} over ${
                  baseline.samples
                } minutes).`,
        });
      }

      if (strategyConfig.mode === 'trial') {
        record({
          observation,
          baseline,
          detectionId,
          outcome: 'trial_would_raise',
          reason: 'Trial run: recorded what it would raise, raised nothing.',
        });
        recorder.log({
          step: 'trial',
          action: 'would_raise',
          strategy: observation.strategy,
          service: observation.service,
          detection_id: detectionId,
          message: `Trial: ${observation.title} would have gone to discovery.`,
        });
        return;
      }

      // Identity: the same problem continues the same open event, with no agent call.
      if (owner && isOpen(owner)) {
        events.set(
          {
            ...owner,
            updated_at: bucketEndIso > owner.updated_at ? bucketEndIso : owner.updated_at,
            members: owner.members.map((member) =>
              member.fingerprint === observation.fingerprint
                ? {
                    ...member,
                    value: observation.value,
                    title: observation.title,
                    peak_value: Math.max(member.peak_value, observation.value),
                    threshold: baseline.threshold,
                    latest_detection_id: detectionId,
                    evidence_esql: observation.evidence_esql,
                    last_seen: at > member.last_seen ? at : member.last_seen,
                  }
                : member
            ),
          },
          'facts'
        );
        record({
          observation,
          baseline,
          detectionId,
          outcome: 'continued',
          reason: `Continues event "${owner.title}".`,
          eventId: owner.event_id,
        });
        recorder.log({
          step: 'identity',
          action: 'continued',
          strategy: observation.strategy,
          service: observation.service,
          detection_id: detectionId,
          event_id: owner.event_id,
          message: `${observation.title} continues the open event "${owner.title}".`,
        });
        return;
      }

      if (owner) {
        // A closed event's problem is back. A dismissed one stays quiet until it is worse.
        const dismissedValue = owner.dismissal?.values[observation.fingerprint];
        if (
          owner.dismissal &&
          (dismissedValue === undefined ||
            observation.value <= dismissedValue * (1 + config.worse_margin))
        ) {
          record({
            observation,
            baseline,
            detectionId,
            outcome: 'held_by_dismissal',
            reason: `Dismissed as ${owner.dismissal.reason}; ${formatMeasure(
              observation.value,
              observation.unit
            )} is not worse than ${
              dismissedValue === undefined
                ? 'the dismissed value'
                : formatMeasure(dismissedValue, observation.unit)
            } by ${config.worse_margin * 100}%.`,
            eventId: owner.event_id,
          });
          recorder.log({
            step: 'identity',
            action: 'held_by_dismissal',
            strategy: observation.strategy,
            service: observation.service,
            detection_id: detectionId,
            event_id: owner.event_id,
            message: `${observation.title} matches dismissed event "${owner.title}"; held until the problem gets worse.`,
          });
          return;
        }
      }

      aboveNormal += 1;
      const unavailable =
        aboveNormal > maxDetections ? 'detection_cap' : agent.unavailable() ?? undefined;
      if (unavailable) {
        defer({
          observation,
          baseline,
          detectionId,
          fromPending,
          reason:
            unavailable === 'detection_cap'
              ? `More than ${maxDetections} detections reached discovery in this run`
              : unavailable === 'run_budget'
              ? `The agent budget of ${config.max_agent_calls_per_run} calls per run is used up`
              : 'The run is close to its time budget',
        });
        return;
      }

      const relatedServices = relatedServicesOf(observation.service, dependencies);
      const caseDetection: CaseDetection = {
        fingerprint: observation.fingerprint,
        strategy: observation.strategy,
        service: observation.service,
        title: observation.title,
        description: observation.description,
        value: observation.value,
        unit: observation.unit,
        threshold: baseline.threshold,
        importance: observation.importance,
      };

      if (owner) {
        const agentCase = await buildCase({
          dataEsClient: scope.dataEsClient,
          signal,
          kind: 'reopen',
          detection: caseDetection,
          evidenceQuery: observation.evidence_esql,
          event: owner,
          firingAlerts,
          relatedServices,
          memory: await memoryFor(owner.members.map((member) => member.fingerprint)),
        });
        const { answer, agentKind, corrections } = await agent.assess(agentCase);
        const transition = nextEventStatus(owner.status, 'member_firing');
        const reopened = recordAssessment({
          event: {
            ...owner,
            status: transition.to,
            episode: owner.episode + 1,
            opened_at: at,
            updated_at: bucketEndIso,
            closed_at: undefined,
            close_reason: undefined,
            dismissal: undefined,
            verification: undefined,
            open_windows: [
              ...owner.open_windows,
              { from: at, raised_at: new Date().toISOString(), run_started_at: summary.started_at },
            ],
            members: owner.members.map((member) =>
              member.fingerprint === observation.fingerprint
                ? {
                    ...member,
                    value: observation.value,
                    peak_value: Math.max(member.peak_value, observation.value),
                    latest_detection_id: detectionId,
                    evidence_esql: observation.evidence_esql,
                    healthy: false,
                    healthy_streak: 0,
                    last_evaluated_bucket: at,
                    last_seen: at,
                  }
                : member
            ),
          },
          agentCase,
          answer,
          agentKind,
          corrections,
        });
        events.set(reopened, 'changed');
        summary.transitions.push({
          event_id: owner.event_id,
          from: owner.status,
          to: reopened.status,
        });
        record({
          observation,
          baseline,
          detectionId,
          outcome: 'reopened',
          reason: owner.dismissal
            ? `Worse than when dismissed; reopened as episode ${reopened.episode}.`
            : `The same problem is back; reopened as episode ${reopened.episode}.`,
          eventId: owner.event_id,
        });
        recorder.log({
          step: 'state',
          action: 'reopened',
          strategy: observation.strategy,
          service: observation.service,
          detection_id: detectionId,
          event_id: owner.event_id,
          message: `Reopened "${reopened.title}" (episode ${reopened.episode}): ${observation.title}.`,
        });
        return;
      }

      // Join proposals, in code, for open events this detection may belong to.
      const proposal: JoinProposal | undefined = proposeJoins({
        service: observation.service,
        at,
        openEvents: events.open(),
        dependencies,
        joinWindowMinutes: config.join_window_minutes,
      })[0];

      const agentCase = await buildCase({
        dataEsClient: scope.dataEsClient,
        signal,
        kind: proposal ? 'join' : 'new_event',
        detection: caseDetection,
        evidenceQuery: observation.evidence_esql,
        event: proposal?.event,
        proposal,
        firingAlerts,
        relatedServices,
        memory: await memoryFor([observation.fingerprint]),
      });
      const { answer, agentKind, corrections } = await agent.assess(agentCase);

      if (proposal) {
        recorder.log({
          step: 'join',
          action: answer.join_decision === 'confirm' ? 'confirmed' : 'vetoed',
          strategy: observation.strategy,
          service: observation.service,
          detection_id: detectionId,
          event_id: proposal.event.event_id,
          message: `Code proposed joining "${proposal.event.title}" (${
            proposal.reason
          }); the agent ${answer.join_decision === 'confirm' ? 'confirmed' : 'vetoed'}. ${
            answer.join_reason ?? ''
          }`.trim(),
        });
      }

      if (proposal && answer.join_decision === 'confirm') {
        const target = events.get(proposal.event.event_id) ?? proposal.event;
        const joined = recordAssessment({
          event: {
            ...target,
            updated_at: bucketEndIso > target.updated_at ? bucketEndIso : target.updated_at,
            services: [...new Set([...target.services, observation.service])],
            members: [
              ...target.members,
              toMember({
                observation,
                detectionId,
                threshold: baseline.threshold,
                at,
                joinReason: proposal.reason,
              }),
            ],
          },
          agentCase,
          answer,
          agentKind,
          corrections,
        });
        // A join never lowers the event's severity.
        events.set(
          { ...joined, severity: maxSeverity(joined.severity, target.severity) },
          'changed'
        );
        record({
          observation,
          baseline,
          detectionId,
          outcome: 'joined',
          reason: `Joined "${target.title}": ${proposal.reason}.`,
          eventId: target.event_id,
        });
        return;
      }

      const ownVerdict = answer.verdicts.find((verdict) => verdict.evidence_id === 'E1')?.verdict;
      if (ownVerdict === 'refutes') {
        record({
          observation,
          baseline,
          detectionId,
          outcome: 'refuted',
          reason: 'The agent found the evidence shows a healthy system; no event.',
        });
        recorder.log({
          step: 'agent',
          action: 'refuted',
          strategy: observation.strategy,
          service: observation.service,
          detection_id: detectionId,
          message: `${observation.title}: evidence refutes it, so code raised no event.`,
        });
        return;
      }

      const charged = openedToday.get(observation.strategy) ?? 0;
      if (charged >= strategyConfig.daily_cap) {
        record({
          observation,
          baseline,
          detectionId,
          outcome: 'capped',
          reason: `Daily cap of ${strategyConfig.daily_cap} new events reached for this strategy.`,
        });
        recorder.log({
          step: 'cap',
          action: 'capped',
          strategy: observation.strategy,
          service: observation.service,
          detection_id: detectionId,
          message: `${observation.title}: ${descriptor.name} reached its daily cap of ${strategyConfig.daily_cap}.`,
        });
        return;
      }

      const eventId = uuidv4();
      const created = recordAssessment({
        event: {
          event_id: eventId,
          space_id: scope.spaceId,
          title: observation.title,
          summary: observation.description,
          severity: 'medium',
          status: 'active',
          services: [observation.service],
          members: [
            toMember({
              observation,
              detectionId,
              threshold: baseline.threshold,
              at,
              joinReason: 'first detection',
            }),
          ],
          origin_strategy: observation.strategy,
          episode: 1,
          created_at: new Date().toISOString(),
          opened_at: at,
          updated_at: bucketEndIso,
          open_windows: [
            { from: at, raised_at: new Date().toISOString(), run_started_at: summary.started_at },
          ],
        },
        agentCase,
        answer,
        agentKind,
        corrections,
      });
      events.add(created);
      openedToday.set(observation.strategy, charged + 1);
      summary.transitions.push({ event_id: eventId, from: 'none', to: 'active' });
      record({
        observation,
        baseline,
        detectionId,
        outcome: 'new_event',
        reason: proposal
          ? `The agent vetoed joining "${proposal.event.title}"; opened a new event.`
          : 'Opened a new event.',
        eventId,
      });
      recorder.log({
        step: 'state',
        action: 'opened',
        strategy: observation.strategy,
        service: observation.service,
        detection_id: detectionId,
        event_id: eventId,
        message: `Opened "${created.title}" (${created.severity}).`,
      });
    },
  };
}
