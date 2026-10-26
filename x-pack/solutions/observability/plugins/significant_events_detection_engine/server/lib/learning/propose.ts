/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type {
  AcceptanceCriteria,
  CandidateOrigin,
  EngineConfig,
  EngineEvent,
  LabelledIncident,
  LearnedDetector,
  StrategyCandidate,
  ThresholdChange,
} from '../../../common';
import { HOUR_MS, MINUTE_MS } from '../../../common';
import type { IEngineScope } from '../engine/engine_scope';
import { getErrorMessage } from '../errors';
import { esqlString, field, queryRows } from '../esql';
import {
  bestPatternForPath,
  chooseWithModel,
  detectorFromPattern,
  minePatterns,
  newDuringIncident,
  pathText,
  validateCondition,
} from './detector_author';
import { zScoreOf } from '../pipeline/baseline';
import { DEFAULT_INCIDENT_MINUTES } from './incidents';
import type { ConfirmedPath } from './tree_paths';

/** A path needs this many confirming investigations before it becomes a detector. */
export const MIN_TREE_CONFIRMATIONS = 2;
/** How far back the patterns of a service are read when a tree path names it. */
const TREE_PATTERN_WINDOW_MS = 6 * HOUR_MS;
/** The window before a missed incident that says what normal looked like. */
const MISSED_REFERENCE_MS = 2 * HOUR_MS;
/** New patterns per missed incident turned into candidates; the rest are noise more often. */
const MAX_DETECTORS_PER_MISSED = 2;
/** Dismissals of the same series before the engine proposes raising its threshold. */
export const MIN_DISMISSALS_FOR_TUNING = 2;
const MAX_MAD_K = 10;

/** What a generator needs, beyond the scope. */
export interface ProposalContext {
  scope: IEngineScope;
  config: EngineConfig;
  sources: NightshiftSource[];
  /** Services the engine has seen recently, to recognise one named in free text. */
  knownServices: string[];
  incidents: LabelledIncident[];
  /** Signatures of every candidate ever made, failed ones included. */
  knownSignatures: Set<string>;
  /** Model calls this pass may still make; decremented as they are spent. */
  modelBudget: { remaining: number; used: number };
  signal: AbortSignal;
  notes: string[];
}

function newCandidate({
  kind,
  signature,
  title,
  hypothesis,
  scope,
  origin,
  acceptance,
  detector,
  threshold,
}: Pick<
  StrategyCandidate,
  'kind' | 'signature' | 'title' | 'hypothesis' | 'scope' | 'origin' | 'detector' | 'threshold'
> & { acceptance: AcceptanceCriteria }): StrategyCandidate {
  const now = new Date().toISOString();
  return {
    candidate_id: uuidv4(),
    kind,
    signature,
    title,
    hypothesis,
    scope,
    origin,
    stage: 'proposed',
    created_at: now,
    updated_at: now,
    acceptance,
    detector,
    threshold,
    history: [
      {
        at: now,
        stage: 'proposed',
        note: `Proposed with its bar set first: catch ${acceptance.must_catch.length} kept incident(s) within ${acceptance.max_warning_minutes} min, at most ${acceptance.max_false_opens_per_day} false opens per day, trial of ${acceptance.min_trial_minutes} min, rollback after ${acceptance.rollback_dismissals} dismissals.`,
        by: 'engine',
      },
    ],
  };
}

function acceptanceOf(config: EngineConfig, mustCatch: string[]): AcceptanceCriteria {
  return { ...config.learning.acceptance, must_catch: mustCatch };
}

/** The enabled source whose data has this service, first match wins. */
async function sourceOfService(
  context: ProposalContext,
  service: string
): Promise<NightshiftSource | undefined> {
  for (const source of context.sources) {
    // Sequential: usually the first source has it, and the rest are not read.
    try {
      const { rows } = await queryRows({
        esClient: context.scope.dataEsClient,
        query: `FROM ${source.view_name} | WHERE ${field('service.name')} == ${esqlString(
          service
        )} | LIMIT 1`,
        signal: context.signal,
      });
      if (rows.length > 0) {
        return source;
      }
    } catch (error) {
      // A source without `service.name` cannot hold the service.
    }
  }
  return undefined;
}

