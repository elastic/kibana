/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A fake LLM for the Alert Triage test setup: an OpenAI-compatible chat completions server that answers
 * the Alert Analysis prompt from the truth file of the generated data.
 *
 * It reads every `<alert id="...">` block of the prompt, looks the alert up in `truth.ndjson`, and returns
 * one verdict per alert in the structured format of `batch_reply_schema` (`alert_analysis_workflow.yaml`).
 * The structured reply goes back as a forced tool call when the request offers a tool, and as JSON text when it does
 * not (the `ai.prompt` step of the Alert Triage worker sends no tool: the schema is in the prompt). Both a plain and a
 * streamed (server-sent events) response are supported.
 *
 * Answers are per alert, not from a random stream: the flip, the confidence and the miss of an alert come
 * from a hash of the seed and the alert id. A change in batch order or batch size does not change the
 * answer for an alert, so a difference between two runs comes from the change under test.
 *
 * Settings (all can be overridden with `--config '<json>'`, see DEFAULT_CONFIG):
 * - flipRate: the share of alerts that get the wrong verdict, SPLIT BY DIRECTION, because the two errors cost
 *   differently. `truePositiveAsFalsePositive` is the dangerous one: a true positive that gets a false-positive
 *   verdict can be closed or reused. Starting values come from the pair rates of the dump (see `results.md`):
 *   6.0% of false-positive records met a true-positive fresh verdict at 24 h, and 10.7% of true-positive records
 *   met a false-positive one. They are pair rates, not error rates against the truth, so replace them after the
 *   real baseline runs. (The 18% of the plan is the share of KEYS that hold both verdicts, not of alerts.)
 * - inconclusiveRate: the share of alerts that get "inconclusive" (4.4% in the dump).
 * - variantMissRate: per planted variant type, the chance that the model misses it. `new_hash` shows no sign
 *   in the alert (see `check_content.ts`), so it is always missed.
 * - confidence: one distribution for right answers, one for wrong answers and one for inconclusive answers. Each is
 *   `{ mean, halfWidth }` (uniform) or `{ quantiles: [...] }` (a table of equally spaced quantiles from 0 to 1, sampled with
 *   linear interpolation, as fitted from a real run by `calibrate_fake_llm.ts`). The cache writes a record only at or
 *   above `cacheThreshold` (0.85), so the two distributions decide how many right and how many wrong verdicts reach it.
 *   A missed variant that shows no sign in the alert (`new_hash`) gets the distribution of a right answer, because the
 *   model cannot tell that it is wrong.
 * - ruleModel: the real model does not flip alerts one by one. In two runs on the same 550 alerts, 501 of 513 verdicts were equal and
 *   every change sat in two rules of 22; in one rule all 10 true positives went from found to "false positive" as a batch
 *   (`results.md`, runs 5 and 6). So a share of the rules (`unstableRuleShare`, chosen by a hash of the seed and the rule) is
 *   unstable, and in a run (`--run`, default 1) such a rule flips with the chance `unstableFlipChance`: then ALL its true
 *   positives that are not planted variants get a false-positive verdict. The same seed and run give the same flips. The
 *   per-alert `flipRate` stays for the case of a model that flips alerts alone, and is 0 in the fitted settings.
 * - confidenceByKind: `{ <kind>: { correct, wrong, inconclusive } }`, a distribution per kind of alert that replaces the
 *   general one. Aggregation and cloud alerts get low confidence more often (hedging), process and file alerts almost never.
 * - latency and tokens: base plus a part per alert, times a lognormal factor, and one token per
 *   `charsPerToken` characters (or `completionPerAlert` completion tokens per alert, when set). These are SETTINGS, not measurements. Cost and throughput numbers from a fake run
 *   are estimates until a real baseline run sets them. Every log line says `"fake": true`.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/triage_testbed/fake_llm_cli.js \
 *     --truth <truth.ndjson> [--port 3099] [--seed 1] [--run 1] [--config '{"confidence":{"wrong":{"mean":0.6}}}'] [--log <requests.jsonl>]
 */

import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import readline from 'readline';
import { mulberry32 } from './seeded_random';

type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

export type Verdict = 'false_positive' | 'true_positive';
export type Classification = Verdict | 'inconclusive';

/** A confidence distribution: `{ mean, halfWidth }` (uniform) or `{ quantiles }` (a table of equally spaced quantiles). */
export interface UniformConfidence {
  mean: number;
  halfWidth: number;
  quantiles?: undefined;
}
export interface QuantileConfidence {
  quantiles: readonly number[];
  mean?: number;
  halfWidth?: number;
}
export type ConfidenceDistribution = UniformConfidence | QuantileConfidence;

