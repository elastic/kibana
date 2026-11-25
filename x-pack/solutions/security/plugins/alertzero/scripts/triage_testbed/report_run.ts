/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The report of one run of the Alert Triage worker: the fixed scorecard of the plan ("Measure against a baseline"),
 * computed from what the run left in Elasticsearch, the truth file of the generated data, and the model calls.
 * It writes `<notes dir>/runs/<run id>.json` and appends ONE row to the scorecard ledger `<notes dir>/ledger.md`. It never
 * overwrites a row: a run id that is already in the ledger is an error. A run that failed or stopped early also
 * gets a row (`--note`).
 *
 * Sources:
 * - the model calls: the `ai.prompt` steps of `system-security-alert-analysis` in `.workflows-step-executions`
 *   (prompt, verdicts with confidence, tokens, connector, time)
 * - the sweeps: the `emit_result` steps of the worker workflow (skip reason, pending alerts, planned cost)
 * - the verdicts on the alerts: the `az:` tags, joined to `truth.ndjson`
 *
 * Fake runs: latency, step time, tokens, cost units and verdicts per hour come from settings of the fake LLM,
 * not from a model. The ledger row says "est." for them and carries the fake settings.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/triage_testbed/report_run_cli.js \
 *     --run-id <id> --from <ISO time> --to <ISO time> --data <gen folder> --es http://localhost:9200 \
 *     --expect-cluster elasticsearch --llm fake|real --seed 1 --slice "2 h real-time" --flags "all off" \
 *     --notes-dir <results folder> \
 *     [--connector-id <id>] [--fake-log <fake_llm.log>] [--baseline <run id>] [--note "<text>"] [--no-ledger]
 *   The user and password come from the variable ES_AUTH (default elastic:changeme, the local snapshot default).
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { buildCacheSection, cacheNote, readCacheData, type CacheSection } from './report_cache';
import { batchNote, buildBatchSection, type BatchSection } from './report_batches';
import { buildQueueSection, queueNote, type QueueSection } from './report_queue';
import {
  type AlertCounts,
  buildPocSection,
  buildWaitSection,
  pocNote,
  type PocSection,
  type WaitSection,
} from './report_poc';
import type { Classification, TruthRecord } from './fake_llm';
import { parseAlertIds } from './fake_llm';

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export interface JsonObject {
  [key: string]: Json;
}

/** A verdict in the short form of the scorecard: false positive, true positive or inconclusive. */
export type ShortVerdict = 'fp' | 'tp' | 'inc';

/** One verdict of a model call, as the `ai.prompt` step keeps it. */
export interface ModelVerdict {
  id: string;
  classification: Classification;
  confidence_score: number;
}

/** One model call: an `ai.prompt` step of `system-security-alert-analysis`. */
export interface ModelCall {
  startedAt: string;
  finishedAt: string;
  executionTimeMs?: number;
  status: string;
  prompt: string;
  verdicts?: ModelVerdict[];
  inputTokens?: number;
  outputTokens?: number;
  connectorId?: string;
}

/** One `emit_result` step of the worker workflow. */
export interface Sweep {
  startedAt: string;
  output?: { skip_reason?: string; pending_alerts?: number };
}

/** One step execution of the workflows of the worker. */
export interface WorkflowStep {
  workflowId: string;
  stepId: string;
  status: string;
  executionTimeMs?: number;
}

/** An alert that carries an `az:` tag. */
export interface TaggedAlert {
  id: string;
  timestamp: string;
  tags: string[];
  severity?: string;
  /** True when the alert has a building block type. */
  buildingBlock?: boolean;
}

export type Truth = ReadonlyMap<string, TruthRecord>;

export type VerdictCounts = Record<string, number>;

