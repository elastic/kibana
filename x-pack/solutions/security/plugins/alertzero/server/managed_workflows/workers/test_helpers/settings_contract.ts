/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Test-only. The Worker settings contract is the input side of each Worker's complete settings
 * schema plus its declaration defaults, committed as `settings_contract.snapshot.json`. A diff is
 * classified as safe for stored documents or breaking for them.
 *
 * JSON Schema keywords this module does not understand fail the build instead of being dropped.
 * Zod refinements (`.refine`, `.superRefine`, which the OpenAPI generator emits for the
 * `nonempty` and `date-math` formats) have no JSON Schema form and are not part of the contract.
 */

import { isEqual } from 'lodash';
import {
  SYSTEM_SECURITY_WORKER_IDS,
  WATCH_AUTONOMY_LEVELS,
  createDefaultWorkerSettings,
  getAllowedAutonomyLevels,
  getCompleteWorkerSettingsSchema,
  nearestLowerAutonomyLevel,
  type WatchAutonomyLevel,
} from '@kbn/alertzero-common';
import { z } from '@kbn/zod/v4';

export const MIGRATION_ISSUE = 'https://github.com/elastic/security-team/issues/19312';

export const BREAKING_CHANGE_EXITS = `a migration under ${MIGRATION_ISSUE} (not built yet), or, before customers exist, a coordinated reset (plugin README, "Pre-customer state")`;

export const SETTINGS_CONTRACT_SNAPSHOT_FILE = 'settings_contract.snapshot.json';

export const GENERATE_SETTINGS_CONTRACT_SNAPSHOT =
  'node x-pack/solutions/security/plugins/alertzero/scripts/generate_settings_contract_snapshot.js';

/**
 * Accepts a breaking change by recording a coordinated reset of pre-customer environments. It has
 * no meaning once customers store settings; #19312 replaces it with a migration check.
 */
export const PRE_CUSTOMER_RESET_FLAG = '--pre-customer-reset';

const RECORD_A_RESET = `Before customers exist, a breaking change can go in only with a coordinated reset of the affected environments. Agree it with the Common Worker Layer team on an issue, then run:\n${GENERATE_SETTINGS_CONTRACT_SNAPSHOT} ${PRE_CUSTOMER_RESET_FLAG} <issue-url>`;

const KNOWN_SCHEMA_KEYS = new Set([
  '$schema',
  'description',
  'title',
  'default',
  'type',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'minItems',
  'maxItems',
  'enum',
  'const',
  'minimum',
  'maximum',
  'minLength',
  'maxLength',
  'pattern',
]);

const NUMERIC_KEYWORDS = [
  'minimum',
  'maximum',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
] as const;