export interface KindConfidence {
  correct?: ConfidenceDistribution;
  wrong?: ConfidenceDistribution;
  inconclusive?: ConfidenceDistribution;
}

export interface RuleModel {
  unstableRuleShare: number;
  unstableFlipChance: number;
}

export interface FakeLlmConfig {
  flipRate: { falsePositiveAsTruePositive: number; truePositiveAsFalsePositive: number };
  inconclusiveRate: number;
  variantMissRate: Record<string, number>;
  invisibleVariants: string[];
  ruleModel: RuleModel;
  confidenceByKind: Record<string, KindConfidence>;
  confidence: {
    correct: ConfidenceDistribution;
    wrong: ConfidenceDistribution;
    inconclusive: ConfidenceDistribution;
    cacheThreshold: number;
  };
  latency: { baseMs: number; perAlertMs: number; sigma: number };
  tokens: { charsPerToken: number; completionPerAlert: number | null };
  model: string;
}

/** What `--config` can override: any part of the settings. */
export type FakeLlmConfigOverrides = DeepPartial<FakeLlmConfig>;

/** One line of `truth.ndjson`. */
export interface TruthRecord {
  verdict: Verdict;
  variant?: string | null;
  benign?: string | null;
  kind?: string;
  ruleUuid?: string;
}

export type Truth = ReadonlyMap<string, TruthRecord>;

export interface AnswerContext {
  seed: number;
  run?: number;
  config: FakeLlmConfig;
  truth: Truth;
}

/** The answer of the fake model for one alert. */
export interface Answer {
  id: string;
  known: boolean;
  truth?: Verdict;
  ruleFlipped?: boolean;
  classification: Classification;
  confidence_score: number;
}

export interface VerdictEntry {
  id: string;
  classification: Classification;
  confidence_score: number;
  rationale: string;
  contributing_factors: string[];
}

export const DEFAULT_CONFIG: FakeLlmConfig = {
  flipRate: { falsePositiveAsTruePositive: 0.06, truePositiveAsFalsePositive: 0.107 },
  inconclusiveRate: 0.044,
  variantMissRate: {
    new_hash: 1,
    untrusted_signer: 0.2,
    encoded_command_line: 0.2,
    different_script_same_shape: 0.3,
  },
  // A variant that shows no sign in the alert is missed with the confidence of a right verdict.
  invisibleVariants: ['new_hash'],
  ruleModel: { unstableRuleShare: 0, unstableFlipChance: 0 },
  confidenceByKind: {},
  confidence: {
    correct: { mean: 0.88, halfWidth: 0.1 },
    wrong: { mean: 0.76, halfWidth: 0.1 },
    inconclusive: { mean: 0.55, halfWidth: 0.15 },
    cacheThreshold: 0.85,
  },
  latency: { baseMs: 2000, perAlertMs: 150, sigma: 0.5 },
  tokens: { charsPerToken: 4, completionPerAlert: null },
  model: 'fake-haiku',
};

const RATIONALES: Readonly<Record<Classification, { text: string; factors: string[] }>> = {
  false_positive: {
    text: 'Signed vendor software from a standard location, routine activity.',
    factors: ['signed binary', 'standard path'],
  },
  true_positive: {
    text: 'Unsigned binary or script with a download or encoded command line.',
    factors: ['unsigned or untrusted', 'suspicious command line'],
  },
  inconclusive: {
    text: 'Evidence points both ways, more context is needed.',
    factors: ['mixed signals'],
  },
};

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
interface JsonObject {
  [key: string]: Json;
}

const isJsonObject = (value: Json | undefined): value is JsonObject =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const mergeJson = (base: JsonObject, extra: JsonObject | undefined): JsonObject => ({
  // Keys that only `extra` has (for example the kinds of `confidenceByKind`) are kept as given.
  ...extra,
  ...Object.fromEntries(
    Object.entries(base).map(([k, v]): [string, Json] => {
      const override = extra?.[k];
      return [k, isJsonObject(v) ? mergeJson(v, (override ?? {}) as JsonObject) : override ?? v];
    })
  ),
});

const merge = <T extends object>(base: T, extra: DeepPartial<T>): T =>
  mergeJson(base as JsonObject, extra as JsonObject) as T;