/** Set only when the verdict cache steps ran in the window (the flag `alertzero.triageVerdictCache` is `shadow`). */
export interface Scorecard {
  verdicts: { analyzed: number; analyzedInMetric: number; truthToVerdict: VerdictCounts };
  excludedRules: Record<string, { analyzed: number; truthToVerdict: VerdictCounts }>;
  wrongFalsePositive: {
    truePositiveAlertsAnalyzed: number;
    gotFalsePositive: number;
    rate: number | null;
  };
  plantedVariants: {
    analyzed: number;
    gotFalsePositive: number;
    byType: Record<string, { analyzed: number; gotFalsePositive: number }>;
  };
  benignHashUpdates: { analyzed: number; gotTruePositive: number };
  llmCalls: { calls: number; failed: number; per1000AlertsAnalyzed: number | null };
  costAndTokens: {
    costUnits: number;
    inputTokens: number;
    outputTokens: number;
    connectorIds: string[];
  };
  throughput: { verdictsPerHour: number | null; backlogAtEnd: number | null };
  creationToVerdictSeconds: { p50: number | null; p95: number | null };
  stepTimes: Record<
    string,
    { count: number; failed: number; p50Ms: number | null; p95Ms: number | null; totalMs: number }
  >;
  sweepSkipReasons: Record<string, number>;
  sweeps: number;
  optionalModelSkips: Record<string, number>;
  confidence: Record<
    string,
    {
      count: number;
      mean: number | null;
      p10: number | null;
      p50: number | null;
      p90: number | null;
      shareAtOrAboveCacheThreshold: number | null;
    }
  >;
  verdictCache?: CacheSection;
  /** Set when a verdict came from the cache or from Jev (`on` mode of either flag). */
  poc?: PocSection;
  /** The wait from creation to verdict over every source, and the alerts that have no verdict at the end. */
  wait?: WaitSection;
  /** The size of each model call and the overhead share of the cost units. */
  batches?: BatchSection;
  /** The model queue by kind and process key state, and the Jev process shadow. */
  queue?: QueueSection;
}

export type ScorecardDiff = Record<
  string,
  { current: number; baseline: number; difference: number | null }
>;

export interface LlmInfo {
  mode: 'fake' | 'real';
  connectorIds: string[];
  fakeSettings?: JsonObject;
  expectedConnector?: string;
}

export interface LedgerRowInput {
  runId: string;
  date: string;
  commit: string;
  flags: string;
  seed: string | number;
  slice: string | number;
  llm: LlmInfo;
  scorecard: Scorecard;
  note?: string;
}

interface RunReport {
  runId: string;
  generatedAt: string;
  commit: string;
  window: { from: string; to: string };
  flags: string;
  seed: string | null;
  slice: string | null;
  llm: LlmInfo;
  note: string | null;
  excludedRuleNames: string[];
  scorecard: Scorecard;
  comparedToBaseline?: { runId: string; differences: ScorecardDiff };
}

const FAKE_CONNECTOR_NOTE = 'fake';
const VERDICT_TAGS: Readonly<Record<string, ShortVerdict>> = {
  'az:false_positive': 'fp',
  'az:true_positive': 'tp',
  'az:inconclusive': 'inc',
};
const CACHE_THRESHOLD = 0.85;
const WORKFLOWS = [
  'system-security-floor-alert-triage-default',
  'system-security-floor-alert-triage-batch',
  'system-security-alert-analysis',
];

// ---------------------------------------------------------------------------------------------
// Pure functions (tested)
// ---------------------------------------------------------------------------------------------

/** The `q` quantile of a list of numbers (nearest rank), or null for an empty list. */
export const percentile = (values: readonly number[], q: number): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))];
};

export const mean = (values: readonly number[]): number | null =>
  values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
const round = (value: number | null | undefined, digits: number = 4): number | null =>
  value === null || value === undefined ? null : Number(value.toFixed(digits));
const shortVerdict = (truthVerdict: TruthRecord['verdict']): 'fp' | 'tp' =>
  truthVerdict === 'false_positive' ? 'fp' : 'tp';

const truthOf = (truth: Truth, id: string): TruthRecord => {
  const record = truth.get(id);
  if (!record) throw new Error(`no truth record for ${id}`);
  return record;
};

/**
 * @param calls   `[{ startedAt, finishedAt, executionTimeMs, status, prompt, verdicts, inputTokens, outputTokens, connectorId }]`
 * @param sweeps  `[{ startedAt, output }]` the `emit_result` outputs
 * @param steps   `[{ workflowId, stepId, status, executionTimeMs }]`
 * @param alerts  `[{ id, timestamp, tags }]` alerts that carry an `az:` tag
 * @param truth   `Map<id, { verdict, variant, benign }>`
 */
/**
 * The rules to leave out of the wrong-verdict metric, as a set of rule uuids. A rule is named by its exact name or its uuid, so that
 * "AWS S3 ..." cannot take another rule with it. A name that matches no rule is an error.
 */
export const resolveExcludedRules = (
  dataDir: string,
  names: readonly string[]
): { uuids: Set<string>; names: string[] } => {
  const rules = JSON.parse(fs.readFileSync(path.join(dataDir, 'rules.json'), 'utf8')) as Array<{
    name: string;
    uuid: string;
  }>;
  const found = names.map((name) => {
    const rule = rules.find((candidate) => candidate.name === name || candidate.uuid === name);
    if (!rule) throw new Error(`--exclude-rules: no rule has the exact name or uuid "${name}"`);
    return rule;
  });
  return { uuids: new Set(found.map((rule) => rule.uuid)), names: found.map((rule) => rule.name) };
};

