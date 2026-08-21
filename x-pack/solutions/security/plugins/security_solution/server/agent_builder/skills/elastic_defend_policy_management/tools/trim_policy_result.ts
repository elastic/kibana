/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import { createOtherResult } from '@kbn/agent-builder-server';
import type { PolicyIdentity } from '../services/read_policy';

const MAX_STRING_LENGTH = 512;
const MAX_CONTAINER_ENTRIES = 50;
const MAX_DEPTH = 10;
const MAX_PRESENTATION_NODES = 500;
const MAX_SUMMARY_ENTRIES = 50;

export type TrimLimits = Readonly<{
  maxStringLength: number;
  maxContainerEntries: number;
  maxDepth: number;
  maxPresentationNodes: number;
}>;

export const DEFAULT_TRIM_LIMITS: TrimLimits = {
  maxStringLength: MAX_STRING_LENGTH,
  maxContainerEntries: MAX_CONTAINER_ENTRIES,
  maxDepth: MAX_DEPTH,
  maxPresentationNodes: MAX_PRESENTATION_NODES,
};

export const TIGHTEST_TRIM_LIMITS: TrimLimits = {
  maxStringLength: 0,
  maxContainerEntries: 0,
  maxDepth: 1,
  maxPresentationNodes: 1,
};

export const TIGHTER_TRIM_LIMITS: readonly TrimLimits[] = [
  {
    maxStringLength: 256,
    maxContainerEntries: 25,
    maxDepth: 8,
    maxPresentationNodes: 200,
  },
  {
    maxStringLength: 128,
    maxContainerEntries: 10,
    maxDepth: 6,
    maxPresentationNodes: 80,
  },
  {
    maxStringLength: 64,
    maxContainerEntries: 5,
    maxDepth: 4,
    maxPresentationNodes: 30,
  },
  {
    maxStringLength: 32,
    maxContainerEntries: 2,
    maxDepth: 3,
    maxPresentationNodes: 15,
  },
  {
    maxStringLength: 16,
    maxContainerEntries: 1,
    maxDepth: 2,
    maxPresentationNodes: 8,
  },
  TIGHTEST_TRIM_LIMITS,
];

export type TruncationReason =
  'string_truncated' | 'array_truncated' | 'object_truncated' | 'depth_truncated';

export type TruncationEntry = Readonly<{
  path: string;
  reason: TruncationReason;
  total?: number;
}>;

export type TrimSummary = Readonly<{
  entries: readonly TruncationEntry[];
  entries_truncated?: true;
  entries_total?: number;
  output_truncated?: true;
  output_total_nodes?: number;
}>;

export type PolicyTrimResult = Readonly<{
  value: unknown;
  summary?: TrimSummary;
}>;

interface TrimState {
  presentedNodes: number;
  outputTruncated: boolean;
  entries: TruncationEntry[];
  entriesTotal: number;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const sortedKeys = (record: Record<string, unknown>): string[] =>
  Object.keys(record).sort((left, right) => left.localeCompare(right));

const countNodes = (value: unknown): number => {
  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + countNodes(item), 1);
  }
  if (isPlainObject(value)) {
    return Object.values(value).reduce<number>((total, item) => total + countNodes(item), 1);
  }
  return 1;
};

const reserveNode = (state: TrimState, limits: TrimLimits): boolean => {
  if (state.presentedNodes >= limits.maxPresentationNodes) {
    state.outputTruncated = true;
    return false;
  }
  state.presentedNodes += 1;
  return true;
};

const recordTruncation = (state: TrimState, entry: TruncationEntry): void => {
  state.entriesTotal += 1;
  if (state.entries.length < MAX_SUMMARY_ENTRIES) {
    state.entries.push(entry);
  }
};

const joinPath = (parent: string, key: string): string =>
  parent === '' ? key : `${parent}.${key}`;

const joinIndex = (parent: string, index: number): string => `${parent}[${index}]`;