/** A number in [0, 1) that depends only on the seed, the alert id and the purpose. */
const unit = (seed: number, id: string, purpose: string): number =>
  crypto.createHash('sha256').update(`${seed}|${id}|${purpose}`).digest().readUInt32BE(0) /
  4294967296;

const lerp = ([low, high]: readonly [number, number], u: number): number => low + (high - low) * u;
const opposite = (verdict: Verdict): Verdict =>
  verdict === 'false_positive' ? 'true_positive' : 'false_positive';
const around = (mean: number, halfWidth: number): [number, number] => [
  Math.max(0, mean - halfWidth),
  Math.min(1, mean + halfWidth),
];

/** A confidence from a distribution (`{ mean, halfWidth }` or `{ quantiles }`) and a number `u` in [0, 1). */
export const sampleConfidence = (distribution: ConfidenceDistribution, u: number): number => {
  const { quantiles } = distribution;
  if (!quantiles) {
    const { mean, halfWidth } = distribution;
    return lerp(around(mean, halfWidth), u);
  }
  const position = u * (quantiles.length - 1);
  const index = Math.floor(position);
  if (index >= quantiles.length - 1) return quantiles[quantiles.length - 1];
  return quantiles[index] + (quantiles[index + 1] - quantiles[index]) * (position - index);
};

/** Whether the rule of an alert is unstable and flips in this run. Depends only on the seed, the rule and the run. */
export const ruleFlips = (
  {
    seed,
    run = 1,
    config,
  }: { seed: number; run?: number; config: Pick<FakeLlmConfig, 'ruleModel'> },
  known: Pick<TruthRecord, 'ruleUuid'>
): boolean => {
  const { unstableRuleShare, unstableFlipChance } = config.ruleModel;
  if (!known.ruleUuid || !(unstableRuleShare > 0)) return false;
  if (unit(seed, known.ruleUuid, 'unstable-rule') >= unstableRuleShare) return false;
  return unit(seed, known.ruleUuid, `rule-flip|${run}`) < unstableFlipChance;
};

/** The verdict of one alert. Pure: the same seed, run and alert id always give the same answer. */
export const answerAlert = (
  { seed, run = 1, config, truth }: AnswerContext,
  id: string
): Answer => {
  const known = truth.get(id);
  if (!known) {
    return { id, known: false, classification: 'inconclusive', confidence_score: 0.5 };
  }
  const distribution = (which: keyof KindConfidence): ConfidenceDistribution =>
    (known.kind === undefined ? undefined : config.confidenceByKind?.[known.kind]?.[which]) ??
    config.confidence[which];
  if (unit(seed, id, 'inconclusive') < config.inconclusiveRate) {
    return {
      id,
      known: true,
      truth: known.verdict,
      classification: 'inconclusive',
      confidence_score: sampleConfidence(
        distribution('inconclusive'),
        unit(seed, id, 'confidence')
      ),
    };
  }
  const rate = (verdict: Verdict): number =>
    verdict === 'false_positive'
      ? config.flipRate.falsePositiveAsTruePositive
      : config.flipRate.truePositiveAsFalsePositive;
  const ruleFlipped =
    !known.variant && known.verdict === 'true_positive' && ruleFlips({ seed, run, config }, known);
  const wrong = known.variant
    ? unit(seed, id, 'miss') < (config.variantMissRate[known.variant] ?? 0)
    : ruleFlipped || unit(seed, id, 'flip') < rate(known.verdict);
  const invisible =
    Boolean(known.variant) && config.invisibleVariants.includes(known.variant ?? '');
  return {
    id,
    known: true,
    truth: known.verdict,
    ruleFlipped,
    classification: wrong ? opposite(known.verdict) : known.verdict,
    confidence_score: sampleConfidence(
      distribution(wrong && !invisible ? 'wrong' : 'correct'),
      unit(seed, id, 'confidence')
    ),
  };
};

/** The alert ids of a prompt, in order, without duplicates. */
export const parseAlertIds = (text: string): string[] => [
  ...new Set(
    [...text.matchAll(/<alert id="([^"]+)"/g)]
      .map((match) => match[1])
      // The instructions of the prompt show the format as `<alert id="...">`: that is not an alert.
      .filter((id) => id !== '...')
  ),
];

export const toVerdict = (answer: Answer): VerdictEntry => {
  const { text, factors } = RATIONALES[answer.classification];
  return {
    id: answer.id,
    classification: answer.classification,
    confidence_score: Number(answer.confidence_score.toFixed(3)),
    rationale: text,
    contributing_factors: factors,
  };
};