export interface ScorecardInput {
  calls: readonly ModelCall[];
  sweeps: readonly Sweep[];
  steps: readonly WorkflowStep[];
  alerts: readonly TaggedAlert[];
  truth: Truth;
  /**
   * Rule uuids that stay out of the wrong-verdict metric, the planted variants and the harmless changes. Their
   * alerts still count in the verdict matrix, and are reported apart under `excludedRules`.
   */
  excludeRules?: ReadonlySet<string>;
}

export const buildScorecard = ({
  calls,
  sweeps,
  steps,
  alerts,
  truth,
  excludeRules = new Set<string>(),
}: ScorecardInput): Scorecard => {
  // The verdicts that landed on the alerts, against the truth.
  const matrix: VerdictCounts = {};
  const verdictOf = new Map<string, ShortVerdict>();
  alerts.forEach((alert) => {
    const verdict = alert.tags.map((tag) => VERDICT_TAGS[tag]).find(Boolean);
    const known = truth.get(alert.id);
    if (!verdict || !known) return;
    verdictOf.set(alert.id, verdict);
    const key = `${shortVerdict(known.verdict)}>${verdict}`;
    matrix[key] = (matrix[key] ?? 0) + 1;
  });
  const analyzed = verdictOf.size;
  // The uuid of the rule of an alert when that rule is left out of the metric, otherwise undefined.
  const excludedRuleOf = (id: string): string | undefined => {
    const { ruleUuid } = truthOf(truth, id);
    return ruleUuid !== undefined && excludeRules.has(ruleUuid) ? ruleUuid : undefined;
  };
  const inMetric = new Map([...verdictOf].filter(([id]) => excludedRuleOf(id) === undefined));
  const excludedRules: Scorecard['excludedRules'] = {};
  verdictOf.forEach((verdict, id) => {
    const ruleUuid = excludedRuleOf(id);
    if (ruleUuid === undefined) return;
    const { verdict: truthVerdict } = truthOf(truth, id);
    const entry = (excludedRules[ruleUuid] = excludedRules[ruleUuid] ?? {
      analyzed: 0,
      truthToVerdict: {},
    });
    entry.analyzed++;
    const key = `${shortVerdict(truthVerdict)}>${verdict}`;
    entry.truthToVerdict[key] = (entry.truthToVerdict[key] ?? 0) + 1;
  });

  const truePositives = [...inMetric].filter(
    ([id]) => truthOf(truth, id).verdict === 'true_positive'
  );
  const gotFalsePositive = truePositives.filter(([, verdict]) => verdict === 'fp').length;
  const wrongFalsePositive: Scorecard['wrongFalsePositive'] = {
    truePositiveAlertsAnalyzed: truePositives.length,
    gotFalsePositive,
    rate: truePositives.length ? round(gotFalsePositive / truePositives.length) : null,
  };

  const variants: Scorecard['plantedVariants']['byType'] = {};
  inMetric.forEach((verdict, id) => {
    const { variant } = truthOf(truth, id);
    if (!variant) return;
    const entry = (variants[variant] = variants[variant] ?? { analyzed: 0, gotFalsePositive: 0 });
    entry.analyzed++;
    if (verdict === 'fp') entry.gotFalsePositive++;
  });
  const plantedAnalyzed = Object.values(variants).reduce((sum, v) => sum + v.analyzed, 0);
  const plantedMissed = Object.values(variants).reduce((sum, v) => sum + v.gotFalsePositive, 0);

  const benign = [...inMetric].filter(([id]) => truthOf(truth, id).benign);

  // Model calls: confidence per answer type, tokens, cost units, time from creation to verdict.
  const completed = calls.filter((call) => call.status === 'completed');
  const confidence: Record<string, number[]> = {};
  const alertVerdictTime = new Map<string, number>();
  let costUnits = 0;
  completed.forEach((call) => {
    const ids = parseAlertIds(call.prompt);
    costUnits += 5 + ids.length; // a batch costs 5 units plus 1 per alert (worker settings, "The worker's defaults")
    ids.forEach((id) => alertVerdictTime.set(id, Date.parse(call.finishedAt)));
    (call.verdicts ?? []).forEach(({ id, classification, confidence_score: score }) => {
      const known = truth.get(id);
      if (!known) return;
      const key = `${shortVerdict(known.verdict)}>${
        { false_positive: 'fp', true_positive: 'tp', inconclusive: 'inc' }[classification]
      }`;
      confidence[key] = confidence[key] ?? [];
      confidence[key].push(score);
    });
  });
  const confidenceSummary: Scorecard['confidence'] = Object.fromEntries(
    Object.entries(confidence).map(([key, scores]) => [
      key,
      {
        count: scores.length,
        mean: round(mean(scores)),
        p10: round(percentile(scores, 0.1)),
        p50: round(percentile(scores, 0.5)),
        p90: round(percentile(scores, 0.9)),
        shareAtOrAboveCacheThreshold: round(
          scores.filter((s) => s >= CACHE_THRESHOLD).length / scores.length
        ),
      },
    ])
  );
  const creationToVerdictSeconds = alerts
    .filter((alert) => alertVerdictTime.has(alert.id))
    .map((alert) => ((alertVerdictTime.get(alert.id) ?? 0) - Date.parse(alert.timestamp)) / 1000);

  const starts = completed.map((call) => Date.parse(call.startedAt));
  const ends = completed.map((call) => Date.parse(call.finishedAt));
  const hours = starts.length
    ? Math.max((Math.max(...ends) - Math.min(...starts)) / 3600000, 1 / 60)
    : null;

  const skipReasons: Record<string, number> = {};
  sweeps.forEach((sweep) => {
    const reason = sweep.output?.skip_reason ?? 'unknown';
    skipReasons[reason] = (skipReasons[reason] ?? 0) + 1;
  });
  const lastSweep = [...sweeps]
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))
    .pop();

  // Step time per workflow and step id.
  const byStep = new Map<string, WorkflowStep[]>();
  steps.forEach((step) => {
    const key = `${step.workflowId}/${step.stepId}`;
    if (!byStep.has(key)) byStep.set(key, []);
    byStep.get(key)?.push(step);
  });
  const stepTimes: Scorecard['stepTimes'] = Object.fromEntries(
    [...byStep]
      .map(([key, list]): [string, Scorecard['stepTimes'][string]] => {
        const times = list
          .filter((s) => s.status === 'completed' && Number.isFinite(s.executionTimeMs))
          .map((s) => s.executionTimeMs ?? 0);
        return [
          key,
          {
            count: list.length,
            failed: list.filter((s) => s.status === 'failed').length,
            p50Ms: percentile(times, 0.5),
            p95Ms: percentile(times, 0.95),
            totalMs: times.reduce((a, b) => a + b, 0),
          },
        ];
      })
      .sort((a, b) => b[1].totalMs - a[1].totalMs)
  );

  return {
    verdicts: { analyzed, analyzedInMetric: inMetric.size, truthToVerdict: matrix },
    excludedRules,
    wrongFalsePositive,
    plantedVariants: {
      analyzed: plantedAnalyzed,
      gotFalsePositive: plantedMissed,
      byType: variants,
    },
    benignHashUpdates: {
      analyzed: benign.length,
      gotTruePositive: benign.filter(([, verdict]) => verdict === 'tp').length,
    },
    llmCalls: {
      calls: calls.length,
      failed: calls.filter((call) => call.status === 'failed').length,
      per1000AlertsAnalyzed: analyzed ? round((completed.length / analyzed) * 1000, 1) : null,
    },
    costAndTokens: {
      costUnits,
      inputTokens: completed.reduce((sum, call) => sum + (call.inputTokens ?? 0), 0),
      outputTokens: completed.reduce((sum, call) => sum + (call.outputTokens ?? 0), 0),
      connectorIds: [
        ...new Set(
          completed.map((call) => call.connectorId).filter((id): id is string => Boolean(id))
        ),
      ],
    },
    throughput: {
      verdictsPerHour: hours && analyzed ? round(analyzed / hours, 1) : null,
      backlogAtEnd: lastSweep?.output?.pending_alerts ?? null,
    },
    creationToVerdictSeconds: {
      p50: round(percentile(creationToVerdictSeconds, 0.5), 1),
      p95: round(percentile(creationToVerdictSeconds, 0.95), 1),
    },
    stepTimes,
    sweepSkipReasons: skipReasons,
    sweeps: sweeps.length,
    optionalModelSkips: {}, // none built yet: a layer that uses an optional model will record `not_configured`, `disabled`, `unavailable`, `timeout`
    confidence: confidenceSummary,
  };
};

