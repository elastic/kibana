/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The Worker settings contract, committed as `settings_contract.snapshot.json`: each Worker's own
 * settings schema and defaults, plus the two shared schemas every stored document and save goes
 * through (`WorkerSettings`, the second stage of every complete schema, and `WorkerSettingsWrite`,
 * the save request body). Validation JSON Schema cannot express (refinements, transforms) is
 * rejected when the contract is built, because a change to it could not be compared.
 */

import { isEqual } from 'lodash';
import {
  SYSTEM_SECURITY_WORKER_IDS,
  WATCH_AUTONOMY_LEVELS,
  createDefaultWorkerSettings,
  getAllowedAutonomyLevels,
  getCompleteWorkerSettingsSchema,
  nearestLowerAutonomyLevel,
  WorkerSettings,
  WorkerSettingsWrite,
  type WatchAutonomyLevel,
} from '@kbn/alertzero-common';
import { z } from '@kbn/zod/v4';

export const MIGRATION_ISSUE = 'https://github.com/elastic/security-team/issues/19312';

export const BREAKING_CHANGE_REMEDIES = `a migration under ${MIGRATION_ISSUE} (not built yet), or, before customers exist, a coordinated reset (plugin README, "Pre-customer state")`;

export const SETTINGS_CONTRACT_SNAPSHOT_FILE = 'settings_contract.snapshot.json';

const COMPAT_TEST =
  'x-pack/solutions/security/plugins/alertzero/server/managed_workflows/workers/worker_settings_compat.test.ts';

/** Set to `true` to make the compatibility test rewrite the snapshot instead of comparing it. */
export const UPDATE_SETTINGS_CONTRACT_ENV = 'UPDATE_WORKER_SETTINGS_CONTRACT';

/** Accepts a breaking change and records the issue where the coordinated reset was agreed. */
export const ACCEPT_BREAKING_CHANGE_ENV = 'ACCEPT_WORKER_SETTINGS_BREAKING_CHANGE';

export const UPDATE_SETTINGS_CONTRACT_COMMAND = `${UPDATE_SETTINGS_CONTRACT_ENV}=true node scripts/jest ${COMPAT_TEST}`;

export const ACCEPT_BREAKING_CHANGE_COMMAND = `${UPDATE_SETTINGS_CONTRACT_ENV}=true ${ACCEPT_BREAKING_CHANGE_ENV}=<issue-url> node scripts/jest ${COMPAT_TEST}`;

const ACCEPT_BREAKING_CHANGE_INSTRUCTIONS = `Before customers exist, a breaking change can go in only with a coordinated reset of the affected environments. Agree it with the Common Worker Layer team on an issue, then run:\n${ACCEPT_BREAKING_CHANGE_COMMAND}`;

const TAKES_EFFECT_ON_NEXT_SAVE =
  'Scheduled runs pick this up on the next save or enable in each space, because re-rendering the workflow does not reschedule it.';

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

export interface SharedSettingsContract {
  /** The second stage of every complete schema, so it validates every stored document too. */
  storedSettings: SettingsObjectContract;
  /** The `settings` body of a save request, validated before the patch is applied. */
  settingsWrite: SettingsObjectContract;
}

export interface SettingsContract {
  shared: SharedSettingsContract;
  workers: WorkerSettingsContracts;
}

export interface AcceptedBreakingChange {
  /** The issue where the reset was agreed and the affected environments are listed. */
  issue: string;
  changes: readonly string[];
}

export interface SettingsContractSnapshot {
  /** Append-only; the base-branch check requires the base branch's entries as a prefix. */
  acceptedBreakingChanges: readonly AcceptedBreakingChange[];
  /** Absent only in snapshots written before the shared schemas were recorded. */
  shared?: SharedSettingsContract;
  workers: WorkerSettingsContracts;
}