const trimArray = (
  value: unknown[],
  depth: number,
  path: string,
  state: TrimState,
  limits: TrimLimits
): unknown => {
  const entriesCapped = value.length > limits.maxContainerEntries;
  if (entriesCapped) {
    state.outputTruncated = true;
    recordTruncation(state, { path, reason: 'array_truncated', total: value.length });
  }
  const capped = value.slice(0, limits.maxContainerEntries);
  const items: unknown[] = [];

  for (let index = 0; index < capped.length; index += 1) {
    if (state.presentedNodes >= limits.maxPresentationNodes) {
      state.outputTruncated = true;
      break;
    }
    items.push(trimValue(capped[index], depth + 1, joinIndex(path, index), state, limits));
  }

  return items;
};

const trimObject = (
  value: Record<string, unknown>,
  depth: number,
  path: string,
  state: TrimState,
  limits: TrimLimits
): unknown => {
  const keys = sortedKeys(value);
  const objectTruncated = keys.length > limits.maxContainerEntries;
  if (objectTruncated) {
    state.outputTruncated = true;
    recordTruncation(state, { path, reason: 'object_truncated', total: keys.length });
  }
  const keysToKeep = keys.slice(0, limits.maxContainerEntries);
  const result: Record<string, unknown> = {};

  for (const key of keysToKeep) {
    if (state.presentedNodes >= limits.maxPresentationNodes) {
      state.outputTruncated = true;
      break;
    }
    result[key] = trimValue(value[key], depth + 1, joinPath(path, key), state, limits);
  }

  return result;
};