interface ChatMessage {
  content?: string | Array<{ text?: string }> | null;
}

interface ChatTool {
  function?: { name?: string; parameters?: { properties?: { response?: object } } };
}

interface ChatRequestBody {
  model?: string;
  stream?: boolean;
  messages?: ChatMessage[];
  tools?: ChatTool[];
  tool_choice?: { function?: { name?: string } };
}

const messageText = (message: ChatMessage): string =>
  typeof message.content === 'string'
    ? message.content
    : (message.content ?? []).map((part) => part.text ?? '').join('\n');

const TOOL_USE_START = '<|tool_use_start|>';
const TOOL_USE_END = '<|tool_use_end|>';

/**
 * The inference plugin uses SIMULATED function calling for an OpenAI-compatible connector: the request has no tools,
 * and the tool instructions are in the prompt. The model must answer with a block that the plugin parses:
 *   <|tool_use_start|>
 *   ```json
 *   {"name": "<tool>", "input": { ... }}
 *   ```
 *   <|tool_use_end|>
 * Any other answer fails with "Invalid function call syntax". The tool name comes from the line that the plugin adds when
 * a tool is forced ("Remember, use the <tool> tool to answer this question."), or else from the last tool that the
 * system instructions list (their examples are called `my_tool...`).
 */
export const simulatedToolNameOf = (prompt: string): string | undefined => {
  if (!prompt.includes(TOOL_USE_START)) return undefined;
  const forced = prompt.match(/use the (\S+) tool to answer this question/);
  if (forced) return forced[1];
  const listed = [...prompt.matchAll(/\{"name":"([^"]+)"/g)]
    .map((match) => match[1])
    .filter((name) => !name.startsWith('my_tool'));
  return listed[listed.length - 1];
};

const inlineToolUse = (name: string, input: object): string =>
  `${TOOL_USE_START}\n\`\`\`json\n${JSON.stringify({ name, input })}\n\`\`\`\n${TOOL_USE_END}`;

/** The name of the tool the request forces or offers, so that the reply calls the same tool. */
const toolNameOf = (body: ChatRequestBody): string | undefined =>
  body.tool_choice?.function?.name ?? body.tools?.[0]?.function?.name ?? undefined;

/**
 * The `ai.prompt` step wraps the schema of its caller in `{ response: <schema> }` (`withStructuredOutput` needs an
 * object at the root) and reads `parsed.response`. A reply without the wrapper does not match, `parsed` is null and
 * the step fails with "Cannot read properties of null (reading 'response')". The text reply (the JSON mode of that
 * step) is always wrapped. A tool reply is wrapped when the parameters of the tool have a `response` property.
 */
const wrapsResponse = (body: ChatRequestBody): boolean => {
  const toolName = toolNameOf(body);
  if (toolName === undefined) return true;
  const tool = (body.tools ?? []).find((candidate) => candidate.function?.name === toolName);
  return Boolean(tool?.function?.parameters?.properties?.response);
};

export const loadTruth = async (file: string): Promise<Map<string, TruthRecord>> => {
  const truth = new Map<string, TruthRecord>();
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    const { id, verdict, variant, kind, ruleUuid } = JSON.parse(line) as TruthRecord & {
      id: string;
    };
    truth.set(id, { verdict, variant, kind, ruleUuid });
  }
  return truth;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const normal = (rng: () => number): number =>
  Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());

interface AnswerStats {
  count: number;
  confidenceSum: number;
  atOrAboveCacheThreshold: number;
}