/** The difference of every number of the scorecard to a baseline scorecard, for the numbers that both have. */
export const diffScorecards = (current: Scorecard, baseline: Scorecard): ScorecardDiff => {
  const out: ScorecardDiff = {};
  const walk = (left: object, right: object | undefined, prefix: string): void => {
    const a = left as JsonObject;
    const b = right as JsonObject | undefined;
    Object.keys(a).forEach((key) => {
      const here = prefix ? `${prefix}.${key}` : key;
      const aValue = a[key];
      const bValue = b?.[key];
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        out[here] = { current: aValue, baseline: bValue, difference: round(aValue - bValue) };
      } else if (
        aValue &&
        typeof aValue === 'object' &&
        !Array.isArray(aValue) &&
        key !== 'stepTimes'
      ) {
        walk(aValue, bValue as object | undefined, here);
      }
    });
  };
  walk(current, baseline, '');
  return out;
};

const ledgerHeader = [
  '## Scorecard ledger',
  '',
  'One row per run, never overwritten. Written by `report_run_cli.js`. A fake run marks latency, tokens, cost units and throughput as "est." (settings, not measurements).',
  '',
  '| Run | Date | Commit | Flags | Seed | Slice | LLM | Verdicts | True positive got false positive | Planted variants missed | Calls per 1,000 alerts | Tokens in / out | Cost units | Verdicts per hour | Backlog at end | Creation to verdict p50 / p95 (s) | Notes |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
].join('\n');

