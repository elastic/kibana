/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { InferenceClient } from '@kbn/inference-common';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type {
  ActivityEntry,
  BaselineDecision,
  DetectionOutcome,
  DetectionStrategyId,
  EngineConfig,
  EngineDetection,
  EngineEvent,
  EngineRunSummary,
  EngineSeverity,
  EventMember,
  StrategyRunSummary,
} from '../../../common/detection_engine/types';
import { DETECTION_STRATEGY_IDS } from '../../../common/detection_engine/types';
import type { KnowledgeIndicatorClient } from '../knowledge_indicators/knowledge_indicator_client';
import type { RuleEventsClient } from '../significant_events/events/rule_events_client';
import { buildCase, runEvidence } from './agent/build_case';
import { createHeuristicAgent } from './agent/heuristic_agent';
import { createLlmAgent } from './agent/llm_agent';
import type { AgentAnswer, AgentCase, IDiscoveryAgent } from './agent/types';
import { guardSeverity, validateAnswer } from './agent/validate_answer';
import type { PriceResult } from '../cost/price_service';
import { checkBaseline } from './baseline';
import { addToLedger, emptyLedger, resolveModelKey } from './cost';
import { type Dependency, type JoinProposal, proposeJoins } from './join_proposals';
import { publishToAlertingV2 } from './publish';
import { deriveEventInput, nextEventStatus } from './state_machine';
import type { EngineStorage } from './storage';
import { STRATEGIES } from './strategies/strategy_registry';
import type { StrategyContext, StrategyObservation } from './strategies/types';

/** Everything one engine run needs, scoped to the request's user and space. */
export interface EngineDependencies {
  storage: EngineStorage;
  dataEsClient: ElasticsearchClient;
  esClient: ElasticsearchClient;
  spaceId: string;
  sources: NightshiftSource[];
  getKnowledgeIndicatorClient: () => Promise<KnowledgeIndicatorClient>;
  inferenceClient: InferenceClient;
  getRuleEventsClient: () => Promise<RuleEventsClient>;
  /** Elastic Inference Service list prices, from the plugin's price catalog. */
  getPrices: () => Promise<PriceResult | null>;
  logger: Logger;
}

type ActivityInput = Omit<ActivityEntry, 'space_id' | '@timestamp'>;

interface TaggedObservation extends StrategyObservation {
  strategy: DetectionStrategyId;
}

const SEVERITY_RANK: Record<EngineSeverity, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const OPEN_STATUSES = ['active', 'recovering'];
/**
 * How far back the baseline check reads. Longer than its sample window, so it still finds
 * normal samples once the buckets of a long open incident are left out.
 */
const HISTORY_LOOKBACK_MS = 6 * 60 * 60_000;
/** Events closed this recently are re-checked by the verifier. */
const VERIFY_CLOSE_WITHIN_BUCKETS = 10;

function maxSeverity(a: EngineSeverity, b: EngineSeverity): EngineSeverity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

function emptyBaselineCounts(): Record<BaselineDecision, number> {
  return { above_normal: 0, background: 0, warming_up: 0, skipped: 0 };
}

