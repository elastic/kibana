/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StackAuth } from '../../lib/clients';

export type Command = 'run' | 'report' | 'clean';
export type Mode = 'burst' | 'sustained';

export const COMMANDS: readonly Command[] = ['run', 'report', 'clean'];

/** Managed id of the Alert Triage Worker; its per-space workflow id comes from the workers API. */
export const ALERT_TRIAGE_WORKER_ID = 'system-security-floor-alert-triage';

export const DEFAULT_CHILD_WORKFLOW_IDS = [
  'system-security-alert-analysis',
  'system-create-alertzero-proposal',
] as const;

export interface LoadTestConfig {
  command: Command;
  mode: Mode;
  ruleCount: number;
  batchCount: number;
  batchSize: number;
  alertsPerHour: number;
  durationMs: number;
  ruleIntervalMs: number;
  maxBatchSize: number;
  ruleSkew: number;
  fpRate: number;
  seed: number;
  templateTag: string;
  maxTemplatesPerLabel: number;
  childWorkflowIds: string[];
  pollIntervalMs: number;
  settleTimeoutMs: number;
  dispatchConcurrency: number;
  wait: boolean;
  dryRun: boolean;
  cancelExecutions: boolean;
  outDir: string;
  runId?: string;
  kibanaUrl: string;
  elasticsearchUrl: string;
  spaceId: string;
  auth: StackAuth;
}

type Flags = Record<string, unknown>;

const DURATION_UNITS_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** Parses `90s`, `5m`, `2h` or `1d` into milliseconds. */
export const parseDuration = (raw: string, flagName: string): number => {
  const match = /^(\d+(?:\.\d+)?)(s|m|h|d)$/.exec(raw.trim());
  if (!match) {
    throw new Error(
      `Invalid --${flagName} "${raw}" (expected a number and a unit: 90s, 5m, 2h, 1d)`
    );
  }
  return Math.round(Number(match[1]) * DURATION_UNITS_MS[match[2]]);
};

const stringFlag = (flags: Flags, name: string): string | undefined => {
  const value = flags[name];
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string') return value;
  throw new Error(`Invalid --${name} (expected a string)`);
};

const numberFlag = (flags: Flags, name: string, fallback: number): number => {
  const raw = stringFlag(flags, name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`Invalid --${name} "${raw}" (expected a number)`);
  return value;
};

const normalizeApiKey = (apiKey: string): string => apiKey.replace(/^ApiKey\s+/i, '').trim();

export const buildConfig = (flags: Flags, positional: string[]): LoadTestConfig => {
  const command = (positional[0] ?? 'run') as Command;
  if (!COMMANDS.includes(command)) {
    throw new Error(`Unknown command "${command}" (expected ${COMMANDS.join(' | ')})`);
  }

  const modeRaw = stringFlag(flags, 'mode') ?? 'burst';
  if (modeRaw !== 'burst' && modeRaw !== 'sustained') {
    throw new Error(`Invalid --mode "${modeRaw}" (expected burst | sustained)`);
  }
  const mode: Mode = modeRaw;

  const apiKey =
    stringFlag(flags, 'apiKey') ?? process.env.ES_API_KEY ?? process.env.ELASTIC_API_KEY;
  const auth: StackAuth = apiKey
    ? { type: 'apiKey', apiKey: normalizeApiKey(apiKey) }
    : {
        type: 'basic',
        username: stringFlag(flags, 'username') ?? 'elastic',
        password: stringFlag(flags, 'password') ?? 'changeme',
      };

  const childWorkflowIds = (stringFlag(flags, 'child-workflow-ids') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  return {
    command,
    mode,
    ruleCount: numberFlag(flags, 'rules', mode === 'sustained' ? 300 : 1),
    batchCount: numberFlag(flags, 'batches', 1),
    batchSize: numberFlag(flags, 'batch-size', 100),
    alertsPerHour: numberFlag(flags, 'alerts-per-hour', 1000),
    durationMs: parseDuration(stringFlag(flags, 'duration') ?? '1h', 'duration'),
    ruleIntervalMs: parseDuration(stringFlag(flags, 'rule-interval') ?? '5m', 'rule-interval'),
    maxBatchSize: numberFlag(flags, 'max-batch-size', 100),
    ruleSkew: numberFlag(flags, 'rule-skew', 0),
    fpRate: numberFlag(flags, 'fp-rate', 0.75),
    seed: numberFlag(flags, 'seed', 1),
    templateTag: stringFlag(flags, 'template-tag') ?? 'data-generator',
    maxTemplatesPerLabel: numberFlag(flags, 'max-templates', 500),
    childWorkflowIds:
      childWorkflowIds.length > 0 ? childWorkflowIds : [...DEFAULT_CHILD_WORKFLOW_IDS],
    pollIntervalMs: parseDuration(stringFlag(flags, 'poll-interval') ?? '30s', 'poll-interval'),
    settleTimeoutMs: parseDuration(stringFlag(flags, 'settle-timeout') ?? '30m', 'settle-timeout'),
    dispatchConcurrency: Math.max(1, numberFlag(flags, 'dispatch-concurrency', 10)),
    wait: flags.wait !== false,
    dryRun: flags['dry-run'] === true,
    cancelExecutions: flags['cancel-executions'] === true,
    outDir: stringFlag(flags, 'out-dir') ?? 'target/triage-load-test',
    runId: stringFlag(flags, 'run-id'),
    kibanaUrl: stringFlag(flags, 'kibanaUrl') ?? 'http://127.0.0.1:5601',
    elasticsearchUrl: stringFlag(flags, 'elasticsearchUrl') ?? 'http://127.0.0.1:9200',
    spaceId: stringFlag(flags, 'spaceId') ?? 'default',
    auth,
  };
};

export const alertsIndexFor = (spaceId: string): string => `.alerts-security.alerts-${spaceId}`;
