/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../../common/domain/definitions/entity_schema';
import type { EngineLogExtractionState } from '../domain/saved_objects/engine_descriptor/constants';

/**
 * Per-(stream, subtype) extraction state for a KI-derived definition.
 *
 * The structure is a strict superset of `EngineLogExtractionState` (the
 * pagination cursor produced by the existing log-extraction pipeline) plus
 * a `lastError` envelope. The envelope is updated when an iteration fails
 * inside the generic-task KI loop so that a single bad group does not abort
 * the rest of the run, yet the operator can still observe the failure on
 * the next status report.
 */
export interface KiDefinitionStateEntry extends EngineLogExtractionState {
  lastError?: string;
  lastErrorTimestamp?: string;
}

/**
 * Map of KI-derived definition states, keyed by stream name then subtype.
 *
 * A nested map is used in preference to a single string key (e.g.
 * `${streamName}::${subtype}`) because both `Feature.stream_name` and
 * `Feature.subtype` are unconstrained `z.string()` and could in principle
 * contain any separator we picked. The nested shape sidesteps the encoding
 * question entirely, reads cleanly in serialized SO dumps, and matches the
 * way the loop iterates: outer over streams (so we can resolve index
 * patterns once per stream), inner over subtypes.
 */
export type KiDefinitionStates = Record<string, Record<string, KiDefinitionStateEntry>>;

/**
 * Status reported back to Task Manager after each run. Mirrors the
 * pre-existing inline string union; codified here so callers do not drift.
 */
export type ExtractEntityTaskStatus = 'success' | 'error';

/**
 * Typed shape of the extract-entity task state persisted by Task Manager.
 *
 * Historically this was an untyped object literal constructed inline by
 * `runTask`. Formalizing the shape (a) gives the upcoming KI loop a single
 * place to reason about what gets persisted, and (b) lets us guarantee
 * back-compat with already-scheduled tasks whose persisted state predates
 * `kiDefinitionStates` — see `coerceTaskState` below.
 *
 * Optional fields reflect either:
 *  - new additions whose absence indicates a pre-PR-H state document, or
 *  - error-path-only fields (`lastError`, `lastErrorTimestamp`) that the
 *    success path does not write.
 */
export interface ExtractEntityTaskState {
  namespace: string;
  entityType?: EntityType;
  runs: number;
  lastExecutionTimestamp?: string;
  lastExtractionSuccess?: boolean;
  status?: ExtractEntityTaskStatus;
  lastError?: string;
  lastErrorTimestamp?: string;
  /**
   * KI-derived definition extraction states. Only populated for the
   * `generic` entity type once the KI loop ships; absent or empty for all
   * other types and for legacy state.
   */
  kiDefinitionStates?: KiDefinitionStates;
}

/**
 * Widen a typed task state to the `Record<string, unknown>` shape Task
 * Manager expects on `RunResult.state`. Runtime value unchanged; this
 * centralizes the boundary cast so consumers do not sprinkle inline `as`
 * widenings.
 */
export const toTaskManagerState = (state: ExtractEntityTaskState): Record<string, unknown> =>
  state as unknown as Record<string, unknown>;

/**
 * Defensively coerce a Task Manager state blob (typed only as
 * `Record<string, unknown>` by the framework) into our typed shape.
 *
 * The function tolerates:
 *  - `undefined` / `null` (returns a fresh state with `runs: 0`),
 *  - missing fields (filled with the safest default),
 *  - extra fields (preserved verbatim and ignored at the type boundary, so
 *    rolling back this PR keeps unknown fields readable on subsequent runs),
 *  - malformed `kiDefinitionStates` (replaced with `undefined`, never
 *    crashes the run).
 *
 * It never throws. Anything it cannot interpret is dropped silently.
 */
export const coerceTaskState = (raw: unknown): ExtractEntityTaskState => {
  if (raw === null || typeof raw !== 'object') {
    return { namespace: '', runs: 0 };
  }
  const source = raw as Record<string, unknown>;

  const namespace = typeof source.namespace === 'string' ? source.namespace : '';
  const runs = typeof source.runs === 'number' && Number.isFinite(source.runs) ? source.runs : 0;

  const state: ExtractEntityTaskState = { namespace, runs };

  if (typeof source.entityType === 'string') {
    state.entityType = source.entityType as EntityType;
  }
  if (typeof source.lastExecutionTimestamp === 'string') {
    state.lastExecutionTimestamp = source.lastExecutionTimestamp;
  }
  if (typeof source.lastExtractionSuccess === 'boolean') {
    state.lastExtractionSuccess = source.lastExtractionSuccess;
  }
  if (source.status === 'success' || source.status === 'error') {
    state.status = source.status;
  }
  if (typeof source.lastError === 'string') {
    state.lastError = source.lastError;
  }
  if (typeof source.lastErrorTimestamp === 'string') {
    state.lastErrorTimestamp = source.lastErrorTimestamp;
  }

  const kiDefinitionStates = coerceKiDefinitionStates(source.kiDefinitionStates);
  if (kiDefinitionStates !== undefined) {
    state.kiDefinitionStates = kiDefinitionStates;
  }

  return state;
};

const coerceKiDefinitionStates = (raw: unknown): KiDefinitionStates | undefined => {
  if (raw === null || typeof raw !== 'object') {
    return undefined;
  }
  const out: KiDefinitionStates = {};
  for (const [streamName, perStream] of Object.entries(raw as Record<string, unknown>)) {
    if (perStream === null || typeof perStream !== 'object') continue;
    const inner: Record<string, KiDefinitionStateEntry> = {};
    for (const [subtype, entry] of Object.entries(perStream as Record<string, unknown>)) {
      if (entry === null || typeof entry !== 'object') continue;
      // We do not validate every cursor field — they're all nullable strings
      // in `EngineLogExtractionState` and the upstream extractor will
      // re-parse via Zod when it reads the entry. Trust the structure;
      // surface obvious shape errors at the boundary only.
      inner[subtype] = entry as KiDefinitionStateEntry;
    }
    if (Object.keys(inner).length > 0) {
      out[streamName] = inner;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

/**
 * Read a KI definition state entry by (stream, subtype). Returns
 * `undefined` if the parent stream key or the subtype key is missing.
 */
export const getKiDefinitionState = (
  states: KiDefinitionStates | undefined,
  streamName: string,
  subtype: string
): KiDefinitionStateEntry | undefined => {
  return states?.[streamName]?.[subtype];
};

/**
 * Return a new `KiDefinitionStates` with the given (stream, subtype) entry
 * set or replaced. Pure — does not mutate the input map.
 */
export const setKiDefinitionState = (
  states: KiDefinitionStates | undefined,
  streamName: string,
  subtype: string,
  entry: KiDefinitionStateEntry
): KiDefinitionStates => {
  const next: KiDefinitionStates = states ? { ...states } : {};
  const existingForStream = next[streamName];
  next[streamName] = existingForStream
    ? { ...existingForStream, [subtype]: entry }
    : { [subtype]: entry };
  return next;
};