export interface SettingsLeafContract {
  kind: 'leaf';
  type: string;
  nullable?: true;
  enum?: ReadonlyArray<string | number | boolean>;
  const?: string | number | boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface SettingsArrayContract {
  kind: 'array';
  nullable?: true;
  items: SettingsNode;
  minItems?: number;
  maxItems?: number;
}

export interface SettingsObjectContract {
  kind: 'object';
  nullable?: true;
  fields: Readonly<Record<string, SettingsNode>>;
  required: readonly string[];
  additionalProperties: boolean;
}

export type SettingsNode = SettingsLeafContract | SettingsArrayContract | SettingsObjectContract;

export interface WorkerSettingsContract {
  defaults: Readonly<Record<string, unknown>>;
  schema: SettingsObjectContract;
}

export type WorkerSettingsContracts = Readonly<Record<string, WorkerSettingsContract>>;

export interface PreCustomerReset {
  /** The issue where the reset was agreed and the affected environments are listed. */
  issue: string;
  changes: readonly string[];
}

export interface SettingsContractSnapshot {
  /** Append-only. Each entry is one breaking change accepted by resetting pre-customer environments. */
  preCustomerResets: readonly PreCustomerReset[];
  workers: WorkerSettingsContracts;
}

export interface ContractChange {
  kind: 'safe' | 'breaking';
  text: string;
  /** Set only when a schema field was added or removed, so the defaults diff can skip it. */
  field?: { change: 'added' | 'removed'; path: string };
  /** A removal or a narrowing, where keeping the stored key and changing only the label may be the fix. */
  mayBeLabelChange?: true;
  scheduleAdded?: true;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isScalar = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

const unclassified = (what: string, path: string): Error =>
  new Error(
    `Unclassified ${what} at ${path}. Teach the Worker settings contract check about it before snapshotting.`
  );

const withNullable = <T extends SettingsNode>(node: T, nullable: boolean): T =>
  nullable ? { ...node, nullable: true } : node;

const normalizeNode = (value: unknown, path: string): SettingsNode => {
  if (!isRecord(value)) {
    throw unclassified('JSON Schema node', path);
  }
  if (Array.isArray(value.anyOf)) {
    const branches = value.anyOf.filter((branch) => !(isRecord(branch) && branch.type === 'null'));
    const rest = Object.keys(value).filter((key) => key !== 'anyOf' && key !== 'default');
    if (value.anyOf.length !== 2 || branches.length !== 1 || rest.length > 0) {
      throw unclassified('anyOf', path);
    }
    return withNullable(normalizeNode(branches[0], path), true);
  }

  const unknownKeys = Object.keys(value).filter((key) => !KNOWN_SCHEMA_KEYS.has(key));
  if (unknownKeys.length > 0) {
    throw unclassified(`JSON Schema keyword ${unknownKeys.join(', ')}`, path);
  }
  for (const key of NUMERIC_KEYWORDS) {
    if (Object.hasOwn(value, key) && typeof value[key] !== 'number') {
      throw unclassified(key, path);
    }
  }

  if (value.type === 'array') {
    if (!isRecord(value.items)) {
      throw unclassified('array items', path);
    }
    return {
      kind: 'array',
      items: normalizeNode(value.items, `${path}[]`),
      ...(typeof value.minItems === 'number' ? { minItems: value.minItems } : {}),
      ...(typeof value.maxItems === 'number' ? { maxItems: value.maxItems } : {}),
    };
  }

  if (value.type === 'object' || isRecord(value.properties)) {
    if (!isRecord(value.properties) || isRecord(value.additionalProperties)) {
      throw unclassified('object without fixed properties', path);
    }
    const fields: Record<string, SettingsNode> = {};
    for (const [key, child] of Object.entries(value.properties)) {
      fields[key] = normalizeNode(child, `${path}.${key}`);
    }
    const required = Array.isArray(value.required)
      ? value.required.filter((key): key is string => typeof key === 'string').sort()
      : [];
    return {
      kind: 'object',
      fields,
      required,
      additionalProperties: value.additionalProperties !== false,
    };
  }

  if (typeof value.type !== 'string') {
    throw unclassified('JSON Schema type', path);
  }
  if (Array.isArray(value.enum) && !value.enum.every(isScalar)) {
    throw unclassified('enum value', path);
  }
  const leaf: SettingsLeafContract = { kind: 'leaf', type: value.type };
  return {
    ...leaf,
    ...(Array.isArray(value.enum) ? { enum: value.enum.filter(isScalar) } : {}),
    ...(isScalar(value.const) ? { const: value.const } : {}),
    ...(typeof value.minimum === 'number' ? { minimum: value.minimum } : {}),
    ...(typeof value.maximum === 'number' ? { maximum: value.maximum } : {}),
    ...(typeof value.minLength === 'number' ? { minLength: value.minLength } : {}),
    ...(typeof value.maxLength === 'number' ? { maxLength: value.maxLength } : {}),
    ...(typeof value.pattern === 'string' ? { pattern: value.pattern } : {}),
  };
};

/** The input side of a settings schema: what a stored document must satisfy to be read. */
export const normalizeSettingsSchema = (schema: z.ZodType, label: string): SettingsNode =>
  normalizeNode(z.toJSONSchema(schema, { io: 'input' }), label);

export const buildWorkerSettingsContracts = (): WorkerSettingsContracts => {
  const contracts: Record<string, WorkerSettingsContract> = {};
  for (const workerId of [...SYSTEM_SECURITY_WORKER_IDS].sort()) {
    const schema = normalizeSettingsSchema(getCompleteWorkerSettingsSchema(workerId), workerId);
    if (schema.kind !== 'object') {
      throw new Error(`Settings schema for ${workerId} did not convert as an object`);
    }
    const autonomy = schema.fields.autonomy;
    const allowed = getAllowedAutonomyLevels(workerId);
    if (
      autonomy?.kind !== 'leaf' ||
      autonomy.enum === undefined ||
      !isEqual([...autonomy.enum].sort(), [...allowed].sort())
    ) {
      throw new Error(
        `Input schema autonomy for ${workerId} does not match its declaration (${allowed.join(
          ', '
        )}). The contract has to be the input side of the settings schema.`
      );
    }
    contracts[workerId] = { defaults: { ...createDefaultWorkerSettings(workerId) }, schema };
  }
  return contracts;
};

/** Paths the startup fill writes into a stored document that lacks them. Nothing else is filled. */
const isFilledAtStartup = (path: readonly string[]): boolean =>
  (path.length === 1 && (path[0] === 'scheduleInterval' || path[0] === 'extras')) ||
  (path.length === 2 && path[0] === 'extras');

const hasFilledDefault = (defaults: unknown, path: readonly string[]): boolean => {
  if (!isFilledAtStartup(path)) {
    return false;
  }
  const parent = path.length === 1 ? defaults : isRecord(defaults) ? defaults[path[0]] : undefined;
  return isRecord(parent) && Object.hasOwn(parent, path[path.length - 1]);
};

const pushBound = (
  changes: ContractChange[],
  label: string,
  name: string,
  previous: number | undefined,
  next: number | undefined,
  tighterWhenIncreased: boolean
): void => {
  if (previous === next) {
    return;
  }
  if (previous === undefined) {
    changes.push({ kind: 'breaking', text: `added a ${name} of ${String(next)} on ${label}` });
    return;
  }
  if (next === undefined) {
    changes.push({ kind: 'safe', text: `removed the ${name} of ${String(previous)} on ${label}` });
    return;
  }
  const tightened = tighterWhenIncreased ? next > previous : next < previous;
  changes.push({
    kind: tightened ? 'breaking' : 'safe',
    text: `${tightened ? 'tightened' : 'loosened'} ${label} ${name} from ${String(
      previous
    )} to ${String(next)}`,
    ...(tightened ? { mayBeLabelChange: true as const } : {}),
  });
};

const isWatchAutonomyLevel = (value: unknown): value is WatchAutonomyLevel =>
  typeof value === 'string' && (WATCH_AUTONOMY_LEVELS as readonly string[]).includes(value);

/**
 * A removed autonomy level is safe when a lower allowed level remains: the startup pass writes that
 * level into every document that stored the removed one, and the read returns the same.
 */
const pushRemovedAutonomyLevels = (
  removed: ReadonlyArray<string | number | boolean>,
  nextEnum: ReadonlyArray<string | number | boolean>,
  label: string,
  changes: ContractChange[]
): void => {
  const allowed = nextEnum.filter(isWatchAutonomyLevel);
  for (const level of removed) {
    const lowered = isWatchAutonomyLevel(level)
      ? nearestLowerAutonomyLevel(allowed, level)
      : undefined;
    changes.push(
      lowered === undefined
        ? {
            kind: 'breaking',
            text: `removed ${String(
              level
            )} from ${label} with no lower allowed level to move stored documents to`,
            mayBeLabelChange: true,
          }
        : {
            kind: 'safe',
            text: `removed ${String(level)} from ${label}. A stored ${String(
              level
            )} is lowered to ${lowered} at startup.`,
          }
    );
  }
};

const diffEnum = (
  previous: SettingsLeafContract,
  next: SettingsLeafContract,
  label: string,
  isAutonomy: boolean,
  changes: ContractChange[]
): void => {
  if (previous.enum === undefined && next.enum === undefined) {
    return;
  }
  if (previous.enum === undefined) {
    changes.push({
      kind: 'breaking',
      text: `restricted ${label} to ${next.enum?.map(String).join(', ')}`,
      mayBeLabelChange: true,
    });
    return;
  }
  if (next.enum === undefined) {
    changes.push({ kind: 'safe', text: `removed the allowed values of ${label}` });
    return;
  }
  const nextValues = new Set(next.enum.map(String));
  const previousValues = new Set(previous.enum.map(String));
  const removed = previous.enum.filter((entry) => !nextValues.has(String(entry)));
  const added = next.enum.filter((entry) => !previousValues.has(String(entry)));
  if (isAutonomy) {
    pushRemovedAutonomyLevels(removed, next.enum, label, changes);
  } else if (removed.length > 0) {
    changes.push({
      kind: 'breaking',
      text: `narrowed ${label}, removing ${removed.map(String).join(', ')}`,
      mayBeLabelChange: true,
    });
  }
  if (added.length > 0) {
    changes.push({
      kind: 'safe',
      text: `widened ${label}, adding ${added.map(String).join(', ')}`,
    });
  }
};

const diffNodes = (
  previous: SettingsNode,
  next: SettingsNode,
  label: string,
  path: readonly string[],
  nextDefaults: unknown,
  changes: ContractChange[]
): void => {
  if (previous.nullable !== next.nullable) {
    changes.push(
      next.nullable
        ? { kind: 'safe', text: `allowed null on ${label}` }
        : { kind: 'breaking', text: `stopped allowing null on ${label}` }
    );
  }
  if (previous.kind !== next.kind) {
    changes.push({
      kind: 'breaking',
      text: `retyped ${label} from ${previous.kind} to ${next.kind}`,
    });
    return;
  }
  if (previous.kind === 'leaf' && next.kind === 'leaf') {
    if (previous.type !== next.type) {
      changes.push({
        kind: 'breaking',
        text: `retyped ${label} from ${previous.type} to ${next.type}`,
      });
    }
    diffEnum(previous, next, label, path.join('.') === 'autonomy', changes);
    if (previous.const !== next.const) {
      changes.push({
        kind: 'breaking',
        text: `changed ${label} from ${JSON.stringify(previous.const)} to ${JSON.stringify(
          next.const
        )}`,
      });
    }
    pushBound(changes, label, 'minimum', previous.minimum, next.minimum, true);
    pushBound(changes, label, 'maximum', previous.maximum, next.maximum, false);
    pushBound(changes, label, 'minLength', previous.minLength, next.minLength, true);
    pushBound(changes, label, 'maxLength', previous.maxLength, next.maxLength, false);
    if (previous.pattern !== next.pattern) {
      changes.push(
        next.pattern === undefined
          ? { kind: 'safe', text: `removed the pattern of ${label}` }
          : { kind: 'breaking', text: `changed the pattern of ${label}` }
      );
    }
    return;
  }
  if (previous.kind === 'array' && next.kind === 'array') {
    diffNodes(previous.items, next.items, `${label}[]`, [...path, '[]'], undefined, changes);
    pushBound(changes, label, 'minItems', previous.minItems, next.minItems, true);
    pushBound(changes, label, 'maxItems', previous.maxItems, next.maxItems, false);
    return;
  }
  if (previous.kind !== 'object' || next.kind !== 'object') {
    return;
  }
  if (previous.additionalProperties !== next.additionalProperties) {
    changes.push(
      next.additionalProperties
        ? { kind: 'safe', text: `allowed extra keys on ${label}` }
        : { kind: 'breaking', text: `rejected extra keys on ${label}` }
    );
  }
  for (const key of Object.keys(previous.fields)) {
    if (!Object.hasOwn(next.fields, key)) {
      changes.push({
        kind: 'breaking',
        text: `removed ${label}.${key}`,
        field: { change: 'removed', path: [...path, key].join('.') },
        mayBeLabelChange: true,
      });
    }
  }
  for (const [key, child] of Object.entries(next.fields)) {
    const childLabel = `${label}.${key}`;
    const childPath = [...path, key];
    const required = next.required.includes(key);
    const filled = hasFilledDefault(nextDefaults, childPath);
    const previousChild = previous.fields[key];
    if (previousChild === undefined) {
      changes.push(
        required && !filled
          ? {
              kind: 'breaking',
              text: `added required ${childLabel} that the startup fill has no default for`,
              field: { change: 'added', path: childPath.join('.') },
            }
          : {
              kind: 'safe',
              text: required
                ? `added ${childLabel} with a default`
                : `added optional ${childLabel}`,
              field: { change: 'added', path: childPath.join('.') },
              ...(childPath.join('.') === 'scheduleInterval'
                ? { scheduleAdded: true as const }
                : {}),
            }
      );
      continue;
    }
    diffNodes(previousChild, child, childLabel, childPath, nextDefaults, changes);
    const wasRequired = previous.required.includes(key);
    if (!wasRequired && required) {
      changes.push(
        filled
          ? { kind: 'safe', text: `made ${childLabel} required, filled from its default` }
          : { kind: 'breaking', text: `made ${childLabel} required with no default` }
      );
    } else if (wasRequired && !required) {
      changes.push({ kind: 'safe', text: `made ${childLabel} optional` });
    }
  }
};

const FRESH_INSTALLS_ONLY = 'It applies to fresh installs only and never rewrites stored values.';

const diffDefaults = (
  previous: unknown,
  next: unknown,
  path: readonly string[],
  fieldChanges: ReadonlySet<string>,
  changes: ContractChange[]
): void => {
  const key = path.join('.');
  if (path.length > 0 && fieldChanges.has(key)) {
    return;
  }
  if (isRecord(previous) && isRecord(next)) {
    for (const child of new Set([...Object.keys(previous), ...Object.keys(next)])) {
      diffDefaults(previous[child], next[child], [...path, child], fieldChanges, changes);
    }
    return;
  }
  if (path.length > 0 && !isEqual(previous, next)) {
    changes.push({
      kind: 'safe',
      text: `default ${key} changed from ${JSON.stringify(previous)} to ${JSON.stringify(
        next
      )}. ${FRESH_INSTALLS_ONLY}`,
    });
  }
};

export const diffWorkerSettingsContracts = (
  previous: WorkerSettingsContracts,
  next: WorkerSettingsContracts
): ContractChange[] => {
  const changes: ContractChange[] = [];
  for (const workerId of [...new Set([...Object.keys(previous), ...Object.keys(next)])].sort()) {
    const before = previous[workerId];
    const after = next[workerId];
    if (before === undefined) {
      changes.push({ kind: 'safe', text: `added Worker ${workerId}` });
      continue;
    }
    if (after === undefined) {
      changes.push({ kind: 'breaking', text: `removed Worker ${workerId}` });
      continue;
    }
    const workerChanges: ContractChange[] = [];
    diffNodes(before.schema, after.schema, workerId, [], after.defaults, workerChanges);
    const fieldChanges = new Set(
      workerChanges.flatMap((change) => (change.field ? [change.field.path] : []))
    );
    diffDefaults(before.defaults, after.defaults, [], fieldChanges, workerChanges);
    changes.push(...workerChanges);
  }
  return changes;
};

export const breakingChanges = (changes: readonly ContractChange[]): ContractChange[] =>
  changes.filter((change) => change.kind === 'breaking');

/** The failure text for a diff between the committed snapshot and the current code. */
export const describeContractChanges = (changes: readonly ContractChange[]): string => {
  const breaking = breakingChanges(changes).length > 0;
  const lines = [
    breaking
      ? 'This change breaks stored Worker settings.'
      : 'This change is safe for stored Worker settings.',
    ...changes.map((change) => `- [${change.kind}] ${change.text}`),
    '',
  ];
  if (breaking) {
    lines.push(
      `Configured Workers that stored the old shape will show as unavailable. It needs ${BREAKING_CHANGE_EXITS}.`
    );
    if (changes.some((change) => change.kind === 'breaking' && change.mayBeLabelChange)) {
      lines.push('If only the label on the page should change, keep the stored key and value.');
    }
    lines.push(RECORD_A_RESET);
  } else {
    lines.push(`Update the snapshot with:\n${GENERATE_SETTINGS_CONTRACT_SNAPSHOT}`);
  }
  if (changes.some((change) => change.scheduleAdded)) {
    lines.push('A new schedule takes effect on the next save or enable in each space.');
  }
  return lines.join('\n');
};

/**
 * Against the base branch, a breaking diff must come with a newly recorded reset. Regenerating the
 * snapshot without the reset flag does not add one, so the reflexive fix stays red.
 */
export const unrecordedBreakingChange = (
  base: SettingsContractSnapshot,
  committed: SettingsContractSnapshot,
  current: WorkerSettingsContracts
): string | undefined => {
  const breaking = breakingChanges(diffWorkerSettingsContracts(base.workers, current));
  if (breaking.length === 0) {
    return undefined;
  }
  if (committed.preCustomerResets.length > base.preCustomerResets.length) {
    return undefined;
  }
  return [
    'This change breaks Worker settings stored by the base branch, and no reset was recorded.',
    ...breaking.map((change) => `- ${change.text}`),
    '',
    `It needs ${BREAKING_CHANGE_EXITS}.`,
    RECORD_A_RESET,
  ].join('\n');
};

export const parseSettingsContractSnapshot = (text: string): SettingsContractSnapshot => {
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed) || !Array.isArray(parsed.preCustomerResets) || !isRecord(parsed.workers)) {
    throw new Error(
      `${SETTINGS_CONTRACT_SNAPSHOT_FILE} is not a settings contract snapshot. Regenerate it with:\n${GENERATE_SETTINGS_CONTRACT_SNAPSHOT}`
    );
  }
  return parsed as unknown as SettingsContractSnapshot;
};
