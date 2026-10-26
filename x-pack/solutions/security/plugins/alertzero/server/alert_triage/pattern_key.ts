/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The definition of "same pattern" for Alert Triage: grouping, the back-test and Decisions all
 * import it, so they cannot drift apart. It is pure (alert document in, key out) and has no model.
 *
 * Two levels of one key:
 * - strict: the rule, the detection and the normalised values of a fixed field set. An alert with
 *   no identifying field (path) has no strict key, so a Decision can never match "the whole rule".
 * - wide: the strict condition with the executable and file path cut to their folder. Missing
 *   fields are empty values, so an alert with none of them gets `rule + detection`.
 *
 * The Python prototype in `grouping-prototype/` is the reference. The parity test checks both agree.
 */

type AlertDocument = Record<string, unknown>;

export interface PatternKeys {
  /** Absent when the alert has no identifying field. */
  strict?: string;
  wide: string;
}

type Kind = 'library' | 'registry' | 'file' | 'process';

/** Most specific first, process last: file, library and registry events also carry `process.executable`. */
const KINDS: readonly Kind[] = ['library', 'registry', 'file', 'process'];

interface FieldSet {
  fields: readonly string[];
  identifying: string;
  /** Added to the key when the signer is missing, because an unsigned binary has no signer to rely on. */
  hash?: string;
}

const FIELD_SETS: Record<Kind, FieldSet> = {
  library: {
    fields: ['dll.path', 'dll.code_signature.subject_name'],
    identifying: 'dll.path',
    hash: 'dll.hash.sha256',
  },
  registry: { fields: ['registry.path', 'process.executable'], identifying: 'registry.path' },
  file: {
    fields: ['file.path', 'process.executable'],
    identifying: 'file.path',
    hash: 'file.hash.sha256',
  },
  process: {
    fields: [
      'process.executable',
      'process.code_signature.subject_name',
      'process.parent.executable',
    ],
    identifying: 'process.executable',
    hash: 'process.hash.sha256',
  },
};

const SIGNER_SUFFIX = 'subject_name';
const WIDE_PATH_FIELDS = ['process.executable', 'file.path'];

const RULE_UUID = 'kibana.alert.rule.uuid';
const RULE_REVISION = 'kibana.alert.rule.revision';
const NAME_OVERRIDE = 'kibana.alert.rule.rule_name_override';

/** Reads `a.b.c` from a flat dotted key or a nested object. A list resolves to its first element. */
export const getField = (doc: AlertDocument, path: string): unknown => {
  const first = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value);
  if (path in doc) return first(doc[path]);
  const found = path.split('.').reduce<unknown>((value, key) => {
    const current = first(value);
    return typeof current === 'object' && current !== null
      ? (current as AlertDocument)[key]
      : undefined;
  }, doc);
  return first(found);
};

const isPresent = (value: unknown): boolean =>
  value !== undefined && value !== null && value !== '';

/**
 * Defend's own detection (`rule.id`, else `event.code`) for rules that override the alert name.
 * All Defend alerts share one rule uuid, so the uuid alone would mix malware, memory and behaviour
 * detections. Empty for every other rule.
 */
export const getDetection = (doc: AlertDocument): string => {
  if (!isPresent(getField(doc, NAME_OVERRIDE))) return '';
  const detection = getField(doc, 'rule.id') || getField(doc, 'event.code');
  return isPresent(detection) ? String(detection) : '';
};

const GUID = /\{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}?/gi;
const WINDOWS_PROFILE = /^(c:\\users\\)[^\\]+/i;
const UNIX_PROFILE = /^(\/(?:Users|home)\/)[^/]+/;
const SID = /s-\d-\d+(?:-\d+)+/g;
const REGISTRY_HIVES: ReadonlyArray<readonly [RegExp, string]> = [
  [/^hkey_local_machine(?=\\|$)/, 'hklm'],
  [/^hkey_current_user(?=\\|$)/, 'hkcu'],
  [/^hkey_classes_root(?=\\|$)/, 'hkcr'],
  [/^hkey_current_config(?=\\|$)/, 'hkcc'],
  [/^hkey_users(?=\\|$)/, 'hku'],
];

const normalizeRegistry = (value: string): string =>
  REGISTRY_HIVES.reduce((path, [hive, short]) => path.replace(hive, short), value.toLowerCase())
    .replace(GUID, '<guid>')
    .replace(SID, '<sid>');

/** One rule per kind of value, chosen by field, never by rule. */
const normalize = (field: string, value: string, osType: unknown): string => {
  if (field.endsWith('.sha256')) return value.toLowerCase();
  if (field === 'registry.path') return normalizeRegistry(value);
  if (!field.endsWith('path') && !field.endsWith('executable')) return value;
  const unixNormalized = value.replace(UNIX_PROFILE, '$1<user>');
  if (osType !== 'windows') return unixNormalized;
  return value.toLowerCase().replace(WINDOWS_PROFILE, '$1<user>').replace(GUID, '<guid>');
};

/** Everything before the last path separator, or the whole value when it has none. */
const toFolder = (path: string): string => {
  const index = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
  return index > 0 ? path.slice(0, index) : path;
};

/** The kinds `event.category` names first, then the rest, so every alert tries all four. */
const candidateKinds = (doc: AlertDocument): Kind[] => {
  const categories = ([] as unknown[]).concat(
    (doc.event as AlertDocument | undefined)?.category ?? doc['event.category'] ?? []
  );
  const named = KINDS.filter((kind) => categories.includes(kind));
  return [...named, ...KINDS.filter((kind) => !named.includes(kind))];
};

const byField = ([a]: [string, string], [b]: [string, string]): number =>
  a < b ? -1 : a > b ? 1 : 0;

interface Condition {
  kind: Kind;
  values: Array<[string, string]>;
}

const buildCondition = (doc: AlertDocument): Condition | undefined => {
  const osType = getField(doc, 'host.os.type');
  const kind = candidateKinds(doc).find((candidate) =>
    isPresent(getField(doc, FIELD_SETS[candidate].identifying))
  );
  if (kind === undefined) return undefined;

  const { fields, hash } = FIELD_SETS[kind];
  const wanted = [...fields];
  const signer = fields.find((field) => field.endsWith(SIGNER_SUFFIX));
  if (hash && (signer === undefined || !isPresent(getField(doc, signer)))) wanted.push(hash);

  const values = wanted
    .filter((field) => isPresent(getField(doc, field)))
    .map((field): [string, string] => [
      field,
      normalize(field, String(getField(doc, field)), osType),
    ])
    .sort(byField);
  return { kind, values };
};

const serialize = (doc: AlertDocument, condition: Condition | undefined): string =>
  JSON.stringify([
    getField(doc, RULE_UUID) ?? null,
    getField(doc, RULE_REVISION) ?? null,
    getDetection(doc),
    condition?.kind ?? '',
    condition?.values ?? [],
  ]);

/** Only process and file conditions are widened: the folder of the executable and file path. */
const widen = ({ kind, values }: Condition): Condition => ({
  kind,
  values:
    kind === 'process' || kind === 'file'
      ? values.map(([field, value]): [string, string] => [
          field,
          WIDE_PATH_FIELDS.includes(field) ? toFolder(value) : value,
        ])
      : values,
});

/** The strict and the wide key of an alert document, as stable strings (hash them to store them). */
export const buildPatternKeys = (doc: AlertDocument): PatternKeys => {
  const condition = buildCondition(doc);
  if (condition === undefined) return { wide: serialize(doc, undefined) };
  return { strict: serialize(doc, condition), wide: serialize(doc, widen(condition)) };
};
