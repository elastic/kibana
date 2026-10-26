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
  SignalOutcome,
  SignalStrategyId,
  EngineConfig,
  EngineSignal,
  EngineEvent,
  EngineSeverity,
  EventMember,
} from '../../../common';
import { BUCKET_MS, OPEN_EVENT_STATUSES } from '../../../common';
import { buildCase, ROWS_PER_EVIDENCE, runEvidence } from '../agent/build_case';
import { mentions } from '../agent/mentions';
import { createOpenEventSearch, type IOpenEventSearch } from '../agent/open_event_search';
import type { AgentAnswer, AgentCase, CaseSignal } from '../agent/types';
import { guardSeverity } from '../agent/validate_answer';
import type { PendingSignal, TaggedObservation } from '../domain';
import type { InvestigationPage } from '../learning/investigation_knowledge';
import type { MemoryKeys } from '../learning/memory';
import {
  type Dependency,
  dependenciesFor,
  type JoinProposal,
  proposeJoins,
} from '../pipeline/join_proposals';
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

function relatedServicesOf({
  service,
  sourceId,
  dependencies,
}: {
  service: string;
  sourceId?: string;
  dependencies: Dependency[];
}): string[] {
  return [
    ...new Set(
      dependenciesFor(dependencies, sourceId).flatMap((dependency) => {
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
  signalId,
  threshold,
  at,
  joinReason,
}: {
  observation: TaggedObservation;
  signalId: string;
  threshold?: number;
  at: string;
  joinReason: string;
}): EventMember {
  return {
    fingerprint: observation.fingerprint,
    strategy: observation.strategy,
    service: observation.service,
    title: observation.title,
    latest_signal_id: signalId,
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

/** Customer alerts firing in a bucket, which every case lists next to its signal. */
export interface FiringAlert {
  title: string;
  service: string;
}

/** The decisions after the baseline check, one signal at a time. */
export interface ITriageStep {
  /**
   * Decides what one signal does: continue, reopen, join, open, or nothing. The baseline
   * check already ran; `pending` signals come back here on a later run with their baseline.
   */
  process(params: {
    observation: TaggedObservation;
    baseline: BaselineSummary;
    firingAlerts: FiringAlert[];
    fromPending?: PendingSignal;
  }): Promise<void>;
  /** Records a signal the baseline check stopped. */
  recordBelowNormal(params: { observation: TaggedObservation; baseline: BaselineSummary }): void;
  /**
   * Records a signal above normal that has not looked off in enough of the last minutes yet.
   * It reaches triage once it has, a minute or two later.
   */
  recordUnconfirmed(params: {
    observation: TaggedObservation;
    baseline: BaselineSummary;
    lookedOff: number;
    confirmation: { need: number; of: number };
  }): void;
  /** Signals that waited for budget, to retry on the next run. */
  pending(): PendingSignal[];
}

/** Gives up on a signal that waited for budget this many runs. */
const MAX_PENDING_ATTEMPTS = 5;

/**
 * Code decides everything it can compute: identity, the dismissal hold, join proposals, the daily
 * cap and status. The agent checks evidence, rates severity, explains, and decides which open
 * event a signal joins: code's proposal, one the agent found with its event search, or none. Signals are handled one at a time on purpose: each decision can open an event the
 * next signal may join.
 */
export function createTriageStep({
  scope,
  config,
  recorder,
  events,
  dependencies,
  agent,
  openedToday,
  memoryFor,
  pagesFor,
  signal,
  maxPending,
  maxSignals,
  sourceTitles,
}: {
  scope: IEngineScope;
  config: EngineConfig;
  recorder: IRunRecorder;
  events: IEventWorkingSet;
  dependencies: Dependency[];
  agent: IAgentRunner;
  /** New events per origin strategy today, for the daily caps. Updated as events open. */
  openedToday: Map<SignalStrategyId, number>;
  memoryFor: (keys: MemoryKeys) => Promise<string[]>;
  /** What investigations learned about these services; context for the agent, never a label. */
  pagesFor: (services: string[]) => Promise<InvestigationPage[]>;
  signal: AbortSignal;
  maxPending: number;
  maxSignals: number;
  /** Source titles by id, so the agent can tell systems apart. */
  sourceTitles: Map<string, string>;
}): ITriageStep {
  const { summary } = recorder;
  const queued: PendingSignal[] = [];
  // Live: an event a signal opened earlier in this run is one the next signal can join.
  const sourceTitle = (sourceId: string | undefined) =>
    sourceId === undefined ? undefined : sourceTitles.get(sourceId);
  const openEventSearch = createOpenEventSearch({ openEvents: () => events.open(), sourceTitle });
  let aboveNormal = 0;

  const record = ({
    observation,
    baseline,
    signalId,
    outcome,
    reason,
    eventId,
  }: {
    observation: TaggedObservation;
    baseline: BaselineSummary;
    signalId: string;
    outcome: SignalOutcome;
    reason: string;
    eventId?: string;
  }) => {
    const at = new Date(observation.bucket_start).toISOString();
    const recorded: EngineSignal = {
      signal_id: signalId,
      '@timestamp': new Date(observation.bucket_start + BUCKET_MS).toISOString(),
      run_id: recorder.runId,
      strategy: observation.strategy,
      mode: observation.trial ? 'trial' : config.strategies[observation.strategy].mode,
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
    recorder.recordSignal(recorded);
  };

  const defer = ({
    observation,
    baseline,
    signalId,
    reason,
    fromPending,
  }: {
    observation: TaggedObservation;
    baseline: BaselineSummary;
    signalId: string;
    reason: string;
    fromPending?: PendingSignal;
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
      signalId,
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
      signal_id: signalId,
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

  const recordSupporting = ({
    observation,
    baseline,
    signalId,
  }: {
    observation: TaggedObservation;
    baseline: BaselineSummary;
    signalId: string;
  }) => {
    const reason =
      'Supporting evidence only: it joins an open event it belongs to, and no event fits.';
    record({ observation, baseline, signalId, outcome: 'supporting', reason });
    recorder.log({
      step: 'join',
      action: 'supporting',
      strategy: observation.strategy,
      service: observation.service,
      signal_id: signalId,
      message: `${observation.title}: ${reason}`,
    });
  };

  return {
    pending: () => queued,

    recordBelowNormal({ observation, baseline }) {
      const owner = events.ownerOf(observation.fingerprint);
      const signalId = uuidv4();
      const reason =
        baseline.decision === 'warming_up'
          ? `Warming up: ${baseline.samples} of ${config.baseline.min_samples} samples needed.`
          : baseline.reason
          ? `Background: ${baseline.reason}.`
          : `Within normal: ${formatMeasure(observation.value, observation.unit)} is not above ${
              baseline.threshold === undefined
                ? 'its threshold'
                : formatMeasure(baseline.threshold, observation.unit)
            }.`;
      record({
        observation,
        baseline,
        signalId,
        outcome: baseline.decision === 'warming_up' ? 'warming_up' : 'background',
        reason,
        eventId: owner && isOpen(owner) ? owner.event_id : undefined,
      });
      recorder.log({
        step: 'baseline',
        action: baseline.decision,
        strategy: observation.strategy,
        service: observation.service,
        signal_id: signalId,
        message: `${observation.title}: ${reason}`,
      });
    },

    recordUnconfirmed({ observation, baseline, lookedOff, confirmation }) {
      const signalId = uuidv4();
      const reason = `Above normal, but above its trigger in ${lookedOff} of the last ${confirmation.of} minutes; it needs ${confirmation.need} before it is more than chance.`;
      record({ observation, baseline, signalId, outcome: 'unconfirmed', reason });
      recorder.log({
        step: 'baseline',
        action: 'unconfirmed',
        strategy: observation.strategy,
        service: observation.service,
        signal_id: signalId,
        message: `${observation.title}: ${reason}`,
      });
    },

    async process({ observation, baseline, firingAlerts, fromPending }) {
      const strategyConfig = config.strategies[observation.strategy];
      const descriptor = STRATEGIES[observation.strategy].descriptor;
      const signalId = uuidv4();
      const at = new Date(observation.bucket_start).toISOString();
      const bucketEndIso = new Date(observation.bucket_start + BUCKET_MS).toISOString();
      const owner = events.ownerOf(observation.fingerprint);

      if (!fromPending) {
        recorder.log({
          step: 'baseline',
          action: baseline.decision,
          strategy: observation.strategy,
          service: observation.service,
          signal_id: signalId,
          message:
            baseline.decision === 'skipped'
              ? `${observation.title}: baseline check skipped, ${
                  baseline.reason ?? "the customer's rule already decided"
                }.`
              : baseline.reason
              ? `${observation.title}: above normal, ${baseline.reason}.`
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

      if (strategyConfig.mode === 'trial' || observation.trial) {
        record({
          observation,
          baseline,
          signalId,
          outcome: 'trial_would_raise',
          reason: 'Trial run: recorded what it would raise, raised nothing.',
        });
        recorder.log({
          step: 'trial',
          action: 'would_raise',
          strategy: observation.strategy,
          service: observation.service,
          signal_id: signalId,
          message: `Trial: ${observation.title} would have gone to triage.`,
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
                    latest_signal_id: signalId,
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
          signalId,
          outcome: 'continued',
          reason: `Continues event "${owner.title}".`,
          eventId: owner.event_id,
        });
        recorder.log({
          step: 'identity',
          action: 'continued',
          strategy: observation.strategy,
          service: observation.service,
          signal_id: signalId,
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
            signalId,
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
            signal_id: signalId,
            event_id: owner.event_id,
            message: `${observation.title} matches dismissed event "${owner.title}"; held until the problem gets worse.`,
          });
          return;
        }
      }

      aboveNormal += 1;
      if (aboveNormal > maxSignals) {
        defer({
          observation,
          baseline,
          signalId,
          fromPending,
          reason: `More than ${maxSignals} signals reached triage in this run`,
        });
        return;
      }
      // Out of model budget in this run, the heuristic decides now rather than a minute later.
      const busy = agent.unavailable();
      const assess = (agentCase: AgentCase, openEvents?: IOpenEventSearch) => {
        if (!busy) {
          return agent.assess(agentCase, { openEvents });
        }
        const reason =
          busy === 'run_budget'
            ? `the budget of ${config.max_agent_calls_per_run} model calls per run is used up`
            : 'the run has no time left for a model call';
        recorder.log({
          step: 'agent',
          action: 'heuristic_when_busy',
          strategy: observation.strategy,
          service: observation.service,
          signal_id: signalId,
          message: `${observation.title}: ${reason}, so the heuristic agent decided now instead of deferring to the next run.`,
        });
        return agent.assessWithoutModel(agentCase, reason);
      };

      const relatedServices = relatedServicesOf({
        service: observation.service,
        sourceId: observation.source_id,
        dependencies,
      });
      const caseSignal: CaseSignal = {
        fingerprint: observation.fingerprint,
        strategy: observation.strategy,
        service: observation.service,
        source: sourceTitle(observation.source_id),
        title: observation.title,
        description: observation.description,
        value: observation.value,
        unit: observation.unit,
        threshold: baseline.threshold,
        importance: observation.importance,
      };

      // Join proposals, in code, for open events this signal may belong to.
      const candidates = events.open().filter((event) => event.event_id !== owner?.event_id);
      // The signal's rows are read once, here, when code also looks for services they name.
      const ownEvidence =
        config.triage.evidence_named_joins && candidates.length > 0
          ? await runEvidence({
              esClient: scope.dataEsClient,
              query: observation.evidence_esql,
              signal,
            })
          : undefined;
      const shownRows = ownEvidence?.rows.slice(0, ROWS_PER_EVIDENCE) ?? [];
      const proposal: JoinProposal | undefined = proposeJoins({
        service: observation.service,
        sourceId: observation.source_id,
        at,
        openEvents: candidates,
        dependencies,
        joinWindowMinutes: config.join_window_minutes,
        namedServices: [...new Set(candidates.flatMap((event) => event.services))].filter(
          (service) => service !== observation.service && mentions(shownRows, service)
        ),
      })[0];

      // While its source's own silence event is open, a service's silence belongs to that
      // outage: in the lab, a source coming back service by service otherwise left the
      // slowest ones to open five events of their own.
      const sourceSilenceOpen =
        observation.fingerprint.startsWith('health:silence:') &&
        observation.source_id !== undefined &&
        events
          .open()
          .some((event) =>
            event.members.some(
              (member) => member.fingerprint === `health:source_silence:${observation.source_id}`
            )
          );
      // Supporting evidence joins an event someone else opened, and never opens one itself.
      if ((observation.supporting || sourceSilenceOpen) && !proposal) {
        recordSupporting({ observation, baseline, signalId });
        return;
      }

      /** Reopens the closed event that owns this series, as a new episode of it. */
      const reopen = async (
        closed: EngineEvent,
        {
          agentCase,
          answer,
          agentKind,
          corrections,
        }: {
          agentCase: AgentCase;
          answer: AgentAnswer;
          agentKind: AgentKind;
          corrections: string[];
        }
      ) => {
        const transition = nextEventStatus(closed.status, 'member_firing');
        const reopened = recordAssessment({
          event: {
            ...closed,
            status: transition.to,
            episode: closed.episode + 1,
            opened_at: at,
            updated_at: bucketEndIso,
            closed_at: undefined,
            close_reason: undefined,
            dismissal: undefined,
            verification: undefined,
            open_windows: [
              ...closed.open_windows,
              { from: at, raised_at: new Date().toISOString(), run_started_at: summary.started_at },
            ],
            members: closed.members.map((member) =>
              member.fingerprint === observation.fingerprint
                ? {
                    ...member,
                    value: observation.value,
                    peak_value: Math.max(member.peak_value, observation.value),
                    latest_signal_id: signalId,
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
          event_id: closed.event_id,
          from: closed.status,
          to: reopened.status,
        });
        record({
          observation,
          baseline,
          signalId,
          outcome: 'reopened',
          reason: closed.dismissal
            ? `Worse than when dismissed; reopened as episode ${reopened.episode}.`
            : `The same problem is back; reopened as episode ${reopened.episode}.`,
          eventId: closed.event_id,
        });
        recorder.log({
          step: 'state',
          action: 'reopened',
          strategy: observation.strategy,
          service: observation.service,
          signal_id: signalId,
          event_id: closed.event_id,
          message: `Reopened "${reopened.title}" (episode ${reopened.episode}): ${observation.title}.`,
        });
      };

      // A closed event's series is firing again. Grouping is decided again for this episode:
      // when another event is open for what may be the same incident, code proposes it; when
      // not, the agent decides whether this is the closed event's problem coming back or a
      // different one, so an event's old story is never carried into a new incident.
      const reopenCase = owner !== undefined && !proposal;
      const agentCase = await buildCase({
        dataEsClient: scope.dataEsClient,
        signal,
        kind: reopenCase ? 'reopen' : proposal ? 'join' : 'new_event',
        caseSignal,
        evidenceQuery: observation.evidence_esql,
        event: reopenCase ? owner : proposal?.event,
        proposal,
        firingAlerts,
        relatedServices,
        // A recurrence reads what was learned about its whole closed event.
        memory: await memoryFor({
          fingerprints: reopenCase
            ? owner!.members.map((member) => member.fingerprint)
            : [observation.fingerprint],
          services: reopenCase ? owner!.services : [observation.service],
        }),
        investigationPages: await pagesFor(reopenCase ? owner!.services : [observation.service]),
        sourceTitle,
        signalEvidence: ownEvidence,
      });
      const assessed = await assess(
        agentCase,
        // A reopen case is about one closed event; there is nothing to search for.
        config.triage.event_search && !reopenCase ? openEventSearch : undefined
      );
      const { answer, agentKind } = assessed;
      // In a reopen case, naming the closed event means it is the same problem coming back.
      const sameProblem =
        reopenCase &&
        (answer.join_event_id === owner!.event_id || !config.triage.regroup_recurrences);
      const chosen =
        answer.join_event_id === undefined || reopenCase
          ? undefined
          : events.get(answer.join_event_id);
      // The agent may name only an open event; a closed or unknown id opens a new event instead.
      const target = chosen && isOpen(chosen) ? chosen : undefined;
      const corrections =
        !reopenCase && answer.join_event_id !== undefined && !target
          ? [
              ...assessed.corrections,
              `The agent chose event ${answer.join_event_id}, which is not open; it did not join.`,
            ]
          : assessed.corrections;
      const joinsProposal = target !== undefined && target.event_id === proposal?.event.event_id;
      const joinReason = joinsProposal
        ? proposal!.reason
        : answer.join_reason ?? 'the agent found it part of this open event';

      if (proposal || target) {
        const action = joinsProposal
          ? 'confirmed'
          : target
          ? proposal
            ? 'redirected'
            : 'found'
          : 'vetoed';
        const outcomeText = joinsProposal
          ? 'the agent confirmed'
          : target
          ? `the agent joined "${target.title}" instead`
          : 'the agent vetoed';
        recorder.log({
          step: 'join',
          action,
          strategy: observation.strategy,
          service: observation.service,
          signal_id: signalId,
          event_id: target?.event_id ?? proposal?.event.event_id,
          message: (proposal
            ? `Code proposed joining "${proposal.event.title}" (${
                proposal.reason
              }); ${outcomeText}. ${answer.join_reason ?? ''}`
            : `The agent joined "${target!.title}", which code did not propose. ${
                answer.join_reason ?? ''
              }`
          ).trim(),
        });
      }

      if (target) {
        const joined = recordAssessment({
          event: {
            ...target,
            updated_at: bucketEndIso > target.updated_at ? bucketEndIso : target.updated_at,
            services: [...new Set([...target.services, observation.service])],
            members: [
              ...target.members,
              toMember({
                observation,
                signalId,
                threshold: baseline.threshold,
                at,
                joinReason,
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
          signalId,
          outcome: 'joined',
          reason: `Joined "${target.title}": ${joinReason}.`,
          eventId: target.event_id,
        });
        return;
      }

      // Checked before any reopen: evidence that shows a healthy system raises nothing, new or old.
      const ownVerdict = answer.verdicts.find((verdict) => verdict.evidence_id === 'E1')?.verdict;
      if (ownVerdict === 'refutes') {
        record({
          observation,
          baseline,
          signalId,
          outcome: 'refuted',
          reason: 'The agent found the evidence shows a healthy system; no event.',
        });
        recorder.log({
          step: 'agent',
          action: 'refuted',
          strategy: observation.strategy,
          service: observation.service,
          signal_id: signalId,
          message: `${observation.title}: evidence refutes it, so code raised no event.`,
        });
        return;
      }

      // The same problem is back, or the agent vetoed regrouping a recurrence: its own event
      // reopens, with this answer.
      // Reopening its own closed event is opening one, which supporting evidence never does.
      if (owner && observation.supporting) {
        recordSupporting({ observation, baseline, signalId });
        return;
      }
      if (owner && (sameProblem || !reopenCase)) {
        await reopen(owner, { agentCase, answer, agentKind, corrections });
        return;
      }
      if (owner) {
        recorder.log({
          step: 'identity',
          action: 'regrouped',
          strategy: observation.strategy,
          service: observation.service,
          signal_id: signalId,
          event_id: owner.event_id,
          message: `${observation.title} belonged to the closed event "${
            owner.title
          }", but the agent found a different problem; it opens a new event. ${
            answer.join_reason ?? ''
          }`.trim(),
        });
      }

      if (observation.supporting) {
        recordSupporting({ observation, baseline, signalId });
        return;
      }

      const charged = openedToday.get(observation.strategy) ?? 0;
      if (charged >= strategyConfig.daily_cap) {
        record({
          observation,
          baseline,
          signalId,
          outcome: 'capped',
          reason: `Daily cap of ${strategyConfig.daily_cap} new events reached for this strategy.`,
        });
        recorder.log({
          step: 'cap',
          action: 'capped',
          strategy: observation.strategy,
          service: observation.service,
          signal_id: signalId,
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
              signalId,
              threshold: baseline.threshold,
              at,
              joinReason: 'first signal',
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
        signalId,
        outcome: 'new_event',
        reason: proposal
          ? `The agent vetoed joining "${proposal.event.title}"; opened a new event.`
          : owner
          ? `A different problem than the closed event "${owner.title}"; opened a new event.`
          : 'Opened a new event.',
        eventId,
      });
      recorder.log({
        step: 'state',
        action: 'opened',
        strategy: observation.strategy,
        service: observation.service,
        signal_id: signalId,
        event_id: eventId,
        message: `Opened "${created.title}" (${created.severity}).`,
      });
    },
  };
}