const na = (value: string | number | null | undefined): string | number =>
  value === null || value === undefined ? 'n/a' : value;

export const ledgerRow = ({
  runId,
  date,
  commit,
  flags,
  seed,
  slice,
  llm,
  scorecard,
  note,
}: LedgerRowInput): string => {
  const est = llm.mode === 'fake' ? ' (est.)' : '';
  const w = scorecard.wrongFalsePositive;
  const v = scorecard.plantedVariants;
  const cells = [
    runId,
    date,
    commit,
    flags,
    seed,
    slice,
    llm.mode === 'fake' ? 'fake' : `real: ${llm.connectorIds.join(', ') || 'unknown'}`,
    `${scorecard.verdicts.analyzed} (${Object.entries(scorecard.verdicts.truthToVerdict)
      .map(([k, n]) => `${k} ${n}`)
      .join(', ')})`,
    `${w.gotFalsePositive} of ${w.truePositiveAlertsAnalyzed}`,
    `${v.gotFalsePositive} of ${v.analyzed}`,
    na(scorecard.llmCalls.per1000AlertsAnalyzed),
    `${scorecard.costAndTokens.inputTokens} / ${scorecard.costAndTokens.outputTokens}${est}`,
    `${scorecard.costAndTokens.costUnits}${est}`,
    `${na(scorecard.throughput.verdictsPerHour)}${est}`,
    `${na(scorecard.throughput.backlogAtEnd)}`,
    `${na(scorecard.creationToVerdictSeconds.p50)} / ${na(
      scorecard.creationToVerdictSeconds.p95
    )}${est}`,
    [
      note,
      llm.mode === 'fake' && llm.fakeSettings
        ? `fake settings: ${JSON.stringify(llm.fakeSettings)}`
        : '',
    ]
      .filter(Boolean)
      .join(' '),
  ];
  return `| ${cells.map((cell) => String(cell ?? '').replace(/\|/g, '/')).join(' | ')} |`;
};

/** Appends a row to the ledger text. Fails when the run id is already there. */
export const appendLedgerRow = (text: string, row: string, runId: string): string => {
  if (text.includes(`\n| ${runId} |`))
    throw new Error(`run id "${runId}" is already in the ledger: rows are never overwritten`);
  const hasLedger = text.includes('## Scorecard ledger');
  const base = hasLedger
    ? text.replace(/\n*$/, '\n')
    : `${text.replace(/\n*$/, '\n')}\n${ledgerHeader}\n`;
  return `${base}${row}\n`;
};

// ---------------------------------------------------------------------------------------------
// Reading Elasticsearch
// ---------------------------------------------------------------------------------------------

export type EsRequest = <T>(method: string, url: string, body?: object) => Promise<T>;

