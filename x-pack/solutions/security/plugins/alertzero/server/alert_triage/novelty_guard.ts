/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The novelty guard of the verdict cache. A strict key says which alerts look alike. It does not hold every field, so a bad
 * variant can share the key of a benign pattern: a new hash on a signed binary, an encoded command line, a new destination.
 * The record of a key keeps the values it has seen in those fields. An alert with a value that the record never saw is a guard
 * hit, and in "on" mode it would go to full analysis. The module is pure: an alert document in, field lists out.
 *
 * Fields that fire are listed in `FIRING_FIELDS`. `user.name` and `host.name` are recorded but never fire, because benign
 * software runs on many users and hosts, so each new one would look new. The shadow run shows how often they are new.
 */

import { createHash } from 'crypto';
import {
  buildPatternKeys,
  describePatternKey,
  getField,
  normalizeKeyValue,
  type PatternKeyKind,
  type PatternKeyPathKind,
} from './pattern_key';
import { VERDICT_CACHE_NOVELTY_CAP } from './verdict_cache';

export const NOVELTY_GUARD = 'novelty';

/** The tag of an alert that a guard fired on: `az:guard_hit:<guard>:<field>`. The alert is still analyzed in shadow mode. */
export const GUARD_HIT_TAG_PREFIX = 'az:guard_hit:';

export const guardHitTag = (guard: string, field: string): string =>
  `${GUARD_HIT_TAG_PREFIX}${guard}:${field}`;

/** Names of the novelty fields in the record. The names stay the same for every kind of key, the source field depends on it. */
export const NOVELTY_FIELD = {
  hash: 'hash',
  trusted: 'trusted',
  parent: 'parent_executable',
  commandLine: 'command_line_shape',
  destinationIp: 'destination.ip',
  destinationDomain: 'destination.domain',
  user: 'user.name',
  host: 'host.name',
} as const;

export const FIRING_FIELDS: readonly string[] = [
  NOVELTY_FIELD.hash,
  NOVELTY_FIELD.trusted,
  NOVELTY_FIELD.parent,
  NOVELTY_FIELD.commandLine,
  NOVELTY_FIELD.destinationIp,
  NOVELTY_FIELD.destinationDomain,
];

export const RECORDED_ONLY_FIELDS: readonly string[] = [NOVELTY_FIELD.user, NOVELTY_FIELD.host];

const HASH_FIELD: Record<PatternKeyPathKind, string> = {
  process: 'process.hash.sha256',
  registry: 'process.hash.sha256',
  file: 'file.hash.sha256',
  library: 'dll.hash.sha256',
};

const TRUSTED_FIELD: Record<PatternKeyPathKind, string> = {
  process: 'process.code_signature.trusted',
  registry: 'process.code_signature.trusted',
  file: 'process.code_signature.trusted',
  library: 'dll.code_signature.trusted',
};

const PARENT_FIELD = 'process.parent.executable';
const COMMAND_LINE_FIELD = 'process.command_line';

/** Every alert field the guard reads, so that a search can fetch them. */
export const NOVELTY_SOURCE_FIELDS: readonly string[] = [
  ...new Set([
    ...Object.values(HASH_FIELD),
    ...Object.values(TRUSTED_FIELD),
    PARENT_FIELD,
    COMMAND_LINE_FIELD,
    'destination.ip',
    'destination.domain',
    'user.name',
    'host.name',
    'host.os.type',
  ]),
];

