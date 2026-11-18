/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The guard of a run on a real model. It watches the model calls (`ai.prompt` steps) of the workflows from the start of the run and
 * stops the run when one of these is true:
 * - a completed call was answered by a connector that is neither the expected one nor in `--also-allowed` (the fake)
 * - the number of calls is above `--max-calls`
 * - the input or the output tokens that the connector reported are above `--max-input-tokens` or `--max-output-tokens`
 *
 * To stop the run, it points all three AlertZero tiers to the fake connector (so that no new call can reach EIS) and disables the
 * Alert Triage worker. A call that is already running cannot be recalled. It exits with code 2 after a stop, and with 0 when the
 * run has finished without one (no unfinished execution of the analysis workflows since the start, after at least one call;
 * the reviews and proposals that wait for a human do not count).
 *
 * Why it exists: on 2026-11-16 a sweep made three real calls because the worker reads the tier `alertzero_efficient` and only
 * `alertzero_balanced` had been set. A run on a real model must not depend on remembering that.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/triage_testbed/guard_real_run_cli.js \
 *     --from <ISO time> --expected-connector .anthropic-claude-4.5-haiku-chat_completion --also-allowed <fake connector id> \
 *     --fake-connector <fake connector id> --max-calls 80 --max-input-tokens 700000 --max-output-tokens 200000 \
 *     [--es http://localhost:9200] [--kibana http://localhost:5601] [--interval 5] [--timeout-minutes 25] [--check-once]
 *   The user and password come from the variable ES_AUTH (default elastic:changeme, the local snapshot default).
 */

export interface ModelCall {
  status: string;
  connectorId?: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface GuardLimits {
  maxCalls: number;
  maxInputTokens: number;
  maxOutputTokens: number;
}

export interface GuardInput {
  calls: readonly ModelCall[];
  expectedConnector: string;
  alsoAllowed?: readonly string[];
  limits: GuardLimits;
}

export type GuardVerdict =
  | { stop: true; reason: string }
  | {
      stop: false;
      reason?: undefined;
      calls: number;
      inputTokens: number;
      outputTokens: number;
    };

/** The settings of a worker as the API returns them. */
export interface WorkerSettings {
  workerId?: string;
  serviceAccountId?: string;
  autonomy: string;
  scheduleInterval: string;
  extras: Readonly<Record<string, string | number | boolean>>;
}

export interface UnfinishedQuery {
  bool: {
    filter: Array<{
      range?: { createdAt: { gte: string } };
      terms?: { workflowId: string[] };
    }>;
    must_not: Array<{ terms: { status: string[] } }>;
  };
}

type ValueFlagKey =
  | 'from'
  | 'expectedConnector'
  | 'alsoAllowed'
  | 'fakeConnector'
  | 'maxCalls'
  | 'maxInputTokens'
  | 'maxOutputTokens'
  | 'es'
  | 'kibana'
  | 'interval'
  | 'timeoutMinutes';

type GuardArgs = Partial<Record<ValueFlagKey, string>> & { checkOnce?: boolean };

interface StepSearch {
  hits: {
    hits: Array<{
      _source: {
        status: string;
        output?: {
          metadata?: {
            usage?: { connectorId?: string; inputTokens?: number; outputTokens?: number };
          };
        };
      };
    }>;
  };
}

interface WorkerList {
  workers: Array<{ id: string; settings: WorkerSettings; settingsRevision: string | number }>;
}

interface Count {
  count: number;
}

type RequestBody = Readonly<Record<string, string | number | boolean | object>>;
type Headers = Readonly<Record<string, string>>;

const FLAGS: Readonly<Record<string, ValueFlagKey>> = {
  '--from': 'from',
  '--expected-connector': 'expectedConnector',
  '--also-allowed': 'alsoAllowed',
  '--fake-connector': 'fakeConnector',
  '--max-calls': 'maxCalls',
  '--max-input-tokens': 'maxInputTokens',
  '--max-output-tokens': 'maxOutputTokens',
  '--es': 'es',
  '--kibana': 'kibana',
  '--interval': 'interval',
  '--timeout-minutes': 'timeoutMinutes',
};

const messageOf = (error: Error | string): string =>
  error instanceof Error ? error.message : String(error);

/** Decides from the model calls so far. Pure. */
export const evaluateGuard = ({
  calls,
  expectedConnector,
  alsoAllowed = [],
  limits,
}: GuardInput): GuardVerdict => {
  const allowed = new Set([expectedConnector, ...alsoAllowed]);
  const unexpected = [
    ...new Set(
      calls
        .filter(
          (call) =>
            call.status === 'completed' && call.connectorId && !allowed.has(call.connectorId)
        )
        .map((call) => call.connectorId)
    ),
  ];
  if (unexpected.length > 0)
    return {
      stop: true,
      reason: `a call was answered by another connector: ${unexpected.join(', ')}`,
    };
  if (calls.length > limits.maxCalls)
    return { stop: true, reason: `${calls.length} calls, more than the cap of ${limits.maxCalls}` };
  const input = calls.reduce((sum, call) => sum + (call.inputTokens ?? 0), 0);
  const output = calls.reduce((sum, call) => sum + (call.outputTokens ?? 0), 0);
  if (input > limits.maxInputTokens)
    return {
      stop: true,
      reason: `${input} input tokens, more than the cap of ${limits.maxInputTokens}`,
    };
  if (output > limits.maxOutputTokens)
    return {
      stop: true,
      reason: `${output} output tokens, more than the cap of ${limits.maxOutputTokens}`,
    };
  return { stop: false, calls: calls.length, inputTokens: input, outputTokens: output };
};

const auth = (): string =>
  `Basic ${Buffer.from(process.env.ES_AUTH ?? 'elastic:changeme').toString('base64')}`;

const call = async <T>(
  base: string,
  method: string,
  url: string,
  body?: RequestBody,
  headers: Headers = {}
): Promise<T> => {
  const response = await fetch(`${base}${url}`, {
    method,
    headers: {
      Authorization: auth(),
      'Content-Type': 'application/json',
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'Kibana',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok)
    throw new Error(`${method} ${url} failed with ${response.status}: ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : undefined) as T;
};

const readCalls = async (es: string, from: string): Promise<ModelCall[]> => {
  const result = await call<StepSearch>(es, 'POST', '/.workflows-step-executions/_search', {
    size: 5000,
    query: {
      bool: {
        filter: [{ term: { stepType: 'ai.prompt' } }, { range: { startedAt: { gte: from } } }],
      },
    },
    _source: ['status', 'output.metadata.usage'],
  });
  return result.hits.hits.map((hit) => ({
    status: hit._source.status,
    connectorId: hit._source.output?.metadata?.usage?.connectorId,
    inputTokens: hit._source.output?.metadata?.usage?.inputTokens,
    outputTokens: hit._source.output?.metadata?.usage?.outputTokens,
  }));
};

/**
 * Executions of the workflows that do the analysis and have not finished since `from`. The reviews and the proposals of a worker on
 * manual autonomy wait for a human for up to 72 hours, so they are NOT counted: with them the run would never be "finished".
 */
const ANALYSIS_WORKFLOWS = [
  'system-security-floor-alert-triage-default',
  'system-security-floor-alert-triage-batch',
  'system-security-alert-analysis',
];
const TERMINAL = ['completed', 'failed', 'cancelled', 'timed_out', 'skipped'];

export const unfinishedQuery = (from: string): UnfinishedQuery => ({
  bool: {
    filter: [
      { range: { createdAt: { gte: from } } },
      { terms: { workflowId: ANALYSIS_WORKFLOWS } },
    ],
    must_not: [{ terms: { status: TERMINAL } }],
  },
});

const unfinishedSince = async (es: string, from: string): Promise<number> =>
  (await call<Count>(es, 'POST', '/.workflows-executions/_count', { query: unfinishedQuery(from) }))
    .count;

/** The settings of a worker as its PATCH accepts them: the GET also returns `workerId`, which the PATCH rejects. */
export const patchableSettings = ({
  serviceAccountId,
  autonomy,
  scheduleInterval,
  extras,
}: WorkerSettings): Omit<WorkerSettings, 'workerId'> => ({
  ...(serviceAccountId ? { serviceAccountId } : {}),
  autonomy,
  scheduleInterval,
  extras,
});

/**
 * Points all three tiers to the fake connector and disables the worker. The two actions are independent: one that fails
 * does not keep the other from running, and every failure is printed. Returns the failures.
 */
const stopRun = async ({
  kibana,
  fakeConnector,
}: {
  kibana: string;
  fakeConnector: string;
}): Promise<string[]> => {
  const v1 = { 'elastic-api-version': '1' };
  const failures: string[] = [];
  try {
    await call<undefined>(
      kibana,
      'PUT',
      '/internal/search_inference_endpoints/settings',
      {
        features: ['alertzero_efficient', 'alertzero_balanced', 'alertzero_frontier'].map(
          (feature) => ({ feature_id: feature, endpoints: [{ id: fakeConnector }] })
        ),
      },
      v1
    );
    process.stdout.write('tiers pointed to the fake connector\n');
  } catch (error) {
    failures.push(`tiers: ${messageOf(error)}`);
  }
  try {
    const { workers } = await call<WorkerList>(
      kibana,
      'GET',
      '/internal/alertzero/workers',
      undefined,
      v1
    );
    const worker = workers.find((w) => w.id === 'system-security-floor-alert-triage');
    if (!worker)
      throw new Error('the worker system-security-floor-alert-triage is not in the list');
    await call<undefined>(
      kibana,
      'PATCH',
      '/internal/alertzero/workers/system-security-floor-alert-triage',
      {
        enabled: false,
        settings: patchableSettings(worker.settings),
        settingsRevision: worker.settingsRevision,
      },
      v1
    );
    process.stdout.write('worker disabled\n');
  } catch (error) {
    failures.push(`worker: ${messageOf(error)}`);
  }
  failures.forEach((failure) =>
    process.stdout.write(`!!! STOP ACTION FAILED, DO IT BY HAND: ${failure}\n`)
  );
  return failures;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const main = async (): Promise<void> => {
  const args: GuardArgs = {
    es: 'http://localhost:9200',
    kibana: 'http://localhost:5601',
    interval: '5',
    timeoutMinutes: '25',
    alsoAllowed: '',
  };
  for (let i = 2; i < process.argv.length; i++) {
    const key = FLAGS[process.argv[i]];
    if (process.argv[i] === '--check-once') args.checkOnce = true;
    else if (key) args[key] = process.argv[++i];
    else throw new Error(`unknown argument ${process.argv[i]}`);
  }
  (
    [
      'from',
      'expectedConnector',
      'fakeConnector',
      'maxCalls',
      'maxInputTokens',
      'maxOutputTokens',
    ] as const
  ).forEach((name) => {
    if (!args[name])
      throw new Error(`--${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)} is required`);
  });
  const {
    from = '',
    expectedConnector = '',
    fakeConnector = '',
    es = '',
    kibana = '',
    interval,
    timeoutMinutes,
  } = args;
  const limits: GuardLimits = {
    maxCalls: Number(args.maxCalls),
    maxInputTokens: Number(args.maxInputTokens),
    maxOutputTokens: Number(args.maxOutputTokens),
  };
  const alsoAllowed = args.alsoAllowed ? args.alsoAllowed.split(',') : [];
  const deadline = Date.now() + Number(timeoutMinutes) * 60000;
  let last = '';

  for (;;) {
    const calls = await readCalls(es, from);
    const verdict = evaluateGuard({ calls, expectedConnector, alsoAllowed, limits });
    if (verdict.stop) {
      process.stdout.write(`!!! GUARD STOP: ${verdict.reason}\n`);
      await stopRun({ kibana, fakeConnector });
      process.exit(2);
    }
    const line = `${new Date().toISOString().slice(11, 19)} calls ${verdict.calls}, tokens in ${
      verdict.inputTokens
    } / out ${verdict.outputTokens}`;
    if (line.slice(9) !== last) process.stdout.write(`${line}\n`);
    last = line.slice(9);
    if (args.checkOnce) return;
    const unfinished = await unfinishedSince(es, from);
    if (unfinished === 0 && verdict.calls > 0) {
      process.stdout.write(
        `run finished: ${verdict.calls} calls, tokens in ${verdict.inputTokens} / out ${verdict.outputTokens}\n`
      );
      return;
    }
    if (Date.now() > deadline) {
      process.stdout.write('!!! GUARD TIMEOUT: the run did not finish in time, stopping it\n');
      await stopRun({ kibana, fakeConnector });
      process.exit(2);
    }
    await sleep(Number(interval) * 1000);
  }
};