export const makeClient = (es: string): EsRequest => {
  const auth = `Basic ${Buffer.from(process.env.ES_AUTH ?? 'elastic:changeme').toString('base64')}`;
  return async <T>(method: string, url: string, body?: object): Promise<T> => {
    const response = await fetch(`${es}${url}`, {
      method,
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    if (!response.ok)
      throw new Error(`${method} ${url} failed with ${response.status}: ${text.slice(0, 400)}`);
    return JSON.parse(text) as T;
  };
};

interface EsHit<T> {
  _id: string;
  _source: T;
  sort?: Array<string | number>;
}

/** All hits of a query, in pages with `search_after`. */
export const fetchAll = async <T>(
  request: EsRequest,
  index: string,
  body: object
): Promise<Array<EsHit<T>>> => {
  const hits: Array<EsHit<T>> = [];
  let after: Array<string | number> | undefined;
  for (;;) {
    const page = await request<{ hits: { hits: Array<EsHit<T>> } }>('POST', `/${index}/_search`, {
      ...body,
      size: 5000,
      ...(after ? { search_after: after } : {}),
    });
    hits.push(...page.hits.hits);
    if (page.hits.hits.length < 5000) return hits;
    after = page.hits.hits[page.hits.hits.length - 1].sort;
  }
};

export const loadTruth = async (file: string): Promise<Map<string, TruthRecord>> => {
  const truth = new Map<string, TruthRecord>();
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    const { id, verdict, variant, benign, kind, ruleUuid } = JSON.parse(line) as TruthRecord & {
      id: string;
    };
    truth.set(id, { verdict, variant, benign, kind, ruleUuid });
  }
  return truth;
};

interface StepExecutionSource {
  startedAt: string;
  finishedAt?: string;
  executionTimeMs?: number;
  status: string;
  input?: { prompt?: string };
  output?: {
    content?: { verdicts?: ModelVerdict[] };
    metadata?: { usage?: { inputTokens?: number; outputTokens?: number; connectorId?: string } };
  };
}

interface AlertSource {
  '@timestamp': string;
  'kibana.alert.workflow_tags'?: string[];
  'kibana.alert.severity'?: string;
  'kibana.alert.building_block_type'?: string;
}

export interface RunData {
  calls: ModelCall[];
  sweeps: Sweep[];
  steps: WorkflowStep[];
  alerts: TaggedAlert[];
  /** Counts from the alert index, read before the reset: alerts that are not building blocks, and those without a verdict tag. */
  alertCounts: AlertCounts;
}

export const readRun = async (
  request: EsRequest,
  { from, to, alertIndex }: { from: string; to: string; alertIndex: string }
): Promise<RunData> => {
  const window = { range: { startedAt: { gte: from, lte: to } } };
  const sort = [{ startedAt: 'asc' }, { id: 'asc' }];
  const callHits = await fetchAll<StepExecutionSource>(request, '.workflows-step-executions', {
    sort,
    query: {
      bool: {
        filter: [
          { term: { stepType: 'ai.prompt' } },
          { term: { workflowId: 'system-security-alert-analysis' } },
          window,
        ],
      },
    },
    _source: [
      'startedAt',
      'finishedAt',
      'executionTimeMs',
      'status',
      'input.prompt',
      'output.content.verdicts',
      'output.metadata.usage',
    ],
  });
  const calls = callHits
    .map((hit) => hit._source)
    .filter((s) => s.status === 'completed' || s.status === 'failed')
    .map(
      (s): ModelCall => ({
        startedAt: s.startedAt,
        finishedAt: s.finishedAt ?? s.startedAt,
        executionTimeMs: s.executionTimeMs,
        status: s.status,
        prompt: s.input?.prompt ?? '',
        verdicts: s.output?.content?.verdicts ?? [],
        inputTokens: s.output?.metadata?.usage?.inputTokens,
        outputTokens: s.output?.metadata?.usage?.outputTokens,
        connectorId: s.output?.metadata?.usage?.connectorId,
      })
    );

  const sweepHits = await fetchAll<Sweep>(request, '.workflows-step-executions', {
    sort,
    query: {
      bool: {
        filter: [
          { term: { stepId: 'emit_result' } },
          { term: { workflowId: WORKFLOWS[0] } },
          { term: { status: 'completed' } },
          window,
        ],
      },
    },
    _source: ['startedAt', 'output'],
  });
  const stepHits = await fetchAll<WorkflowStep>(request, '.workflows-step-executions', {
    sort,
    query: {
      bool: {
        filter: [{ terms: { workflowId: WORKFLOWS } }, window],
        must_not: [{ term: { stepType: 'retry' } }],
      },
    },
    _source: ['workflowId', 'stepId', 'status', 'executionTimeMs'],
  });
  const alertHits = await fetchAll<AlertSource>(request, alertIndex, {
    sort: [{ '@timestamp': 'asc' }, { 'kibana.alert.uuid': 'asc' }],
    query: { prefix: { 'kibana.alert.workflow_tags': 'az:' } },
    _source: [
      '@timestamp',
      'kibana.alert.workflow_tags',
      'kibana.alert.severity',
      'kibana.alert.building_block_type',
    ],
  });
  const countAlerts = async (query: object): Promise<number> =>
    (await request<{ count: number }>('POST', `/${alertIndex}/_count`, { query })).count;
  const notBuildingBlock = { exists: { field: 'kibana.alert.building_block_type' } };
  const verdictTag = { terms: { 'kibana.alert.workflow_tags': Object.keys(VERDICT_TAGS) } };
  // The worker searches only open and acknowledged alerts. A closed alert without a verdict was closed before it could see it
  // (the generator copies the closed share of the profile), so it is out of scope, not backlog.
  const closedWithoutVerdict = {
    bool: {
      filter: [{ term: { 'kibana.alert.workflow_status': 'closed' } }],
      must_not: [verdictTag],
    },
  };
  const inScope = { bool: { must_not: [notBuildingBlock, closedWithoutVerdict] } };
  const withoutVerdict = {
    bool: { must_not: [notBuildingBlock, closedWithoutVerdict, verdictTag] },
  };
  const bySeverity = async (query: object): Promise<Record<string, number>> => {
    const response = await request<{
      aggregations: { severity: { buckets: Array<{ key: string; doc_count: number }> } };
    }>('POST', `/${alertIndex}/_search`, {
      size: 0,
      query,
      aggs: {
        severity: { terms: { field: 'kibana.alert.severity', size: 10, missing: 'unknown' } },
      },
    });
    return Object.fromEntries(
      response.aggregations.severity.buckets.map(({ key, doc_count: count }) => [key, count])
    );
  };
  const nonBuildingBlockBySeverity = await bySeverity(inScope);
  const withoutVerdictBySeverity = await bySeverity(withoutVerdict);
  const alertCounts = {
    nonBuildingBlock: await countAlerts(inScope),
    nonBuildingBlockWithoutVerdict: await countAlerts(withoutVerdict),
    closedWithoutVerdict: await countAlerts({
      bool: { filter: [closedWithoutVerdict], must_not: [notBuildingBlock] },
    }),
    bySeverity: Object.fromEntries(
      Object.entries(nonBuildingBlockBySeverity).map(([severity, alerts]) => [
        severity,
        { alerts, withoutVerdict: withoutVerdictBySeverity[severity] ?? 0 },
      ])
    ),
  };
  return {
    calls,
    alertCounts,
    sweeps: sweepHits.map((hit) => hit._source),
    steps: stepHits.map((hit) => hit._source),
    alerts: alertHits.map((hit) => ({
      id: hit._id,
      timestamp: hit._source['@timestamp'],
      tags: hit._source['kibana.alert.workflow_tags'] ?? [],
      severity: hit._source['kibana.alert.severity'],
      buildingBlock: hit._source['kibana.alert.building_block_type'] !== undefined,
    })),
  };
};

// ---------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------

interface ReportArgs {
  runId: string;
  from: string;
  to: string;
  data: string;
  es: string;
  expectCluster: string;
  llm: 'fake' | 'real';
  seed?: string;
  slice?: string;
  flags: string;
  connectorId?: string;
  fakeLog?: string;
  baseline?: string;
  note?: string;
  alertIndex: string;
  notesDir: string;
  excludeRules?: string;
  excludeReason?: string;
  ledger: boolean;
}

type StringArg = Exclude<keyof ReportArgs, 'ledger'>;

const FLAGS: Readonly<Record<string, StringArg>> = {
  '--run-id': 'runId',
  '--from': 'from',
  '--to': 'to',
  '--data': 'data',
  '--es': 'es',
  '--expect-cluster': 'expectCluster',
  '--llm': 'llm',
  '--seed': 'seed',
  '--slice': 'slice',
  '--flags': 'flags',
  '--connector-id': 'connectorId',
  '--fake-log': 'fakeLog',
  '--baseline': 'baseline',
  '--note': 'note',
  '--alert-index': 'alertIndex',
  '--notes-dir': 'notesDir',
  '--exclude-rules': 'excludeRules',
  '--exclude-reason': 'excludeReason',
};

// The results folder is outside the repository and has no default: it holds `ledger.md` and `runs/`.
const REQUIRED_ARGS = [
  'runId',
  'from',
  'to',
  'data',
  'es',
  'expectCluster',
  'llm',
  'notesDir',
] as const;

const parseArgs = (argv: readonly string[]): ReportArgs => {
  const args: Partial<Record<StringArg, string>> & { ledger: boolean } = {
    alertIndex: '.alerts-security.alerts-default',
    flags: 'all off',
    ledger: true,
  };
  for (let i = 2; i < argv.length; i++) {
    const key = FLAGS[argv[i]];
    if (argv[i] === '--no-ledger') args.ledger = false;
    else if (key) args[key] = argv[++i];
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  REQUIRED_ARGS.forEach((name) => {
    if (!args[name])
      throw new Error(`--${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)} is required`);
  });
  if (!['fake', 'real'].includes(args.llm ?? '')) throw new Error('--llm must be fake or real');
  if (args.excludeRules && !args.excludeReason) {
    throw new Error(
      '--exclude-reason is required with --exclude-rules: the ledger must say why a rule is left out'
    );
  }
  return args as ReportArgs;
};

export const main = async (): Promise<void> => {
  const args = parseArgs(process.argv);
  const request = makeClient(args.es);
  const { cluster_name: cluster } = await request<{ cluster_name: string }>('GET', '/');
  if (cluster !== args.expectCluster)
    throw new Error(`refusing to run: cluster is "${cluster}", expected "${args.expectCluster}"`);

  const truth = await loadTruth(path.join(args.data, 'truth.ndjson'));
  const run = await readRun(request, args);
  const excluded = args.excludeRules
    ? resolveExcludedRules(args.data, args.excludeRules.split(';'))
    : { uuids: new Set<string>(), names: [] };
  const scorecard = buildScorecard({ ...run, truth, excludeRules: excluded.uuids });
  const cacheData = await readCacheData(request, args);
  if (cacheData.steps.length > 0) {
    scorecard.verdictCache = buildCacheSection({
      ...cacheData,
      alerts: run.alerts,
      truth,
      analyzedAlerts: scorecard.verdicts.analyzed,
    });
  }
  const poc = buildPocSection({
    alerts: run.alerts,
    truth,
    records: cacheData.records,
    verdictsPerHour: scorecard.throughput.verdictsPerHour,
  });
  if (poc.bySource.cache.verdicts + poc.bySource.jev.verdicts > 0) scorecard.poc = poc;
  scorecard.wait = buildWaitSection({
    alerts: run.alerts,
    calls: run.calls,
    sweeps: run.sweeps,
    counts: run.alertCounts,
  });
  const exclusionNote = excluded.names.length
    ? `Left out of the wrong-verdict metric (reported apart under excludedRules): ${excluded.names.join(
        '; '
      )}. Reason: ${args.excludeReason}`
    : '';
  const cacheSentence = scorecard.verdictCache ? cacheNote(scorecard.verdictCache) : '';
  const pocSentence = scorecard.poc ? pocNote(scorecard.poc) : '';
  scorecard.batches = buildBatchSection(run.calls);
  scorecard.queue = buildQueueSection({ alerts: run.alerts, truth });
  const note = [
    args.note,
    exclusionNote,
    cacheSentence,
    pocSentence,
    batchNote(scorecard.batches),
    queueNote(scorecard.queue),
  ]
    .filter(Boolean)
    .join(' ');

  const connectorIds = scorecard.costAndTokens.connectorIds;
  if (args.connectorId) {
    const unexpected = connectorIds.filter((id) => id !== args.connectorId);
    if (unexpected.length > 0) {
      throw new Error(
        `the run used connectors that were not expected (${unexpected.join(', ')}); expected only ${
          args.connectorId
        }`
      );
    }
  }
  let fakeSettings: JsonObject | undefined;
  if (args.llm === 'fake' && args.fakeLog) {
    const first = fs.readFileSync(args.fakeLog, 'utf8').split('\n')[0];
    fakeSettings = (JSON.parse(first) as { config: JsonObject }).config;
  }
  const commit = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {
    encoding: 'utf8',
  }).trim();
  const llm: LlmInfo = {
    mode: args.llm,
    connectorIds,
    fakeSettings,
    expectedConnector: args.connectorId ?? FAKE_CONNECTOR_NOTE,
  };
  const report: RunReport = {
    runId: args.runId,
    generatedAt: new Date().toISOString(),
    commit,
    window: { from: args.from, to: args.to },
    flags: args.flags,
    seed: args.seed ?? null,
    slice: args.slice ?? null,
    llm,
    note: note || null,
    excludedRuleNames: excluded.names,
    scorecard,
  };
  if (args.baseline) {
    const baselineFile = path.join(args.notesDir, 'runs', `${args.baseline}.json`);
    report.comparedToBaseline = {
      runId: args.baseline,
      differences: diffScorecards(
        scorecard,
        (JSON.parse(fs.readFileSync(baselineFile, 'utf8')) as { scorecard: Scorecard }).scorecard
      ),
    };
  }

  fs.mkdirSync(path.join(args.notesDir, 'runs'), { recursive: true });
  const reportFile = path.join(args.notesDir, 'runs', `${args.runId}.json`);
  if (fs.existsSync(reportFile))
    throw new Error(`${reportFile} exists: reports are never overwritten`);
  if (args.ledger) {
    const ledgerFile = path.join(args.notesDir, 'ledger.md');
    const row = ledgerRow({
      runId: args.runId,
      date: report.generatedAt.slice(0, 10),
      commit,
      flags: args.flags,
      seed: args.seed ?? '',
      slice: args.slice ?? '',
      llm,
      scorecard,
      note,
    });
    // The ledger has a file of its own, so that its rows stay in one table. A missing file starts with the header.
    const current = fs.existsSync(ledgerFile)
      ? fs.readFileSync(ledgerFile, 'utf8')
      : '# Results ledger\n';
    fs.writeFileSync(ledgerFile, appendLedgerRow(current, row, args.runId));
  }
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  process.stdout.write(`${JSON.stringify({ reportFile, ...report }, null, 2)}\n`);
};