const BASE64_RUN = /[A-Za-z0-9+/=]{20,}/g;
const WINDOWS_PROFILE = /\b([a-z]:\\users\\)[^\\\s"']+/g;
const UNIX_PROFILE = /(\/(?:users|home)\/)[^/\s"']+/g;
const TEMP_PATH = /(?:[a-z]:\\[^\s"']*\\temp\\|\/var\/tmp\/|\/tmp\/)[^\s"']*/g;
const GUID = /\{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}?/g;
const HEX = /\b[0-9a-f]{8,}\b/g;
const QUOTED = /"[^"]*"|'[^']*'/g;
const NUMBER = /\b\d+\b/g;

/** A run is Base64-like when it has upper case letters, lower case letters and digits. A long plain word has no digits. */
const isBase64Like = (token: string): boolean =>
  /[A-Z]/.test(token) && /[a-z]/.test(token) && /\d/.test(token);

/**
 * The shape of a command line: what stays when values that change from run to run are replaced. An encoded PowerShell command
 * becomes `powershell.exe -enc <b64>`. The shape hides the path inside quotes, so a different script run with the same
 * switches has the same shape.
 */
export const commandLineShape = (commandLine: string): string =>
  commandLine
    // Base64 first: lower casing would take the mixed case away.
    .replace(BASE64_RUN, (token) => (isBase64Like(token) ? '<b64>' : token))
    .toLowerCase()
    .replace(WINDOWS_PROFILE, '$1<user>')
    .replace(UNIX_PROFILE, '$1<user>')
    .replace(TEMP_PATH, '<tmp>')
    .replace(GUID, '<guid>')
    .replace(HEX, '<hex>')
    .replace(QUOTED, '<q>')
    .replace(NUMBER, '<n>')
    .replace(/\s+/g, ' ')
    .trim();

/** The record keeps a short hash of the shape, not the text of a command line. */
const shapeHash = (shape: string): string =>
  createHash('sha256').update(shape).digest('hex').slice(0, 16);

type NoveltyValues = Record<string, string[]>;

const present = (value: unknown): value is string | number | boolean =>
  value !== undefined && value !== null && value !== '';

/**
 * The values of an alert in the novelty fields, by field name of the record. A field the alert does not have is left out.
 * `kind` is the kind of the strict key of the alert, which says which hash and signature fields apply.
 */
export const noveltyValuesOf = (
  doc: Readonly<Record<string, unknown>>,
  kind: PatternKeyKind
): NoveltyValues => {
  const record = doc as Record<string, unknown>;
  const osType = getField(record, 'host.os.type');
  const values: NoveltyValues = {};
  const add = (name: string, value: unknown, transform: (raw: string) => string = String): void => {
    if (present(value)) values[name] = [transform(String(value))];
  };

  // A cloud alert has no process, file or library, so only the destination, user and host apply to it.
  if (kind !== 'cloud') {
    add(NOVELTY_FIELD.hash, getField(record, HASH_FIELD[kind]), (raw) => raw.toLowerCase());
    add(NOVELTY_FIELD.trusted, getField(record, TRUSTED_FIELD[kind]));
    // The process key holds the parent already, so a new parent is a new key and not a guard hit.
    if (kind !== 'process') {
      add(NOVELTY_FIELD.parent, getField(record, PARENT_FIELD), (raw) =>
        normalizeKeyValue(PARENT_FIELD, raw, osType)
      );
    }
    add(NOVELTY_FIELD.commandLine, getField(record, COMMAND_LINE_FIELD), (raw) =>
      shapeHash(commandLineShape(raw))
    );
  }
  add(NOVELTY_FIELD.destinationIp, getField(record, 'destination.ip'));
  add(NOVELTY_FIELD.destinationDomain, getField(record, 'destination.domain'), (raw) =>
    raw.toLowerCase()
  );
  add(NOVELTY_FIELD.user, getField(record, 'user.name'));
  add(NOVELTY_FIELD.host, getField(record, 'host.name'));
  return values;
};

export interface NoveltyCheck {
  /** Fields where the alert has a value that the record never saw. */
  fired: string[];
  /** Fields whose list is full, so a new value is not told from an old one that was dropped. */
  notChecked: string[];
}

/**
 * Compares an alert with the novelty lists of a record. A field fires when the alert has a value and the list does not.
 * A full list (the cap) is not checked. A field that the alert does not have, and the recorded-only fields, never fire.
 */
export const checkNovelty = ({
  lists,
  values,
  cap = VERDICT_CACHE_NOVELTY_CAP,
}: {
  lists: Readonly<Record<string, readonly string[]>>;
  values: Readonly<Record<string, readonly string[]>>;
  cap?: number;
}): NoveltyCheck => {
  const check: NoveltyCheck = { fired: [], notChecked: [] };
  for (const field of FIRING_FIELDS) {
    const [value] = values[field] ?? [];
    if (value === undefined) continue;
    const known = lists[field] ?? [];
    if (known.length >= cap) check.notChecked.push(field);
    else if (!known.includes(value)) check.fired.push(field);
  }
  return check;
};

/** The novelty values of an alert, by the kind of its own strict key. An alert with no strict key has no values. */
export const noveltyValuesOfAlert = (doc: Readonly<Record<string, unknown>>): NoveltyValues => {
  const { strict } = buildPatternKeys(doc as Record<string, unknown>);
  return strict === undefined
    ? {}
    : noveltyValuesOf(doc, describePatternKey(strict).kind as PatternKeyKind);
};