interface Delta {
  role?: string;
  content?: string | null;
  tool_calls?: Array<{
    index: number;
    id?: string;
    type?: string;
    function: { name?: string; arguments: string };
  }>;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ServerOptions {
  seed: number;
  run?: number;
  config: FakeLlmConfig;
  truth: Truth;
  logFile?: string;
}

export const createServer = ({
  seed,
  run = 1,
  config,
  truth,
  logFile,
}: ServerOptions): http.Server => {
  const stats = {
    requests: 0,
    alerts: 0,
    unknownAlerts: 0,
    noAlertRequests: 0,
    run,
    // The rules whose true positives flipped as a whole in this run.
    flippedRules: new Set<string>(),
    // Per (truth > verdict): how many, the sum of confidence, and how many reach the cache threshold.
    answers: {} as Record<string, AnswerStats>,
  };
  let counter = 0;

  const handle = async (response: http.ServerResponse, rawBody: string): Promise<void> => {
    let body: ChatRequestBody;
    try {
      body = JSON.parse(rawBody) as ChatRequestBody;
    } catch {
      response.writeHead(400).end('invalid JSON');
      return;
    }
    const startedAt = Date.now();
    const requestNumber = ++counter;
    stats.requests++;

    const prompt = (body.messages ?? []).map(messageText).join('\n');
    const ids = parseAlertIds(prompt);
    const answers = ids.map((id) => answerAlert({ seed, run, config, truth }, id));
    stats.alerts += ids.length;
    answers.forEach((answer) => {
      if (!answer.known) return;
      const { ruleUuid } = truth.get(answer.id) ?? {};
      if (answer.ruleFlipped && ruleUuid) stats.flippedRules.add(ruleUuid);
      const key = `${answer.truth === 'false_positive' ? 'fp' : 'tp'}>${
        { false_positive: 'fp', true_positive: 'tp', inconclusive: 'inc' }[answer.classification]
      }`;
      const entry = (stats.answers[key] = stats.answers[key] ?? {
        count: 0,
        confidenceSum: 0,
        atOrAboveCacheThreshold: 0,
      });
      entry.count++;
      entry.confidenceSum += answer.confidence_score;
      if (answer.confidence_score >= config.confidence.cacheThreshold) {
        entry.atOrAboveCacheThreshold++;
      }
    });
    stats.unknownAlerts += answers.filter((a) => !a.known).length;
    if (ids.length === 0) stats.noAlertRequests++;

    // Latency: base plus a part per alert, with a long tail. Deterministic per request number.
    const rngSeed = Number.parseInt(
      crypto
        .createHash('sha256')
        .update(`${seed}|latency|${requestNumber}`)
        .digest('hex')
        .slice(0, 8),
      16
    );
    const rng = mulberry32(rngSeed);
    const latencyMs = Math.round(
      (config.latency.baseMs + config.latency.perAlertMs * ids.length) *
        Math.exp(config.latency.sigma * normal(rng) - config.latency.sigma ** 2 / 2)
    );
    await sleep(latencyMs);

    const reply = {
      verdicts: answers.map(toVerdict),
      batch_summary: `${ids.length} alerts classified.`,
    };
    const toolName = toolNameOf(body);
    const simulatedName = toolName === undefined ? simulatedToolNameOf(prompt) : undefined;
    const argumentsJson = JSON.stringify(wrapsResponse(body) ? { response: reply } : reply);
    const promptTokens = Math.ceil(prompt.length / config.tokens.charsPerToken);
    const { completionPerAlert, charsPerToken } = config.tokens;
    const completionTokens =
      completionPerAlert === null || completionPerAlert === undefined
        ? Math.ceil(argumentsJson.length / charsPerToken)
        : Math.ceil(ids.length * completionPerAlert);
    const usage = {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    };
    const id = `chatcmpl-fake-${requestNumber}`;
    const created = Math.floor(Date.now() / 1000);
    const model = body.model ?? config.model;
    // With a tool in the request, the reply is a tool call. Without a tool the schema travels in the prompt (the
    // connector sends only model, temperature and stream) and the model answers with the JSON as text.
    // With no alerts in the prompt there is nothing to classify.
    const toolCall: ToolCall | undefined =
      toolName !== undefined && ids.length > 0
        ? {
            id: `call_${requestNumber}`,
            type: 'function',
            function: { name: toolName, arguments: argumentsJson },
          }
        : undefined;
    const asTool = toolCall !== undefined;
    const textReply = (): string | null => {
      if (asTool) return null;
      if (ids.length === 0) return 'No alerts to classify.';
      // Simulated function calling: the tool input is the wrapped reply, as for a real tool.
      return simulatedName ? inlineToolUse(simulatedName, { response: reply }) : argumentsJson;
    };
    const text = textReply();

    if (body.stream) {
      response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      const send = (delta: Delta, finish: string | null): boolean =>
        response.write(
          `data: ${JSON.stringify({
            id,
            object: 'chat.completion.chunk',
            created,
            model,
            choices: [{ index: 0, delta, finish_reason: finish }],
          })}\n\n`
        );
      if (toolCall) {
        send(
          {
            role: 'assistant',
            tool_calls: [
              {
                index: 0,
                id: toolCall.id,
                type: 'function',
                function: { name: toolCall.function.name, arguments: '' },
              },
            ],
          },
          null
        );
        send({ tool_calls: [{ index: 0, function: { arguments: argumentsJson } }] }, null);
        send({}, 'tool_calls');
      } else {
        send({ role: 'assistant', content: text }, null);
        send({}, 'stop');
      }
      response.write(
        `data: ${JSON.stringify({
          id,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [],
          usage,
        })}\n\n`
      );
      response.write('data: [DONE]\n\n');
      response.end();
    } else {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({
          id,
          object: 'chat.completion',
          created,
          model,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: text,
                ...(toolCall ? { tool_calls: [toolCall] } : {}),
              },
              finish_reason: asTool ? 'tool_calls' : 'stop',
            },
          ],
          usage,
        })
      );
    }

    if (logFile) {
      fs.appendFileSync(
        logFile,
        `${JSON.stringify({
          at: new Date(startedAt).toISOString(),
          request: requestNumber,
          alerts: ids.length,
          unknownAlerts: answers.filter((a) => !a.known).length,
          latencyMs,
          promptTokens,
          completionTokens,
          // Everything of the request except the messages, so that the way the connector asks for a structured
          // reply (tools, response_format, ...) can be read from the log.
          shape: JSON.stringify(
            Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'messages'))
          ).slice(0, 2500),
          // The latency and the tokens are settings, not measurements.
          // Whether the prompt used simulated function calling, and the tool that the reply named.
          simulatedTool: simulatedName ?? null,
          fake: true,
          stream: Boolean(body.stream),
          tool: toolName ?? null,
          verdicts: answers.reduce<Record<string, number>>(
            (count, a) => ({ ...count, [a.classification]: (count[a.classification] ?? 0) + 1 }),
            {}
          ),
        })}\n`
      );
    }
  };

  return http.createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      const url = (request.url ?? '').split('?')[0];
      if (request.method === 'GET' && url === '/health') {
        response.writeHead(200, { 'Content-Type': 'application/json' }).end(
          JSON.stringify({
            ok: true,
            ...stats,
            flippedRules: [...stats.flippedRules],
            answers: Object.fromEntries(
              Object.entries(stats.answers).map(([key, entry]) => [
                key,
                {
                  count: entry.count,
                  meanConfidence: Number((entry.confidenceSum / entry.count).toFixed(3)),
                  shareAtOrAboveCacheThreshold: Number(
                    (entry.atOrAboveCacheThreshold / entry.count).toFixed(3)
                  ),
                },
              ])
            ),
          })
        );
      } else if (request.method === 'GET' && url.endsWith('/models')) {
        response
          .writeHead(200, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ object: 'list', data: [{ id: config.model, object: 'model' }] }));
      } else if (request.method === 'POST' && url.endsWith('/chat/completions')) {
        handle(response, Buffer.concat(chunks).toString('utf8')).catch((error: Error) => {
          process.stderr.write(`${error.stack}\n`);
          if (!response.headersSent) response.writeHead(500);
          response.end('fake LLM error');
        });
      } else {
        response.writeHead(404).end('not found');
      }
    });
  });
};