export interface ContractChange {
  kind: 'safe' | 'breaking';
  text: string;
  /** Set only when a schema field was added or removed, so the defaults diff can skip it. */
  field?: { change: 'added' | 'removed'; path: string };
  /** A removal or a narrowing, where keeping the stored key and changing only the label may be the fix. */
  mayBeLabelChange?: true;
  /** Printed once under the change list. */
  note?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isScalar = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

const unclassified = (what: string, path: string): Error =>
  new Error(
    `Unclassified ${what} at ${path}. Teach the Worker settings contract check about it before snapshotting.`
  );

interface ZodDefinition {
  type: string;
  checks?: ReadonlyArray<{ _zod: { def: { check: string; format?: string; pattern?: RegExp } } }>;
  [key: string]: unknown;
}

const zodDefinition = (schema: unknown): ZodDefinition =>
  (schema as { _zod: { def: ZodDefinition } })._zod.def;

/** Checks `z.toJSONSchema` turns into keywords the classifier compares, or rejects loudly. */
const COMPARABLE_CHECKS = new Set([
  'min_length',
  'max_length',
  'length_equals',
  'greater_than',
  'less_than',
  'number_format',
  'multiple_of',
]);

const LEAF_TYPES = new Set(['string', 'number', 'boolean', 'enum', 'literal', 'unknown', 'never']);

const WRAPPER_TYPES = new Set(['optional', 'nullable', 'default']);

const cannotCompare = (what: string, path: string): Error =>
  new Error(
    `Cannot establish settings compatibility at ${path}: it uses ${what}, which JSON Schema cannot express, so a change to it would pass unnoticed. This is not a breaking change and cannot be accepted. Express the constraint as a bound, an enum or a pattern, or teach test_helpers/settings_contract.ts to compare it.`
  );

/**
 * `z.toJSONSchema` silently drops refinements, transforms and pipes, so every validation a stored
 * document or a save goes through must be one the JSON Schema form carries.
 */
export const assertComparableValidation = (schema: unknown, path: string): void => {
  const definition = zodDefinition(schema);
  for (const check of definition.checks ?? []) {
    const { check: kind, format, pattern } = check._zod.def;
    // JSON Schema `pattern` carries the regex source only, so flags would drop out of the contract.
    if (kind === 'string_format' && pattern instanceof RegExp && pattern.flags !== '') {
      throw cannotCompare(`a regex with flags (/${pattern.source}/${pattern.flags})`, path);
    }
    if (kind === 'string_format' ? format !== 'regex' : !COMPARABLE_CHECKS.has(kind)) {
      throw cannotCompare(
        kind === 'custom'
          ? 'a refinement (.refine, .superRefine or .check)'
          : `a ${kind}${format ? ` (${format})` : ''} check`,
        path
      );
    }
  }
  const { type } = definition;
  if (LEAF_TYPES.has(type)) {
    return;
  }
  if (WRAPPER_TYPES.has(type)) {
    assertComparableValidation(definition.innerType, path);
    return;
  }
  if (type === 'array') {
    assertComparableValidation(definition.element, `${path}[]`);
    return;
  }
  if (type === 'union' && Array.isArray(definition.options)) {
    definition.options.forEach((option) => assertComparableValidation(option, path));
    return;
  }
  if (type === 'object' && isRecord(definition.shape)) {
    for (const [key, child] of Object.entries(definition.shape)) {
      assertComparableValidation(child, `${path}.${key}`);
    }
    if (definition.catchall !== undefined) {
      assertComparableValidation(definition.catchall, `${path}.*`);
    }
    return;
  }
  throw cannotCompare(
    type === 'pipe' || type === 'transform'
      ? 'a transform, preprocess or pipe'
      : `a ${type} schema`,
    path
  );
};

/** The Worker's own stage of its complete schema; the second stage must be the shared schema. */
export const workerStageOf = (workerId: string, complete: z.ZodType): z.ZodType => {
  const definition = zodDefinition(complete);
  if (definition.type !== 'pipe' || definition.out !== WorkerSettings) {
    throw cannotCompare(
      'a complete schema that is not its own object piped into WorkerSettings',
      workerId
    );
  }
  if ((definition.checks ?? []).length > 0) {
    throw cannotCompare(
      'a refinement (.refine, .superRefine or .check) on the complete schema',
      workerId
    );
  }
  return definition.in as z.ZodType;
};

const normalizeObject = (schema: z.ZodType, label: string): SettingsObjectContract => {
  assertComparableValidation(schema, label);
  const node = normalizeSettingsSchema(schema, label);
  if (node.kind !== 'object') {
    throw new Error(`Settings schema ${label} did not convert as an object`);
  }
  return node;
};

export const buildSharedSettingsContract = (): SharedSettingsContract => ({
  storedSettings: normalizeObject(WorkerSettings, 'WorkerSettings'),
  settingsWrite: normalizeObject(WorkerSettingsWrite, 'WorkerSettingsWrite'),
});

const withNullable = <T extends SettingsNode>(node: T, nullable: boolean): T =>
  nullable ? { ...node, nullable: true } : node;

const normalizeNode = (value: unknown, path: string): SettingsNode => {
  if (!isRecord(value)) {
    throw unclassified('JSON Schema node', path);
  }
  if (Array.isArray(value.anyOf)) {
    const branches = value.anyOf.filter((branch) => !(isRecord(branch) && branch.type === 'null'));
    const rest = Object.keys(value).filter(
      (key) => !['anyOf', 'default', 'description', 'title'].includes(key)
    );
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
    // `additionalProperties: {}` is an open object (any extra key), as in the shared `extras`.
    const openToAnything =
      isRecord(value.additionalProperties) && Object.keys(value.additionalProperties).length === 0;
    if (!isRecord(value.properties) || (isRecord(value.additionalProperties) && !openToAnything)) {
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

export const toInputJsonSchema = (schema: z.ZodType): unknown =>
  z.toJSONSchema(schema, { io: 'input' });

/** The input side of a settings schema: what a stored document must satisfy to be read. */
export const normalizeSettingsSchema = (schema: z.ZodType, label: string): SettingsNode =>
  normalizeNode(toInputJsonSchema(schema), label);

/** Property paths that carry a JSON Schema `default`, which zod applies on read. */
const schemaDefaultPaths = (value: unknown, path: readonly string[]): string[][] => {
  if (!isRecord(value)) {
    return [];
  }
  const own = path.length > 0 && Object.hasOwn(value, 'default') ? [[...path]] : [];
  const properties = isRecord(value.properties)
    ? Object.entries(value.properties).flatMap(([key, child]) =>
        schemaDefaultPaths(child, [...path, key])
      )
    : [];
  const branches = Array.isArray(value.anyOf)
    ? value.anyOf.flatMap((branch) => (isRecord(branch) ? schemaDefaultPaths(branch, path) : []))
    : [];
  return [...own, ...properties, ...branches];
};

const hasValueAt = (value: unknown, path: readonly string[]): boolean => {
  let cursor = value;
  for (const key of path) {
    if (!isRecord(cursor) || !Object.hasOwn(cursor, key)) {
      return false;
    }
    cursor = cursor[key];
  }
  return true;
};

/**
 * Throws when the schema has a default the read path would apply but the renderer would not: one the
 * declaration lacks, or one deeper than the stored-settings upgrade fills.
 */
export const assertSchemaDefaultsDeclared = (
  label: string,
  jsonSchema: unknown,
  defaults: Readonly<Record<string, unknown>>
): void => {
  const paths = schemaDefaultPaths(jsonSchema, []);
  const unfilled = paths.filter((path) => !isFilledFromDefaults(path));
  if (unfilled.length > 0) {
    throw new Error(
      `The settings schema for ${label} has a default for ${unfilled
        .map((path) => path.join('.'))
        .join(
          ', '
        )}, where stored settings are not filled from defaults (only scheduleInterval, extras and extras.<key> are). The read path would show that default while the rendered workflow does not, so declare the default at one of those paths instead.`
    );
  }
  const undeclared = paths.filter((path) => !hasValueAt(defaults, path));
  if (undeclared.length > 0) {
    throw new Error(
      `The settings schema for ${label} has a default for ${undeclared
        .map((path) => path.join('.'))
        .join(
          ', '
        )} that its declaration does not. Stored documents and the running workflow get declaration defaults only, so add it to the declaration.`
    );
  }
};

export const buildWorkerSettingsContracts = (): WorkerSettingsContracts => {
  const contracts: Record<string, WorkerSettingsContract> = {};
  for (const workerId of [...SYSTEM_SECURITY_WORKER_IDS].sort()) {
    const complete = getCompleteWorkerSettingsSchema(workerId);
    assertComparableValidation(workerStageOf(workerId, complete), workerId);
    const jsonSchema = toInputJsonSchema(complete);
    const defaults = { ...createDefaultWorkerSettings(workerId) };
    assertSchemaDefaultsDeclared(workerId, jsonSchema, defaults);
    const schema = normalizeNode(jsonSchema, workerId);
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
    contracts[workerId] = { defaults, schema };
  }
  return contracts;
};

export const buildSettingsContract = (): SettingsContract => ({
  shared: buildSharedSettingsContract(),
  workers: buildWorkerSettingsContracts(),
});

/** Must match the keys `upgradeStoredWorkerSettings` fills in `worker_settings_defaults.ts`. */
const isFilledFromDefaults = (path: readonly string[]): boolean =>
  (path.length === 1 && (path[0] === 'scheduleInterval' || path[0] === 'extras')) ||
  (path.length === 2 && path[0] === 'extras');

const hasFilledDefault = (defaults: unknown, path: readonly string[]): boolean => {
  if (!isFilledFromDefaults(path)) {
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
 * A removed autonomy level is safe when a lower allowed level remains: the read path and the
 * renderer both lower a stored removed level to it.
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
            )} is read and rendered as ${lowered}.`,
            note: TAKES_EFFECT_ON_NEXT_SAVE,
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
    if (Object.hasOwn(next.fields, key)) {
      continue;
    }
    const field = { change: 'removed' as const, path: [...path, key].join('.') };
    changes.push(
      field.path === 'extras'
        ? {
            kind: 'safe',
            text: `removed ${label}.${key}. Stored extras are ignored on read and render.`,
            field,
          }
        : { kind: 'breaking', text: `removed ${label}.${key}`, field, mayBeLabelChange: true }
    );
  }
  for (const [key, child] of Object.entries(next.fields)) {
    const childLabel = `${label}.${key}`;
    const childPath = [...path, key];
    const required = next.required.includes(key);
    const filled = hasFilledDefault(nextDefaults, childPath);
    const previousChild = previous.fields[key];
    if (previousChild === undefined && previous.additionalProperties) {
      // The key was already accepted with any value, so giving it a schema can only narrow it.
      changes.push({
        kind: 'breaking',
        text: `constrained ${childLabel}, a key ${label} used to accept with any value`,
        field: { change: 'added', path: childPath.join('.') },
      });
      continue;
    }
    if (previousChild === undefined) {
      changes.push(
        required && !filled
          ? {
              kind: 'breaking',
              text: `added required ${childLabel} with no declaration default to fill stored documents from`,
              field: { change: 'added', path: childPath.join('.') },
            }
          : {
              kind: 'safe',
              text: required
                ? `added ${childLabel} with a default`
                : `added optional ${childLabel}`,
              field: { change: 'added', path: childPath.join('.') },
              ...(childPath.join('.') === 'scheduleInterval'
                ? { note: TAKES_EFFECT_ON_NEXT_SAVE }
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

const DEFAULT_CHANGE_REACH =
  'It applies to fresh installs and to every stored document that does not hold the field; a stored value always wins.';

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
      )}. ${DEFAULT_CHANGE_REACH}`,
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

const diffSharedSettingsContracts = (
  previous: SharedSettingsContract | undefined,
  next: SharedSettingsContract
): ContractChange[] => {
  if (previous === undefined) {
    return [
      { kind: 'safe', text: 'recorded the shared WorkerSettings and WorkerSettingsWrite schemas' },
    ];
  }
  const changes: ContractChange[] = [];
  diffNodes(
    previous.storedSettings,
    next.storedSettings,
    'WorkerSettings',
    ['WorkerSettings'],
    undefined,
    changes
  );
  diffNodes(
    previous.settingsWrite,
    next.settingsWrite,
    'WorkerSettingsWrite',
    ['WorkerSettingsWrite'],
    undefined,
    changes
  );
  return changes;
};

/** The shared schemas first, then each Worker's own. */
export const diffSettingsContracts = (
  previous: Pick<SettingsContractSnapshot, 'shared' | 'workers'>,
  next: SettingsContract
): ContractChange[] => [
  ...diffSharedSettingsContracts(previous.shared, next.shared),
  ...diffWorkerSettingsContracts(previous.workers, next.workers),
];

export const breakingChanges = (changes: readonly ContractChange[]): ContractChange[] =>
  changes.filter((change) => change.kind === 'breaking');

/** The failure text for a diff between the committed snapshot and the current code. */
export const describeContractChanges = (changes: readonly ContractChange[]): string => {
  const breaking = breakingChanges(changes).length > 0;
  const lines = [
    breaking
      ? 'This change breaks stored Worker settings or the saves that change them.'
      : 'This change is safe for stored Worker settings.',
    ...changes.map((change) => `- [${change.kind}] ${change.text}`),
    '',
  ];
  if (breaking) {
    lines.push(
      `Configured Workers that stored the old shape will show as unavailable, or settings saves that used to pass are rejected. It needs ${BREAKING_CHANGE_REMEDIES}.`
    );
    if (changes.some((change) => change.kind === 'breaking' && change.mayBeLabelChange)) {
      lines.push('If only the label on the page should change, keep the stored key and value.');
    }
    lines.push(ACCEPT_BREAKING_CHANGE_INSTRUCTIONS);
  } else {
    lines.push(`Update the snapshot with:\n${UPDATE_SETTINGS_CONTRACT_COMMAND}`);
  }
  lines.push(...new Set(changes.flatMap((change) => (change.note ? [change.note] : []))));
  return lines.join('\n');
};

const keepsBaseEntries = (
  base: SettingsContractSnapshot,
  committed: SettingsContractSnapshot
): boolean =>
  isEqual(
    committed.acceptedBreakingChanges.slice(0, base.acceptedBreakingChanges.length),
    base.acceptedBreakingChanges
  );

/**
 * Breaking changes against the base branch that no entry this branch added lists. An entry covers a
 * change only by naming it, so an empty or partial entry does not hide a break.
 */
const unacceptedAtBase = (
  base: SettingsContractSnapshot,
  committed: SettingsContractSnapshot,
  current: SettingsContract
): ContractChange[] => {
  const accepted = new Set(
    committed.acceptedBreakingChanges
      .slice(base.acceptedBreakingChanges.length)
      .flatMap((entry) => entry.changes)
  );
  return breakingChanges(diffSettingsContracts(base, current)).filter(
    (change) => !accepted.has(change.text)
  );
};

/**
 * Against the base branch: accepted entries stay append-only, and every breaking change is listed in
 * an entry this branch added. Regenerating the snapshot without accepting does not add one, so the
 * reflexive fix stays red.
 */
export const describeBaseBranchFailure = (
  base: SettingsContractSnapshot,
  committed: SettingsContractSnapshot,
  current: SettingsContract
): string | undefined => {
  if (!keepsBaseEntries(base, committed)) {
    return `acceptedBreakingChanges in ${SETTINGS_CONTRACT_SNAPSHOT_FILE} must start with every entry the base branch has, unchanged. Restore them from the base branch.`;
  }
  const breaking = unacceptedAtBase(base, committed, current);
  if (breaking.length === 0) {
    return undefined;
  }
  return [
    'This change breaks Worker settings stored by the base branch, and no entry this branch added to acceptedBreakingChanges lists it.',
    ...breaking.map((change) => `- ${change.text}`),
    '',
    `It needs ${BREAKING_CHANGE_REMEDIES}.`,
    ACCEPT_BREAKING_CHANGE_INSTRUCTIONS,
  ].join('\n');
};

const ELASTIC_ISSUE_OR_PR_URL = /^https:\/\/github\.com\/elastic\/[\w.-]+\/(issues|pull)\/\d+$/;

/** The issue URL set in the accept variable, or undefined when it is not set. */
export const parseAcceptedIssue = (value: string | undefined): string | undefined => {
  if (value === undefined || value === '') {
    return undefined;
  }
  if (!ELASTIC_ISSUE_OR_PR_URL.test(value)) {
    throw new Error(
      `${ACCEPT_BREAKING_CHANGE_ENV} must be the GitHub issue where the reset was agreed, for example https://github.com/elastic/security-team/issues/12345`
    );
  }
  return value;
};

/**
 * The snapshot the compatibility test writes in update mode. Breaking changes are computed against
 * the base branch when it is available, so the recorded lines are the ones the base-branch check
 * requires; otherwise against the committed snapshot. They are refused without an accepted issue.
 */
export const nextSettingsContractSnapshot = ({
  committed,
  current,
  base,
  acceptedIssue,
}: {
  committed: SettingsContractSnapshot;
  current: SettingsContract;
  base?: SettingsContractSnapshot;
  acceptedIssue?: string;
}): SettingsContractSnapshot => {
  const breaking =
    base === undefined
      ? breakingChanges(diffSettingsContracts(committed, current))
      : unacceptedAtBase(base, committed, current);
  if (breaking.length > 0 && acceptedIssue === undefined) {
    throw new Error(
      [
        'Refusing to update the snapshot: this change breaks stored Worker settings or the saves that change them.',
        ...breaking.map((change) => `- ${change.text}`),
        '',
        `It needs ${BREAKING_CHANGE_REMEDIES}. For a reset, agree it on an issue and run:`,
        ACCEPT_BREAKING_CHANGE_COMMAND,
      ].join('\n')
    );
  }
  if (acceptedIssue !== undefined && breaking.length === 0) {
    throw new Error(
      `${ACCEPT_BREAKING_CHANGE_ENV} was set, but nothing in this change breaks stored Worker settings.`
    );
  }
  return {
    acceptedBreakingChanges: [
      ...committed.acceptedBreakingChanges,
      ...(acceptedIssue === undefined
        ? []
        : [{ issue: acceptedIssue, changes: breaking.map((change) => change.text) }]),
    ],
    shared: current.shared,
    workers: current.workers,
  };
};

export const parseSettingsContractSnapshot = (text: string): SettingsContractSnapshot => {
  const parsed: unknown = JSON.parse(text);
  if (
    !isRecord(parsed) ||
    !Array.isArray(parsed.acceptedBreakingChanges) ||
    !isRecord(parsed.workers)
  ) {
    throw new Error(
      `${SETTINGS_CONTRACT_SNAPSHOT_FILE} is not a settings contract snapshot. Regenerate it with:\n${UPDATE_SETTINGS_CONTRACT_COMMAND}`
    );
  }
  return parsed as unknown as SettingsContractSnapshot;
};