function formatNumber(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

function startOfUtcDay(timestamp: number): string {
  const day = new Date(timestamp);
  day.setUTCHours(0, 0, 0, 0);
  return day.toISOString();
}

/** Reads service dependencies from knowledge, for join proposals and related services. */
export async function readDependencies(deps: EngineDependencies): Promise<Dependency[]> {
  if (deps.sources.length === 0) {
    return [];
  }
  try {
    const kiClient = await deps.getKnowledgeIndicatorClient();
    const { hits } = await kiClient.getFeatures(
      deps.sources.map((source) => source.id),
      { type: ['dependency'] }
    );
    return hits.flatMap((feature) => {
      const { source, target } = feature.properties as { source?: unknown; target?: unknown };
      return typeof source === 'string' && typeof target === 'string' ? [{ source, target }] : [];
    });
  } catch (error) {
    deps.logger.debug(`Detection engine could not read dependencies: ${error}`);
    return [];
  }
}

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

function createAgent(deps: EngineDependencies, config: EngineConfig): IDiscoveryAgent {
  if (config.agent.kind === 'llm' && config.agent.connector_id) {
    return createLlmAgent({
      inferenceClient: deps.inferenceClient,
      connectorId: config.agent.connector_id,
    });
  }
  return createHeuristicAgent();
}

/** Runs strategies over [from, to) and returns their observations and per-strategy summaries. */
async function evaluateStrategies({
  deps,
  config,
  from,
  to,
  bucketMs,
  replay,
}: {
  deps: EngineDependencies;
  config: EngineConfig;
  from: number;
  to: number;
  bucketMs: number;
  replay: boolean;
}): Promise<{
  observations: TaggedObservation[];
  summaries: StrategyRunSummary[];
  notes: ActivityInput[];
}> {
  const context: StrategyContext = {
    dataEsClient: deps.dataEsClient,
    esClient: deps.esClient,
    spaceId: deps.spaceId,
    sources: deps.sources,
    getKnowledgeIndicatorClient: deps.getKnowledgeIndicatorClient,
    from,
    to,
    bucketMs,
    logger: deps.logger,
  };

  const enabled = DETECTION_STRATEGY_IDS.filter(
    (id) =>
      config.strategies[id].mode !== 'off' && (!replay || STRATEGIES[id].descriptor.supportsReplay)
  );

  const results = await Promise.all(
    enabled.map(async (id) => {
      const started = Date.now();
      try {
        const { observations, notes } = await STRATEGIES[id].evaluate(context);
        return {
          id,
          observations: observations.map((observation) => ({ ...observation, strategy: id })),
          summary: {
            strategy: id,
            mode: config.strategies[id].mode,
            observations: observations.length,
            looked_off: observations.filter((observation) => observation.looks_off).length,
            duration_ms: Date.now() - started,
          },
          notes,
        };
      } catch (error) {
        // One failing strategy never stops the others.
        return {
          id,
          observations: [],
          summary: {
            strategy: id,
            mode: config.strategies[id].mode,
            observations: 0,
            looked_off: 0,
            duration_ms: Date.now() - started,
            error: (error as Error).message,
          },
          notes: [],
        };
      }
    })
  );

  return {
    observations: results.flatMap((result) => result.observations),
    summaries: results.map((result) => result.summary),
    notes: results.flatMap((result) => [
      ...result.notes.map(
        (note): ActivityInput => ({
          step: 'strategy',
          action: 'note',
          strategy: result.id,
          message: note,
        })
      ),
      ...(result.summary.error
        ? [
            {
              step: 'strategy' as const,
              action: 'failed',
              strategy: result.id,
              message: `${STRATEGIES[result.id].descriptor.name} failed: ${result.summary.error}`,
            },
          ]
        : []),
    ]),
  };
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

/**
 * One engine run over the last complete bucket. Code decides everything it can compute: the
 * baseline check, identity, join proposals, status and cooldown. The agent checks evidence,
 * rates severity, explains, and confirms or vetoes joins.
 */
export async function runEngine(
  deps: EngineDependencies,
  { now = Date.now() }: { now?: number } = {}
): Promise<EngineRunSummary> {
  const { storage } = deps;
  await storage.ensure();
  const config = await storage.getConfig();
  const bucketMs = config.bucket_minutes * 60_000;
  const bucketEnd = Math.floor(now / bucketMs) * bucketMs;
  const bucketStart = bucketEnd - bucketMs;
  const bucketStartIso = new Date(bucketStart).toISOString();
  const bucketEndIso = new Date(bucketEnd).toISOString();
  const runId = uuidv4();
  const startedAt = new Date().toISOString();

  const summary: EngineRunSummary = {
    run_id: runId,
    started_at: startedAt,
    finished_at: startedAt,
    bucket_start: bucketStartIso,
    bucket_end: bucketEndIso,
    strategies: [],
    detections: 0,
    baseline: emptyBaselineCounts(),
    outcomes: {},
    agent: {
      calls: 0,
      cooldown_skips: 0,
      rejected_answers: 0,
      failures: 0,
      tokens: 0,
      cost_usd: 0,
    },
    transitions: [],
    open_events: 0,
  };

  const lastRun = await storage.getState('last_run');
  if (lastRun?.last_evaluated_bucket_end && lastRun.last_evaluated_bucket_end >= bucketEndIso) {
    // Evaluating a bucket twice would advance health streaks twice.
    return {
      ...summary,
      skipped: `The bucket ending ${bucketEndIso} was already evaluated; the next one completes at ${new Date(
        bucketEnd + bucketMs
      ).toISOString()}.`,
    };
  }

  const activity: ActivityInput[] = [];
  const log = (entry: Omit<ActivityInput, 'run_id'>) => activity.push({ ...entry, run_id: runId });

  // 1. Strategies watch the data and report observations in the common format.
  const evaluation = await evaluateStrategies({
    deps,
    config,
    from: bucketStart,
    to: bucketEnd,
    bucketMs,
    replay: false,
  });
  summary.strategies = evaluation.summaries;
  evaluation.notes.forEach((note) => log(note));
  evaluation.summaries.forEach((strategySummary) =>
    log({
      step: 'strategy',
      action: 'evaluated',
      strategy: strategySummary.strategy,
      message: `${STRATEGIES[strategySummary.strategy].descriptor.name} (${
        strategySummary.mode
      }) evaluated ${strategySummary.observations} series; ${
        strategySummary.looked_off
      } looked off.`,
      details: { duration_ms: strategySummary.duration_ms },
    })
  );
  const failedStrategies = new Set(
    evaluation.summaries.filter((item) => item.error).map((item) => item.strategy)
  );
  const ranStrategies = new Set(evaluation.summaries.map((item) => item.strategy));

  await storage.writeObservations(
    evaluation.observations.map((observation) => ({
      run_id: runId,
      strategy: observation.strategy,
      fingerprint: observation.fingerprint,
      service: observation.service,
      bucket_start: new Date(observation.bucket_start).toISOString(),
      value: observation.value,
      looks_off: observation.looks_off,
      mode: 'live',
    }))
  );

  const firing = evaluation.observations.filter((observation) => observation.looks_off);
  const observationsByFingerprint = new Map(
    evaluation.observations.map((observation) => [observation.fingerprint, observation])
  );

  // 2. Load what discovery needs: open events, and any event that owns a firing series.
  const [openEvents, ownerEvents, dependencies, allEvents] = await Promise.all([
    storage.searchEvents({ statuses: OPEN_STATUSES }),
    storage.searchEvents({ fingerprints: firing.map((observation) => observation.fingerprint) }),
    readDependencies(deps),
    storage.searchEvents({ size: 1000 }),
  ]);
  const events = new Map<string, EngineEvent>(
    [...allEvents, ...ownerEvents, ...openEvents].map((event) => [event.event_id, event])
  );
  const eventOwning = (fingerprint: string): EngineEvent | undefined =>
    [...events.values()]
      .filter((event) => event.members.some((member) => member.fingerprint === fingerprint))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];

  const dayStart = startOfUtcDay(bucketStart);
  const openedToday = new Map<DetectionStrategyId, number>();
  [...events.values()]
    .filter((event) => event.created_at >= dayStart)
    .forEach((event) =>
      openedToday.set(event.origin_strategy, (openedToday.get(event.origin_strategy) ?? 0) + 1)
    );

  // 3. Verifier: re-check events opened or closed by earlier runs.
  await verifyRecentEvents({ deps, events, observationsByFingerprint, bucketStart, bucketMs, log });

  // 4. Baseline check, in code, against each series' own history.
  const history = await storage.readHistory({
    fingerprints: firing.map((observation) => observation.fingerprint),
    from: new Date(
      bucketStart - Math.max(config.baseline.history_buckets * bucketMs, HISTORY_LOOKBACK_MS)
    ).toISOString(),
    to: bucketStartIso,
  });

  const firingCustomerAlerts = firing
    .filter((observation) => observation.strategy === 'customer_alerts')
    .map((observation) => ({ title: observation.title, service: observation.service }));

  const agent = createAgent(deps, config);
  const fallbackAgent = createHeuristicAgent();
  const touched = new Map<string, 'facts' | 'changed'>();
  const detections: EngineDetection[] = [];
  const gateByFingerprint = new Map<string, BaselineDecision>();

  const assess = async (
    agentCase: AgentCase
  ): Promise<{
    answer: AgentAnswer;
    agentKind: IDiscoveryAgent['kind'];
    corrections: string[];
  }> => {
    summary.agent.calls += 1;
    const subject = agentCase.event?.event_id;
    try {
      const raw = await agent.assess(agentCase);
      const validated = validateAnswer(agentCase, raw);
      if (validated.ok) {
        return {
          answer: validated.answer,
          agentKind: agent.kind,
          corrections: validated.corrections,
        };
      }
      summary.agent.rejected_answers += 1;
      log({
        step: 'agent',
        action: 'answer_rejected',
        event_id: subject,
        message: `Rejected the ${agent.kind} agent's answer: ${validated.reason}. Fell back to the heuristic agent.`,
      });
    } catch (error) {
      summary.agent.failures += 1;
      log({
        step: 'agent',
        action: 'failed',
        event_id: subject,
        message: `The ${agent.kind} agent failed: ${
          (error as Error).message
        }. Fell back to the heuristic agent.`,
      });
    }
    const fallback = validateAnswer(agentCase, await fallbackAgent.assess(agentCase));
    if (!fallback.ok) {
      throw new Error(`Heuristic agent produced an invalid answer: ${fallback.reason}`);
    }
    return { answer: fallback.answer, agentKind: 'heuristic', corrections: fallback.corrections };
  };

  const memoryFor = async (fingerprints: string[]): Promise<string[]> => {
    const notes = await Promise.all(
      fingerprints.map((fingerprint) => storage.getState('memory', fingerprint))
    );
    return notes.flatMap((note) => note?.notes ?? []);
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
    agentKind: IDiscoveryAgent['kind'];
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
        connector_id: agentKind === 'llm' ? config.agent.connector_id : undefined,
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

  // Most important first, so a strong signal opens the event weaker ones may join.
  const ordered = [...firing].sort((a, b) => b.importance - a.importance);

  for (const observation of ordered) {
    // Sequential on purpose: each decision can open an event the next detection may join.
    const strategyConfig = config.strategies[observation.strategy];
    const descriptor = STRATEGIES[observation.strategy].descriptor;
    const owner = eventOwning(observation.fingerprint);
    const baseline = checkBaseline({
      value: observation.value,
      unit: observation.unit,
      policy: descriptor.baselinePolicy,
      history: history.get(observation.fingerprint) ?? [],
      excludeWindows: owner?.open_windows ?? [],
      settings: config.baseline,
    });
    summary.baseline[baseline.decision] += 1;
    gateByFingerprint.set(observation.fingerprint, baseline.decision);

    const detectionId = uuidv4();
    const at = new Date(observation.bucket_start).toISOString();
    const record = (outcome: DetectionOutcome, reason: string, eventId?: string) => {
      summary.outcomes[outcome] = (summary.outcomes[outcome] ?? 0) + 1;
      detections.push({
        detection_id: detectionId,
        '@timestamp': bucketEndIso,
        space_id: deps.spaceId,
        run_id: runId,
        strategy: observation.strategy,
        fingerprint: observation.fingerprint,
        service: observation.service,
        title: observation.title,
        description: observation.description,
        since: observation.since ?? at,
        bucket_start: at,
        bucket_end: new Date(observation.bucket_start + bucketMs).toISOString(),
        value: observation.value,
        unit: observation.unit,
        importance: observation.importance,
        evidence_esql: observation.evidence_esql,
        source_id: observation.source_id,
        baseline,
        outcome,
        outcome_reason: reason,
        event_id: eventId,
      });
    };

    if (baseline.decision === 'background' || baseline.decision === 'warming_up') {
      const reason =
        baseline.decision === 'warming_up'
          ? `Warming up: ${baseline.samples} of ${config.baseline.min_samples} samples needed.`
          : `Within normal: ${observation.value} ${
              observation.unit
            } is not above ${baseline.threshold?.toFixed(3)}.`;
      record(
        baseline.decision,
        reason,
        owner && OPEN_STATUSES.includes(owner.status) ? owner.event_id : undefined
      );
      log({
        step: 'baseline',
        action: baseline.decision,
        strategy: observation.strategy,
        service: observation.service,
        detection_id: detectionId,
        message: `${observation.title}: ${reason}`,
      });
      continue;
    }

    log({
      step: 'baseline',
      action: baseline.decision,
      strategy: observation.strategy,
      service: observation.service,
      detection_id: detectionId,
      message:
        baseline.decision === 'skipped'
          ? `${observation.title}: the customer's rule already decided; baseline check skipped.`
          : `${observation.title}: above normal (${observation.value} ${
              observation.unit
            } > ${baseline.threshold?.toFixed(3)}, median ${baseline.median?.toFixed(3)} over ${
              baseline.samples
            } samples).`,
    });

    if (strategyConfig.mode === 'trial') {
      record('trial_would_raise', 'Trial run: recorded what it would raise, raised nothing.');
      log({
        step: 'trial',
        action: 'would_raise',
        strategy: observation.strategy,
        service: observation.service,
        detection_id: detectionId,
        message: `Trial: ${observation.title} would have gone to discovery.`,
      });
      continue;
    }

    // 5. Identity: the same problem continues the same event.
    if (owner && OPEN_STATUSES.includes(owner.status)) {
      const updated: EngineEvent = {
        ...owner,
        updated_at: bucketEndIso,
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
                last_seen: at,
              }
            : member
        ),
      };
      events.set(owner.event_id, updated);
      if (!touched.has(owner.event_id)) {
        touched.set(owner.event_id, 'facts');
      }
      record('continued', `Continues event "${owner.title}".`, owner.event_id);
      log({
        step: 'identity',
        action: 'continued',
        strategy: observation.strategy,
        service: observation.service,
        detection_id: detectionId,
        event_id: owner.event_id,
        message: `${observation.title} continues the open event "${owner.title}".`,
      });
      continue;
    }

    const relatedServices = relatedServicesOf(observation.service, dependencies);
    const caseDetection = {
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
      // A closed event's problem is back. A dismissed one stays quiet until it is worse.
      const dismissedValue = owner.dismissal?.values[observation.fingerprint];
      if (
        owner.dismissal &&
        (dismissedValue === undefined ||
          observation.value <= dismissedValue * (1 + config.worse_margin))
      ) {
        record(
          'held_by_dismissal',
          `Dismissed as ${owner.dismissal.reason}; ${formatNumber(
            observation.value
          )} is not worse than ${
            dismissedValue === undefined ? 'the dismissed value' : formatNumber(dismissedValue)
          } by ${config.worse_margin * 100}%.`,
          owner.event_id
        );
        log({
          step: 'identity',
          action: 'held_by_dismissal',
          strategy: observation.strategy,
          service: observation.service,
          detection_id: detectionId,
          event_id: owner.event_id,
          message: `${observation.title} matches dismissed event "${owner.title}"; held until the problem gets worse.`,
        });
        continue;
      }
      if (summary.agent.calls >= config.max_agent_calls_per_run) {
        record('deferred', 'Agent budget for this run is used up; retried next run.');
        continue;
      }
      const agentCase = await buildCase({
        dataEsClient: deps.dataEsClient,
        kind: 'reopen',
        detection: caseDetection,
        evidenceQuery: observation.evidence_esql,
        event: owner,
        firingAlerts: firingCustomerAlerts,
        relatedServices,
        memory: await memoryFor(owner.members.map((member) => member.fingerprint)),
      });
      const { answer, agentKind, corrections } = await assess(agentCase);
      const transition = nextEventStatus(owner.status, 'member_firing');
      const reopened = recordAssessment({
        event: {
          ...owner,
          status: transition.to,
          episode: owner.episode + 1,
          opened_at: bucketStartIso,
          updated_at: bucketEndIso,
          closed_at: undefined,
          close_reason: undefined,
          dismissal: undefined,
          verification: undefined,
          open_windows: [...owner.open_windows, { from: bucketStartIso }],
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
      events.set(owner.event_id, reopened);
      touched.set(owner.event_id, 'changed');
      summary.transitions.push({
        event_id: owner.event_id,
        from: owner.status,
        to: reopened.status,
      });
      record(
        'reopened',
        owner.dismissal
          ? `Worse than when dismissed; reopened as episode ${reopened.episode}.`
          : `The same problem is back; reopened as episode ${reopened.episode}.`,
        owner.event_id
      );
      log({
        step: 'state',
        action: 'reopened',
        strategy: observation.strategy,
        service: observation.service,
        detection_id: detectionId,
        event_id: owner.event_id,
        message: `Reopened "${reopened.title}" (episode ${reopened.episode}): ${observation.title}.`,
      });
      continue;
    }

    // 6. Join proposals, in code, for open events this detection may belong to.
    const proposals: JoinProposal[] = proposeJoins({
      service: observation.service,
      at: bucketStartIso,
      openEvents: [...events.values()].filter((event) => OPEN_STATUSES.includes(event.status)),
      dependencies,
      joinWindowMinutes: config.join_window_minutes,
    });
    const proposal = proposals[0];

    if (summary.agent.calls >= config.max_agent_calls_per_run) {
      record('deferred', 'Agent budget for this run is used up; retried next run.');
      log({
        step: 'agent',
        action: 'deferred',
        strategy: observation.strategy,
        detection_id: detectionId,
        message: `${observation.title}: agent budget used up, waiting for the next run.`,
      });
      continue;
    }

    const agentCase = await buildCase({
      dataEsClient: deps.dataEsClient,
      kind: proposal ? 'join' : 'new_event',
      detection: caseDetection,
      evidenceQuery: observation.evidence_esql,
      event: proposal?.event,
      proposal,
      firingAlerts: firingCustomerAlerts,
      relatedServices,
      memory: await memoryFor([observation.fingerprint]),
    });
    const { answer, agentKind, corrections } = await assess(agentCase);

    if (proposal) {
      log({
        step: 'join',
        action: answer.join_decision === 'confirm' ? 'confirmed' : 'vetoed',
        strategy: observation.strategy,
        service: observation.service,
        detection_id: detectionId,
        event_id: proposal.event.event_id,
        message: `Code proposed joining "${proposal.event.title}" (${proposal.reason}); the agent ${
          answer.join_decision === 'confirm' ? 'confirmed' : 'vetoed'
        }. ${answer.join_reason ?? ''}`.trim(),
      });
    }

    if (proposal && answer.join_decision === 'confirm') {
      const target = events.get(proposal.event.event_id) ?? proposal.event;
      const joined = recordAssessment({
        event: {
          ...target,
          updated_at: bucketEndIso,
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
      events.set(target.event_id, {
        ...joined,
        severity: maxSeverity(joined.severity, target.severity),
      });
      touched.set(target.event_id, 'changed');
      record('joined', `Joined "${target.title}": ${proposal.reason}.`, target.event_id);
      continue;
    }

    const ownVerdict = answer.verdicts.find((verdict) => verdict.evidence_id === 'E1')?.verdict;
    if (ownVerdict === 'refutes') {
      record('refuted', 'The agent found the evidence shows a healthy system; no event.');
      log({
        step: 'agent',
        action: 'refuted',
        strategy: observation.strategy,
        service: observation.service,
        detection_id: detectionId,
        message: `${observation.title}: evidence refutes it, so code raised no event.`,
      });
      continue;
    }

    const charged = openedToday.get(observation.strategy) ?? 0;
    if (charged >= strategyConfig.daily_cap) {
      record(
        'capped',
        `Daily cap of ${strategyConfig.daily_cap} new events reached for this strategy.`
      );
      log({
        step: 'cap',
        action: 'capped',
        strategy: observation.strategy,
        service: observation.service,
        detection_id: detectionId,
        message: `${observation.title}: ${descriptor.name} reached its daily cap of ${strategyConfig.daily_cap}.`,
      });
      continue;
    }

    const eventId = uuidv4();
    const created = recordAssessment({
      event: {
        event_id: eventId,
        space_id: deps.spaceId,
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
        created_at: bucketEndIso,
        opened_at: bucketStartIso,
        updated_at: bucketEndIso,
        open_windows: [{ from: bucketStartIso }],
      },
      agentCase,
      answer,
      agentKind,
      corrections,
    });
    events.set(eventId, created);
    touched.set(eventId, 'changed');
    openedToday.set(observation.strategy, charged + 1);
    summary.transitions.push({ event_id: eventId, from: 'none', to: 'active' });
    record(
      'new_event',
      proposal
        ? `The agent vetoed joining "${proposal.event.title}"; opened a new event.`
        : 'Opened a new event.',
      eventId
    );
    log({
      step: 'state',
      action: 'opened',
      strategy: observation.strategy,
      service: observation.service,
      detection_id: detectionId,
      event_id: eventId,
      message: `Opened "${created.title}" (${created.severity}).`,
    });
  }

  // 7. Status, in code, for every open event that existed before this run's openings.
  const lifecycleUpdates = [...events.values()]
    .filter(
      (event) =>
        OPEN_STATUSES.includes(event.status) &&
        !summary.transitions.some(
          (transition) => transition.event_id === event.event_id && transition.from === 'none'
        )
    )
    .map((event) => {
      const members = event.members.map((member) => {
        const observation = observationsByFingerprint.get(member.fingerprint);
        const descriptor = STRATEGIES[member.strategy].descriptor;
        const gate = gateByFingerprint.get(member.fingerprint);
        const health: 'firing' | 'healthy' | 'unknown' = observation
          ? !observation.looks_off || gate === 'background'
            ? 'healthy'
            : gate === 'above_normal' || gate === 'skipped'
            ? 'firing'
            : // Still warming up: the baseline cannot say, and that never proves recovery.
              'unknown'
          : descriptor.reportsOnlyFiring &&
            ranStrategies.has(member.strategy) &&
            !failedStrategies.has(member.strategy)
          ? 'healthy'
          : 'unknown';
        const healthyStreak = health === 'healthy' ? member.healthy_streak + 1 : 0;
        return {
          member: {
            ...member,
            healthy: health === 'healthy',
            healthy_streak: healthyStreak,
            value: observation?.value ?? member.value,
          },
          health,
          healthyStreak,
        };
      });
      const input = deriveEventInput({
        members,
        quietPeriodBuckets: config.quiet_period_buckets,
      });
      const transition = nextEventStatus(event.status, input);
      const next: EngineEvent = {
        ...event,
        members: members.map((item) => item.member),
        status: transition.to,
      };
      if (transition.to !== event.status) {
        next.updated_at = bucketEndIso;
        if (transition.to === 'inactive') {
          next.closed_at = bucketEndIso;
          next.close_reason = transition.closeReason;
          next.verification = undefined;
          next.open_windows = event.open_windows.map((window, index) =>
            index === event.open_windows.length - 1 ? { ...window, to: bucketEndIso } : window
          );
        }
        summary.transitions.push({
          event_id: event.event_id,
          from: event.status,
          to: transition.to,
        });
        touched.set(event.event_id, 'changed');
        log({
          step: 'state',
          action: `${event.status}_to_${transition.to}`,
          event_id: event.event_id,
          message: `"${event.title}": ${event.status} -> ${transition.to} (${input.replace(
            /_/g,
            ' '
          )}).`,
        });
      }
      return next;
    });
  lifecycleUpdates.forEach((event) => events.set(event.event_id, event));

  // 8. Cooldown: events that only got fresh facts get no agent call.
  [...touched.entries()]
    .filter(([, change]) => change === 'facts')
    .forEach(([eventId]) => {
      summary.agent.cooldown_skips += 1;
      log({
        step: 'agent',
        action: 'cooldown',
        event_id: eventId,
        message:
          'Nothing new joined and the problem did not return; facts updated, agent not called.',
      });
    });

  // 9. Persist, then hand off: publish changed events as Alerting v2 alerts.
  const changedIds = [...touched.entries()]
    .filter(([, change]) => change === 'changed')
    .map(([eventId]) => eventId);
  const persistIds = new Set([
    ...touched.keys(),
    ...lifecycleUpdates.map((event) => event.event_id),
  ]);

  if (config.publish_to_alerting_v2 && changedIds.length > 0) {
    const ruleEventsClient = await deps.getRuleEventsClient();
    await Promise.all(
      changedIds.map(async (eventId) => {
        const event = events.get(eventId)!;
        try {
          await publishToAlertingV2({ ruleEventsClient, event });
          events.set(eventId, { ...event, published: { at: new Date().toISOString(), ok: true } });
          log({
            step: 'publish',
            action: 'published',
            event_id: eventId,
            message: `Published "${event.title}" (${event.status}) to .rule-events as an Alerting v2 alert.`,
          });
        } catch (error) {
          events.set(eventId, {
            ...event,
            published: { at: new Date().toISOString(), ok: false, error: (error as Error).message },
          });
          log({
            step: 'publish',
            action: 'failed',
            event_id: eventId,
            message: `Publishing "${event.title}" failed: ${(error as Error).message}`,
          });
        }
      })
    );
  }

  await Promise.all([...persistIds].map((eventId) => storage.putEvent(events.get(eventId)!)));
  await storage.writeDetections(detections);

  // Only the model agent spends tokens; the heuristic fallback is free.
  const usage = agent.usage();
  summary.agent.tokens = usage.prompt + usage.completion;
  if (summary.agent.tokens > 0 && agent.connectorId) {
    const [model, prices, current] = await Promise.all([
      resolveModelKey({ inferenceClient: deps.inferenceClient, connectorId: agent.connectorId }),
      deps.getPrices(),
      storage.getState('cost'),
    ]);
    const { ledger, costUsd } = addToLedger({
      ledger: current ?? emptyLedger(startedAt),
      usage,
      calls: summary.agent.calls - summary.agent.failures,
      model,
      prices,
      now: startedAt,
    });
    await storage.putState('cost', ledger);
    summary.agent.cost_usd = costUsd;
    summary.agent.model = model;
    log({
      step: 'agent',
      action: 'cost',
      message:
        costUsd === null
          ? `The agent used ${summary.agent.tokens} tokens on ${model}, which has no list price; not added to the cost.`
          : `The agent used ${summary.agent.tokens} tokens on ${model}: $${costUsd.toFixed(
              4
            )} at Elastic Inference Service list price. Total so far: $${ledger.total_usd.toFixed(
              4
            )}.`,
    });
  }
  summary.detections = detections.length;
  summary.open_events = [...events.values()].filter((event) =>
    OPEN_STATUSES.includes(event.status)
  ).length;
  summary.finished_at = new Date().toISOString();

  log({
    step: 'run',
    action: 'finished',
    message: `Run over ${bucketStartIso} - ${bucketEndIso}: ${detections.length} detections, ${summary.agent.calls} agent call(s), ${summary.transitions.length} status change(s), ${summary.open_events} open event(s).`,
  });
  await storage.appendActivity(
    activity.map((entry) => ({ ...entry, '@timestamp': summary.finished_at }))
  );
  await storage.putState('last_run', { ...summary, last_evaluated_bucket_end: bucketEndIso });
  await storage.refresh();

  return summary;
}

/**
 * The Verifier: after an event opens, re-run its evidence to check the conclusion still holds;
 * after the engine closes one, check it stays healthy. Both only record; they never change status.
 */
async function verifyRecentEvents({
  deps,
  events,
  observationsByFingerprint,
  bucketStart,
  bucketMs,
  log,
}: {
  deps: EngineDependencies;
  events: Map<string, EngineEvent>;
  observationsByFingerprint: Map<string, TaggedObservation>;
  bucketStart: number;
  bucketMs: number;
  log: (entry: Omit<ActivityInput, 'run_id'>) => void;
}): Promise<void> {
  const bucketStartIso = new Date(bucketStart).toISOString();
  const toVerifyOpened = [...events.values()].filter(
    (event) =>
      OPEN_STATUSES.includes(event.status) &&
      !event.verification &&
      event.opened_at < bucketStartIso
  );
  const toVerifyClosed = [...events.values()].filter(
    (event) =>
      event.status === 'inactive' &&
      event.close_reason === 'recovered' &&
      !event.verification &&
      event.closed_at !== undefined &&
      Date.parse(event.closed_at) >= bucketStart - VERIFY_CLOSE_WITHIN_BUCKETS * bucketMs
  );

  const verifiedOpened = await Promise.all(
    toVerifyOpened.map(async (event) => {
      const results = await Promise.all(
        event.members.map((member) => runEvidence(deps.dataEsClient, member.evidence_esql))
      );
      const holds = results.some(
        (result, index) =>
          result.result === 'found' ||
          (event.members[index].unit === 'drop' && result.result === 'empty')
      );
      return {
        event,
        verification: {
          at: new Date().toISOString(),
          trigger: 'opened' as const,
          holds,
          details: holds
            ? `Re-ran ${results.length} evidence query(ies); the problem is still visible.`
            : `Re-ran ${results.length} evidence query(ies); none returned rows. The conclusion may not hold.`,
        },
      };
    })
  );

  const verifiedClosed = toVerifyClosed.map((event) => {
    const refiring = event.members.filter(
      (member) => observationsByFingerprint.get(member.fingerprint)?.looks_off
    );
    const holds = refiring.length === 0;
    return {
      event,
      verification: {
        at: new Date().toISOString(),
        trigger: 'closed' as const,
        holds,
        details: holds
          ? 'After closing, every member stayed healthy in the next bucket.'
          : `After closing, ${refiring
              .map((member) => member.title)
              .join(', ')} looked off again: the close may have been early.`,
      },
    };
  });

  [...verifiedOpened, ...verifiedClosed].forEach(({ event, verification }) => {
    events.set(event.event_id, { ...event, verification });
    log({
      step: 'verifier',
      action: verification.holds ? 'holds' : 'does_not_hold',
      event_id: event.event_id,
      message: `Verifier (${verification.trigger}) on "${event.title}": ${verification.details}`,
    });
  });

  // Verified events must be persisted even when nothing else touched them.
  await Promise.all(
    [...verifiedOpened, ...verifiedClosed].map(({ event }) =>
      deps.storage.putEvent(events.get(event.event_id)!)
    )
  );
}

/** Result of replaying strategies over past buckets. */
export interface ReplaySummary {
  from: string;
  to: string;
  strategies: Array<{
    strategy: DetectionStrategyId;
    observations: number;
    looked_off: number;
    above_normal: number;
    /** Distinct runs of consecutive above-normal buckets: roughly the events it would open. */
    would_open: number;
    error?: string;
  }>;
}

/**
 * Replays strategies over past buckets. It records every evaluation as history, so the baseline
 * check has something to compare with, and reports what each strategy would have raised. It
 * raises nothing.
 */
export async function replayEngine(
  deps: EngineDependencies,
  { minutes, now = Date.now() }: { minutes: number; now?: number }
): Promise<ReplaySummary> {
  const { storage } = deps;
  await storage.ensure();
  const config = await storage.getConfig();
  const bucketMs = config.bucket_minutes * 60_000;
  const to = Math.floor(now / bucketMs) * bucketMs - bucketMs;
  const from = to - minutes * 60_000;
  const runId = `replay-${uuidv4()}`;

  const evaluation = await evaluateStrategies({ deps, config, from, to, bucketMs, replay: true });
  await storage.writeObservations(
    evaluation.observations.map((observation) => ({
      run_id: runId,
      strategy: observation.strategy,
      fingerprint: observation.fingerprint,
      service: observation.service,
      bucket_start: new Date(observation.bucket_start).toISOString(),
      value: observation.value,
      looks_off: observation.looks_off,
      mode: 'replay',
    }))
  );

  const prior = await storage.readHistory({
    fingerprints: [
      ...new Set(evaluation.observations.map((observation) => observation.fingerprint)),
    ],
    from: new Date(from - config.baseline.history_buckets * bucketMs).toISOString(),
    to: new Date(from).toISOString(),
  });

  // Replay walks each series in time order, so the baseline only sees the past.
  const bySeries = new Map<string, TaggedObservation[]>();
  evaluation.observations.forEach((observation) => {
    const series = bySeries.get(observation.fingerprint) ?? [];
    series.push(observation);
    bySeries.set(observation.fingerprint, series);
  });

  const perStrategy = new Map<DetectionStrategyId, { aboveNormal: number; wouldOpen: number }>();
  bySeries.forEach((series, fingerprint) => {
    const sorted = [...series].sort((a, b) => a.bucket_start - b.bucket_start);
    const strategy = sorted[0].strategy;
    const policy = STRATEGIES[strategy].descriptor.baselinePolicy;
    const stats = perStrategy.get(strategy) ?? { aboveNormal: 0, wouldOpen: 0 };
    const result = sorted.reduce(
      (state, observation) => {
        const decision = observation.looks_off
          ? checkBaseline({
              value: observation.value,
              unit: observation.unit,
              policy,
              history: state.history,
              excludeWindows: [],
              settings: config.baseline,
            }).decision
          : 'background';
        const above = decision === 'above_normal' || decision === 'skipped';
        return {
          history: [
            ...state.history,
            {
              bucket_start: new Date(observation.bucket_start).toISOString(),
              value: observation.value,
            },
          ],
          above: state.above + (above ? 1 : 0),
          opens: state.opens + (above && !state.inRun ? 1 : 0),
          inRun: above,
        };
      },
      { history: prior.get(fingerprint) ?? [], above: 0, opens: 0, inRun: false }
    );
    perStrategy.set(strategy, {
      aboveNormal: stats.aboveNormal + result.above,
      wouldOpen: stats.wouldOpen + result.opens,
    });
  });

  const replaySummary: ReplaySummary = {
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
    strategies: evaluation.summaries.map((strategySummary) => ({
      strategy: strategySummary.strategy,
      observations: strategySummary.observations,
      looked_off: strategySummary.looked_off,
      above_normal: perStrategy.get(strategySummary.strategy)?.aboveNormal ?? 0,
      would_open: perStrategy.get(strategySummary.strategy)?.wouldOpen ?? 0,
      error: strategySummary.error,
    })),
  };

  await storage.appendActivity([
    ...evaluation.notes.map((note) => ({ ...note, run_id: runId })),
    ...replaySummary.strategies.map((strategySummary) => ({
      run_id: runId,
      step: 'trial' as const,
      action: 'replayed',
      strategy: strategySummary.strategy,
      message: `Replay ${replaySummary.from} - ${replaySummary.to}: ${
        STRATEGIES[strategySummary.strategy].descriptor.name
      } evaluated ${strategySummary.observations} series-buckets; ${
        strategySummary.above_normal
      } above normal, about ${strategySummary.would_open} event(s) it would open.`,
    })),
  ]);
  await storage.refresh();

  return replaySummary;
}