interface FakeLlmArgs {
  truth: string;
  port: number;
  seed: number;
  run: number;
  config: FakeLlmConfigOverrides;
  log?: string;
}

const parseArgs = (argv: readonly string[]): FakeLlmArgs => {
  const args: Partial<FakeLlmArgs> & Pick<FakeLlmArgs, 'port' | 'seed' | 'run' | 'config'> = {
    port: 3099,
    seed: 1,
    run: 1,
    config: {},
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--truth') args.truth = argv[++i];
    else if (argv[i] === '--port') args.port = Number(argv[++i]);
    else if (argv[i] === '--seed') args.seed = Number(argv[++i]);
    else if (argv[i] === '--run') args.run = Number(argv[++i]);
    else if (argv[i] === '--config') args.config = JSON.parse(argv[++i]) as FakeLlmConfigOverrides;
    else if (argv[i] === '--log') args.log = argv[++i];
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  if (!args.truth) throw new Error('--truth <truth.ndjson> is required');
  return args as FakeLlmArgs;
};

export const main = async (): Promise<void> => {
  const args = parseArgs(process.argv);
  const config = merge(DEFAULT_CONFIG, args.config);
  const truth = await loadTruth(args.truth);
  const server = createServer({ seed: args.seed, run: args.run, config, truth, logFile: args.log });
  server.listen(args.port, '127.0.0.1', () => {
    process.stdout.write(
      `${JSON.stringify({
        listening: `http://127.0.0.1:${args.port}`,
        truthAlerts: truth.size,
        seed: args.seed,
        run: args.run,
        config,
      })}\n`
    );
  });
};