const trimValue = (
  value: unknown,
  depth: number,
  path: string,
  state: TrimState,
  limits: TrimLimits
): unknown => {
  if (!reserveNode(state, limits)) {
    return undefined;
  }

  if (typeof value === 'string') {
    if (value.length > limits.maxStringLength) {
      recordTruncation(state, { path, reason: 'string_truncated' });
      return value.slice(0, limits.maxStringLength);
    }
    return value;
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (depth >= limits.maxDepth) {
    recordTruncation(state, { path, reason: 'depth_truncated' });
    return null;
  }

  if (Array.isArray(value)) {
    return trimArray(value, depth, path, state, limits);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return trimObject(value, depth, path, state, limits);
};

const toSummary = (state: TrimState, originalNodeCount: number): TrimSummary | undefined => {
  if (state.entriesTotal === 0 && !state.outputTruncated) {
    return undefined;
  }

  const summary: {
    entries: TruncationEntry[];
    entries_truncated?: true;
    entries_total?: number;
    output_truncated?: true;
    output_total_nodes?: number;
  } = { entries: state.entries };

  if (state.entries.length < state.entriesTotal) {
    summary.entries_truncated = true;
    summary.entries_total = state.entriesTotal;
  }

  if (state.outputTruncated) {
    summary.output_truncated = true;
    summary.output_total_nodes = originalNodeCount;
  }

  return summary;
};

export const toPresentationHash = (serviceHash: string): string =>
  createHash('sha256').update(serviceHash).digest('hex');

export const trimPolicyResultWithMeta = (
  input: unknown,
  limits: TrimLimits = DEFAULT_TRIM_LIMITS
): PolicyTrimResult => {
  const state: TrimState = {
    presentedNodes: 0,
    outputTruncated: false,
    entries: [],
    entriesTotal: 0,
  };
  const originalNodeCount = countNodes(input);
  const value = trimValue(input, 0, '', state, limits);
  const summary = toSummary(state, originalNodeCount);

  return summary === undefined ? { value } : { value, summary };
};

export type PresentedFromTo = Readonly<{
  from: unknown;
  to: unknown;
  from_truncation?: TrimSummary;
  to_truncation?: TrimSummary;
}>;

export const presentFromTo = (
  entry: Readonly<{ from: unknown; to: unknown }>,
  limits: TrimLimits
): PresentedFromTo => {
  const fromTrim = trimPolicyResultWithMeta(entry.from, limits);
  const toTrim = trimPolicyResultWithMeta(entry.to, limits);
  return {
    from: fromTrim.value,
    to: toTrim.value,
    ...(fromTrim.summary !== undefined ? { from_truncation: fromTrim.summary } : {}),
    ...(toTrim.summary !== undefined ? { to_truncation: toTrim.summary } : {}),
  };
};

export const GUARDED_ENVELOPE_HEADROOM_TOKENS = 64;

type PolicyIdentityStringKey =
  'id' | 'name' | 'description' | 'version' | 'updatedAt' | 'updatedBy' | 'packageVersion';

export type PresentedPolicyIdentity<T extends Partial<PolicyIdentity> = PolicyIdentity> = Pick<
  T,
  Extract<keyof T, keyof PolicyIdentity>
> &
  Partial<Record<`${Extract<keyof T, PolicyIdentityStringKey>}_string_truncated`, true>>;

type WritablePresentedIdentity = {
  -readonly [
    Key in keyof PresentedPolicyIdentity<Partial<PolicyIdentity>>
  ]?: PresentedPolicyIdentity<Partial<PolicyIdentity>>[Key];
};

const IDENTITY_STRING_KEYS = [
  'id',
  'name',
  'description',
  'version',
  'updatedAt',
  'updatedBy',
  'packageVersion',
] as const satisfies readonly PolicyIdentityStringKey[];

const capPresentedIdentityString = (value: string): { text: string; truncated: boolean } => {
  if (value.length <= MAX_STRING_LENGTH) {
    return { text: value, truncated: false };
  }

  return { text: value.slice(0, MAX_STRING_LENGTH), truncated: true };
};

export function presentBoundedIdentityStrings<T extends Partial<PolicyIdentity>>(
  policy: T
): PresentedPolicyIdentity<T>;
export function presentBoundedIdentityStrings(
  policy: Partial<PolicyIdentity>
): PresentedPolicyIdentity<Partial<PolicyIdentity>> {
  const presented: WritablePresentedIdentity = {};

  if (policy.revision !== undefined) {
    presented.revision = policy.revision;
  }

  for (const key of IDENTITY_STRING_KEYS) {
    const value = policy[key];
    if (value !== undefined) {
      const { text, truncated } = capPresentedIdentityString(value);
      presented[key] = text;
      if (truncated) {
        presented[`${key}_string_truncated`] = true;
      }
    }
  }

  return presented;
}

export const estimateGuardedEnvelopeTokens = (dto: object): number =>
  estimateTokens(JSON.stringify({ results: [createOtherResult(dto)] }));

export const fitsGuardedEnvelope = (dto: object, maxTokens: number): boolean =>
  estimateGuardedEnvelopeTokens(dto) + GUARDED_ENVELOPE_HEADROOM_TOKENS <= maxTokens;

const requireFittedEnvelope = <T extends object>(dto: T, maxTokens: number): T => {
  if (!fitsGuardedEnvelope(dto, maxTokens)) {
    throw new Error('Policy tool result exceeded the guarded token envelope');
  }
  return dto;
};

const omitTrailingUntilFit = <T extends object>(
  build: (keep: number) => T,
  initialKeep: number,
  maxTokens: number
): { dto: T; fitted: boolean } => {
  let keep = initialKeep;
  let dto = build(keep);
  while (keep > 0 && !fitsGuardedEnvelope(dto, maxTokens)) {
    keep -= 1;
    dto = build(keep);
  }
  return { dto, fitted: fitsGuardedEnvelope(dto, maxTokens) };
};

export const tryOmitTrailingToFit = <T extends object>(
  build: (keep: number) => T,
  initialKeep: number,
  maxTokens: number
): T | undefined => {
  const { dto, fitted } = omitTrailingUntilFit(build, initialKeep, maxTokens);
  return fitted ? dto : undefined;
};

export const omitTrailingToFit = <T extends object, F extends object = T>(
  build: (keep: number) => T,
  initialKeep: number,
  maxTokens: number,
  fallback?: () => F
): T | F => {
  const { dto, fitted } = omitTrailingUntilFit(build, initialKeep, maxTokens);
  if (fitted) {
    return dto;
  }
  return requireFittedEnvelope(fallback !== undefined ? fallback() : dto, maxTokens);
};

export const presentWithinGuardedBudget = <T extends object, F extends object>(
  build: (limits: TrimLimits) => T,
  maxTokens: number,
  fallback: () => F
): T | F => {
  let dto = build(DEFAULT_TRIM_LIMITS);
  if (fitsGuardedEnvelope(dto, maxTokens)) {
    return dto;
  }

  for (const limits of TIGHTER_TRIM_LIMITS) {
    dto = build(limits);
    if (fitsGuardedEnvelope(dto, maxTokens)) {
      return dto;
    }
  }

  return requireFittedEnvelope(fallback(), maxTokens);
};