/** The known service a path talks about most, preferring the cause over the symptom. */
export function serviceOfPath(path: ConfirmedPath, knownServices: string[]): string | undefined {
  const causeText = [path.cause, ...path.steps.slice(-3).map((step) => step.description ?? '')]
    .join(' ')
    .toLowerCase();
  const allText = pathText(path).toLowerCase();
  const mentions = (text: string, service: string) =>
    text.match(new RegExp(`\\b${service.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'))
      ?.length ?? 0;
  const ranked = knownServices
    .map((service) => ({
      service,
      score:
        mentions(causeText, service.toLowerCase()) * 3 + mentions(allText, service.toLowerCase()),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.service;
}

/**
 * A detector for each path investigations confirmed at least twice: the check that keeps
 * leading to the same cause, written as a log condition on the service it names.
 */
export async function proposeFromDecisionTrees(
  context: ProposalContext,
  paths: ConfirmedPath[]
): Promise<StrategyCandidate[]> {
  const proposals: StrategyCandidate[] = [];
  for (const path of paths.filter((item) => item.confirmations >= MIN_TREE_CONFIRMATIONS)) {
    // Sequential: each proposal may spend the pass's model budget.
    const service = serviceOfPath(path, context.knownServices);
    const signature = `tree:${path.tree_id}:${path.cause.toLowerCase()}:${service ?? '?'}`;
    if (context.knownSignatures.has(signature)) {
      continue;
    }
    if (!service) {
      context.notes.push(
        `Tree ${path.tree_id}: the path to "${path.cause}" names no service the engine watches; no detector.`
      );
      continue;
    }
    const source = await sourceOfService(context, service);
    if (!source) {
      context.notes.push(`Tree ${path.tree_id}: no enabled source has ${service}.`);
      continue;
    }
    const now = Date.now();
    const { messageField, patterns } = await minePatterns({
      esClient: context.scope.dataEsClient,
      source,
      service,
      from: now - TREE_PATTERN_WINDOW_MS,
      to: now,
      signal: context.signal,
    });
    if (!messageField || patterns.length === 0) {
      context.notes.push(`Tree ${path.tree_id}: ${service} has no log messages to watch.`);
      continue;
    }
    const connectorId = context.config.agent.connector_id;
    const useModel =
      context.config.agent.kind === 'agent_builder' &&
      connectorId !== undefined &&
      context.modelBudget.remaining > 0;
    let choice = {
      pattern_index: bestPatternForPath(path, patterns),
      title: `${service}: ${path.cause}`,
      description: `Investigations confirmed ${path.confirmations} times that "${path.symptom}" led to "${path.cause}". This watches the log lines their checks looked for.`,
      by: 'keywords',
    };
    if (useModel) {
      context.modelBudget.remaining -= 1;
      context.modelBudget.used += 1;
      try {
        const answer = await chooseWithModel({
          inferenceClient: context.scope.inferenceClient,
          connectorId,
          path,
          service,
          patterns,
          signal: context.signal,
        });
        choice = {
          ...answer,
          title: answer.title || choice.title,
          description: answer.description || choice.description,
          by: 'model',
        };
      } catch (error) {
        context.notes.push(
          `Tree ${path.tree_id}: the model could not choose a pattern (${getErrorMessage(
            error
          )}); keyword matching used instead.`
        );
      }
    }
    if (choice.pattern_index < 0) {
      context.notes.push(
        `Tree ${path.tree_id}: no log pattern of ${service} matches the checks on the path to "${path.cause}" (${choice.by}).`
      );
      continue;
    }
    const built = detectorFromPattern({
      source,
      service,
      messageField,
      pattern: patterns[choice.pattern_index],
      title: choice.title,
      description: choice.description,
    });
    if ('reason' in built) {
      context.notes.push(`Tree ${path.tree_id}: ${built.reason}.`);
      continue;
    }
    const invalid = await validateCondition({
      esClient: context.scope.dataEsClient,
      source,
      condition: built.condition,
      signal: context.signal,
    });
    if (invalid) {
      context.notes.push(`Tree ${path.tree_id}: the condition does not run: ${invalid}`);
      continue;
    }
    const origin: CandidateOrigin = {
      kind: 'decision_tree',
      tree_id: path.tree_id,
      cause: path.cause,
      path: path.steps.map((step) => step.label),
      confirmations: path.confirmations,
    };
    context.knownSignatures.add(signature);
    proposals.push(
      newCandidate({
        kind: 'detector',
        signature,
        title: built.title,
        hypothesis: `${path.confirmations} investigations of "${path.symptom}" confirmed "${path.cause}" through the same checks; watching what those checks found raises it before anyone investigates. Pattern chosen by ${choice.by}.`,
        scope: { service, source_id: source.id, strategy: 'learned_detectors' },
        origin,
        // A tree turn names no incident, so none is required; the replay still reports which
        // kept incidents it catches, and every open outside them counts against it.
        acceptance: acceptanceOf(context.config, []),
        detector: built,
      })
    );
  }
  return proposals;
}

/**
 * Detectors for incidents people reported as missed: the log patterns that appeared during the
 * incident and were absent or much rarer before it.
 */
export async function proposeFromMissedIncidents(
  context: ProposalContext,
  missed: LabelledIncident[]
): Promise<StrategyCandidate[]> {
  const proposals: StrategyCandidate[] = [];
  for (const incident of missed) {
    // Sequential: each incident reads its own windows; learning gives way to live detection.
    for (const service of incident.services) {
      const source = await sourceOfService(context, service);
      if (!source) {
        context.notes.push(
          `Missed incident ${incident.incident_id}: no enabled source has ${service}.`
        );
        continue;
      }
      const from = Date.parse(incident.from);
      const to = incident.to
        ? Date.parse(incident.to)
        : from + DEFAULT_INCIDENT_MINUTES * MINUTE_MS;
      const { messageField, patterns } = await minePatterns({
        esClient: context.scope.dataEsClient,
        source,
        service,
        from,
        to,
        reference: { from: from - MISSED_REFERENCE_MS, to: from },
        signal: context.signal,
      });
      const fresh = newDuringIncident({
        patterns,
        incidentMinutes: (to - from) / MINUTE_MS,
        referenceMinutes: MISSED_REFERENCE_MS / MINUTE_MS,
      });
      if (!messageField || fresh.length === 0) {
        context.notes.push(
          `Missed incident ${incident.incident_id}: no log pattern of ${service} stands out during it.`
        );
        continue;
      }
      fresh.slice(0, MAX_DETECTORS_PER_MISSED).forEach((pattern) => {
        const signature = `missed:${incident.incident_id}:${service}:${pattern.pattern}`;
        if (context.knownSignatures.has(signature)) {
          return;
        }
        const excerpt =
          pattern.sample.length > 80 ? `${pattern.sample.slice(0, 77)}...` : pattern.sample;
        const built = detectorFromPattern({
          source,
          service,
          messageField,
          pattern,
          title: `${service}: lines like ${excerpt}`,
          description: `Appeared ${pattern.count} times during "${incident.description}" against ${pattern.reference_count} in the two hours before it.`,
        });
        if ('reason' in built) {
          context.notes.push(`Missed incident ${incident.incident_id}: ${built.reason}.`);
          return;
        }
        context.knownSignatures.add(signature);
        proposals.push(
          newCandidate({
            kind: 'detector',
            signature,
            title: built.title,
            hypothesis: `The engine missed "${incident.description}". These lines started with it; a detector on them would have raised it.`,
            scope: { service, source_id: source.id, strategy: 'learned_detectors' },
            origin: {
              kind: 'missed_incident',
              incident_id: incident.incident_id,
              pattern: pattern.pattern,
            },
            // The incident it was mined from stays a regression check, never its evidence.
            acceptance: {
              ...acceptanceOf(context.config, [incident.incident_id]),
              trained_on: [incident.incident_id],
            },
            detector: built as LearnedDetector,
          })
        );
      });
    }
  }
  return proposals;
}

/**
 * A higher `mad_k` for a series people dismissed again and again. The value is the smallest
 * that puts every dismissed value under the threshold, from the baseline each signal saw;
 * the replay then checks it keeps every real incident.
 */
export async function proposeFromDismissals(
  context: ProposalContext,
  dismissedEvents: EngineEvent[]
): Promise<StrategyCandidate[]> {
  const byFingerprint = dismissedEvents.reduce((groups, event) => {
    event.members.forEach((member) => {
      groups.set(member.fingerprint, [...(groups.get(member.fingerprint) ?? []), event]);
    });
    return groups;
  }, new Map<string, EngineEvent[]>());
  const proposals: StrategyCandidate[] = [];
  for (const [fingerprint, events] of byFingerprint) {
    if (events.length < MIN_DISMISSALS_FOR_TUNING) {
      continue;
    }
    const member = events[0].members.find((item) => item.fingerprint === fingerprint)!;
    // Learned detectors earn their threshold on the evolution path; tuning them is circular.
    if (
      member.strategy === 'learned_detectors' ||
      member.strategy === 'customer_alerts' ||
      member.strategy === 'change_regressions'
    ) {
      continue;
    }
    const signals = await context.scope.storage.records.findSignals({
      fingerprints: [fingerprint],
      since: new Date(
        Math.min(
          ...events.map((event) => Date.parse(event.open_windows[0]?.from ?? event.opened_at))
        )
      ).toISOString(),
    });
    const dismissedSignals = signals.filter((signal) =>
      events.some((event) => event.event_id === signal.event_id)
    );
    const needed = dismissedSignals.flatMap((signal) => {
      const z = zScoreOf(signal.value, signal.baseline);
      return z === undefined ? [] : [z];
    });
    if (needed.length === 0) {
      context.notes.push(
        `${member.title}: dismissed ${events.length} times, but its normal never varies, so a threshold cannot separate it.`
      );
      continue;
    }
    const toMadK = Math.ceil((Math.max(...needed) + 0.5) * 2) / 2;
    const fromMadK = context.config.baseline.mad_k;
    if (toMadK <= fromMadK || toMadK > MAX_MAD_K) {
      context.notes.push(
        `${member.title}: dismissed ${events.length} times; it would need mad_k ${toMadK}, outside ${fromMadK}-${MAX_MAD_K}.`
      );
      continue;
    }
    const signature = `threshold:${fingerprint}:${toMadK}`;
    if (context.knownSignatures.has(signature)) {
      continue;
    }
    const threshold: ThresholdChange = {
      fingerprints: [fingerprint],
      unit: member.unit,
      from_mad_k: fromMadK,
      to_mad_k: toMadK,
    };
    context.knownSignatures.add(signature);
    proposals.push(
      newCandidate({
        kind: 'threshold',
        signature,
        title: `Raise the threshold of "${member.title}" (mad_k ${fromMadK} to ${toMadK})`,
        hypothesis: `People dismissed ${events.length} events on this series; at mad_k ${toMadK} none of the dismissed values is above normal.`,
        scope: { service: member.service, source_id: member.source_id, strategy: member.strategy },
        origin: { kind: 'dismissals', event_ids: events.map((event) => event.event_id) },
        acceptance: acceptanceOf(context.config, []),
        threshold,
      })
    );
  }
  return proposals;
}

/** A detector a person wrote, on the same path as the engine's own. */
export function proposeFromPerson({
  config,
  detector,
  mustCatch,
}: {
  config: EngineConfig;
  detector: LearnedDetector;
  mustCatch: string[];
}): StrategyCandidate {
  return newCandidate({
    kind: 'detector',
    signature: `person:${detector.detector_id}`,
    title: detector.title,
    hypothesis: detector.description,
    scope: {
      service: detector.service,
      source_id: detector.source_id,
      strategy: 'learned_detectors',
    },
    origin: { kind: 'person' },
    acceptance: acceptanceOf(config, mustCatch),
    detector,
  });
}

/**
 * A failed candidate gets one more replay when people labelled new incidents on its service
 * after it failed: the evidence it was judged on changed. The retest keeps the same bar, which
 * is never lowered, and its own signature, so it is retested once per new set of labels.
 */
export function proposeRetests(
  context: ProposalContext,
  candidates: StrategyCandidate[]
): StrategyCandidate[] {
  return candidates
    .filter((candidate) => candidate.stage === 'replay_failed' || candidate.stage === 'rolled_back')
    .filter((candidate) => candidate.history.every((entry) => entry.by === 'engine'))
    .flatMap((candidate): StrategyCandidate[] => {
      const fresh = context.incidents.filter(
        (incident) =>
          incident.services.includes(candidate.scope.service) &&
          incident.created_at > candidate.updated_at
      );
      if (fresh.length === 0) {
        return [];
      }
      const signature = `${candidate.signature}#retest:${fresh
        .map((incident) => incident.incident_id)
        .sort()
        .join(',')}`;
      if (context.knownSignatures.has(signature)) {
        return [];
      }
      context.knownSignatures.add(signature);
      const retest = newCandidate({
        kind: candidate.kind,
        signature,
        title: candidate.title,
        hypothesis: candidate.hypothesis,
        scope: candidate.scope,
        origin: candidate.origin,
        acceptance: candidate.acceptance,
        detector: candidate.detector,
        threshold: candidate.threshold,
      });
      return [
        {
          ...retest,
          history: [
            {
              ...retest.history[0],
              note: `Retest of ${candidate.candidate_id}, which ${
                candidate.stage === 'replay_failed' ? 'failed its replay' : 'was rolled back'
              }: ${fresh.length} incident(s) on ${
                candidate.scope.service
              } were labelled since. Same bar as before.`,
            },
          ],
        },
      ];
    });
}
