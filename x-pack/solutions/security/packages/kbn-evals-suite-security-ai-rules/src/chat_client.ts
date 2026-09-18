/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry, { AbortError } from 'p-retry';
import type { ReferenceRule } from '../datasets/sample_rules';

// This string literal mirrors the constant defined in security_solution/common/constants.
// It is inlined here to avoid a package→plugin import boundary violation.
const SECURITY_RULE_ATTACHMENT_TYPE = 'security.rule';

const AGENT_BUILDER_CONVERSE_API_PATH = '/api/agent_builder/converse';
const SECURITY_CREATE_DETECTION_RULE_TOOL_ID = 'security.create_detection_rule';

/**
 * The skill the rule-creation prompt expects the agent to load. Mirrors the `skillName`
 * passed to `createSkillInvocationEvaluator` in evaluate_dataset.ts, and is used to tell a
 * SKILL.md load apart from an unrelated file read (see {@link isExpectedSkillLoad}).
 */
const DETECTION_RULE_SKILL_NAME = 'detection-rule-edit';

export type EvalFetch = (path: string, options?: Record<string, unknown>) => Promise<unknown>;

interface ToolResult {
  type?: string;
  data?: Record<string, unknown>;
}

interface RuleToolStep {
  type: string;
  tool_id?: string;
  params?: Record<string, unknown>;
  results?: ToolResult[];
}

interface ConverseResponse {
  steps?: RuleToolStep[];
  // RoundCompleteEventData declares trace_id as `string | string[]`; coerce to string at the boundary.
  trace_id?: string | string[];
}

interface SecurityRuleGenerationLog {
  warning: (msg: string) => void;
  error?: (msg: string) => void;
}

function errorStatus(error: unknown): number | undefined {
  return (
    (error as { response?: { status?: number } })?.response?.status ??
    (error as { status?: number })?.status ??
    (error as { statusCode?: number })?.statusCode
  );
}

/**
 * Network error codes reach us wrapped (`KbnClientRequesterError` carries the underlying
 * failure as `Error.cause`), so walk the cause chain rather than reading one level.
 */
function errorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string') {
      return code;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

/**
 * A converse round is NOT idempotent — the agent can execute
 * `security.create_detection_rule`, and the API has no idempotency key or request id that
 * would let a repeat be deduplicated. Retrying an ambiguous failure is therefore how a
 * single example creates two rules and keeps only the second attempt's trace: a response we
 * received but could not use (5xx other than 429/503), or a connection reset/timeout after
 * the request was written (`ECONNRESET`, `ETIMEDOUT`, socket hang up).
 *
 * Only failures that prove the request never ran are retried:
 *   - HTTP 429/503 — the service declined to process it. This is a subset of the statuses the
 *     shared eval HTTP handler retries (`@kbn/evals/src/utils/http_handler_from_kbn_client.ts`
 *     retries 429/503/504); 504 is a gateway timeout, so the round may well have run and it is
 *     deliberately left out here.
 *   - Connection-establishment errors (`ECONNREFUSED`, `ENOTFOUND`, `EAI_AGAIN`) — nothing
 *     was sent, so nothing can have executed.
 * Everything else is surfaced as an agent error (the dataset summary reports it) instead of
 * silently duplicating a side effect.
 */
const RETRYABLE_HTTP_STATUSES = new Set([429, 503]);
const RETRYABLE_NETWORK_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN']);

function isRetrySafe(error: unknown): boolean {
  const status = errorStatus(error);
  if (typeof status === 'number') {
    return RETRYABLE_HTTP_STATUSES.has(status);
  }

  const code = errorCode(error);
  if (code && RETRYABLE_NETWORK_CODES.has(code)) {
    return true;
  }

  // The requester formats network failures into the message ("Cause: ECONNREFUSED"), which
  // survives even when the code itself is nested beyond the cause-walk depth above.
  const message = error instanceof Error ? error.message : String(error);
  return [...RETRYABLE_NETWORK_CODES].some((retryableCode) =>
    new RegExp(`\\b${retryableCode}\\b`).test(message)
  );
}

export class SecurityRuleGenerationClient {
  constructor(
    private readonly fetch: EvalFetch,
    private readonly log: SecurityRuleGenerationLog,
    private readonly connectorId: string
  ) {}

  public async generateRule(prompt: string): Promise<{
    generatedRule?: Partial<ReferenceRule>;
    error?: string;
    traceId?: string;
    /**
     * Tool IDs invoked during the conversation, in order. Powers the trajectory
     * evaluator. Calls that load the expected `detection-rule-edit` SKILL.md
     * (`load_skill` with the skill name, `read_file`/legacy `filestore.read` with
     * `<skill>/SKILL.md`) are filtered out because the skill-invocation evaluator
     * already covers them; other calls to those same tools are kept so they stay
     * visible as extra tools.
     */
    toolCalls?: string[];
  }> {
    const payload = {
      // `agent_id` intentionally omitted: the converse API defaults to the
      // default Elastic AI agent. Hardcoding the legacy 'security.agent' id
      // broke the evals once that agent was removed from the product.
      input: `Create a detection rule based on the following user_query using the dedicated detection rule creation tool. Do not perform any other actions after creating the rule. user_query: ${prompt}`,
      connector_id: this.connectorId,
      capabilities: { visualizations: true },
      attachments: [
        {
          type: SECURITY_RULE_ATTACHMENT_TYPE,
          data: {
            text: '',
            attachmentLabel: 'AI Rule Creation',
          },
        },
      ],
      browser_api_tools: [],
    };

    const syncResponse = (await pRetry(
      async () => {
        try {
          return (await this.fetch(AGENT_BUILDER_CONVERSE_API_PATH, {
            method: 'POST',
            version: '2023-10-31',
            body: JSON.stringify(payload),
          })) as ConverseResponse;
        } catch (err) {
          // Anything that is not provably a pre-execution failure aborts pRetry — see
          // `isRetrySafe`: a retried round can create a second detection rule.
          if (!isRetrySafe(err)) {
            throw new AbortError(err instanceof Error ? err : new Error(String(err)));
          }
          throw err;
        }
      },
      {
        retries: 2,
        minTimeout: 2000,
        onFailedAttempt: (error) => {
          const remaining = error.retriesLeft;
          this.log.warning(
            `converse API call failed (attempt ${error.attemptNumber}): ${error.message}${
              remaining > 0 ? ` — retrying (${remaining} left)` : ''
            }`
          );
        },
      }
    )) as ConverseResponse;
    const extracted = extractRuleFromSyncResponse(syncResponse);
    const traceId = Array.isArray(syncResponse.trace_id)
      ? syncResponse.trace_id[0]
      : syncResponse.trace_id;
    const toolCalls = extractInvokedToolIds(syncResponse);

    if (extracted.ruleData) {
      return {
        generatedRule: mapGeneratedRule(extracted.ruleData),
        traceId,
        toolCalls,
      };
    }

    this.log.warning(
      `Agent returned no rule. Error: ${extracted.error ?? 'unknown'}. Diagnostics: ${
        extracted.diagnostics
      }`
    );
    return {
      error: extracted.error || 'No rule returned from agent',
      traceId,
      toolCalls,
    };
  }
}

/**
 * Tools the agent uses to load skill content. A call to one of these is only a SKILL.md load
 * when its arguments name the expected skill — the same argument shape the skill-invocation
 * evaluator matches in its span query (`skill_invocation.ts`: `load_skill` arguments containing
 * the skill name, or `filestore.read` arguments pointing at `<skill>/SKILL.md`). `read_file` is
 * the current id of that same file-read tool and `filestore.read` its legacy id, so both get the
 * path form here.
 */
const SKILL_ROUTING_TOOL_IDS = new Set(['load_skill', 'read_file', 'filestore.read']);

/**
 * True only for calls that load the expected SKILL.md. Filtering by tool id alone would hide
 * unrelated work as well: a `read_file` of some other path, or a `load_skill` for a different
 * skill, is not covered by the skill-invocation evaluator, and dropping it would let a
 * negative case score a perfect trajectory on an empty list and hide extra tools on positives.
 */
const isExpectedSkillLoad = (step: RuleToolStep): boolean => {
  if (!step.tool_id || !SKILL_ROUTING_TOOL_IDS.has(step.tool_id)) {
    return false;
  }
  const args = JSON.stringify(step.params ?? {});
  return step.tool_id === 'load_skill'
    ? args.includes(DETECTION_RULE_SKILL_NAME)
    : args.includes(`/${DETECTION_RULE_SKILL_NAME}/SKILL.md`);
};

const extractInvokedToolIds = (response: ConverseResponse): string[] => {
  return (
    response.steps
      ?.filter((step) => step.type === 'tool_call' && !!step.tool_id)
      .filter((step) => !isExpectedSkillLoad(step))
      .map((step) => step.tool_id as string) ?? []
  );
};

const extractRuleDataFromToolResults = (
  results?: ToolResult[]
): {
  ruleData?: Record<string, unknown>;
  error?: string;
} => {
  if (!results?.length) {
    return {};
  }

  for (const result of results) {
    if (result.type === 'error') {
      return {
        error: (result.data?.message as string) || 'Rule generation tool returned an error',
      };
    }

    if (result.type === 'other') {
      const success = result.data?.success;
      const rule = result.data?.rule as Record<string, unknown> | undefined;
      if (success === true && rule) {
        return { ruleData: rule };
      }
      if (success === false) {
        return {
          error: (result.data?.message as string) || 'Rule generation tool reported failure',
        };
      }
    }
  }

  return {};
};

const extractCategory = (ruleName: string): string => {
  const parts = ruleName.toLowerCase().split('_');
  if (parts.length >= 2) {
    const twoWordCategories = ['credential', 'defense', 'command', 'privilege'];
    if (twoWordCategories.includes(parts[0])) {
      return `${parts[0]}_${parts[1]}`;
    }
    return parts[0];
  }
  return 'unknown';
};

/**
 * The agent returns threat objects in the Kibana standard format:
 *   { framework, tactic: { id, name, reference }, technique?: [{ id, name, reference, subtechnique? }] }
 *
 * We flatten these into the simpler RuleThreat format used throughout the eval suite.
 */
const mapThreat = (raw: unknown): ReferenceRule['threat'] => {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry: Record<string, unknown>) => {
    const tacticId =
      entry.tactic && typeof entry.tactic === 'object'
        ? ((entry.tactic as Record<string, unknown>).id as string)
        : (entry.tactic as string);

    const techniques = Array.isArray(entry.technique) ? entry.technique : [];

    if (techniques.length === 0) {
      return tacticId ? [{ technique: '', tactic: tacticId }] : [];
    }

    return techniques.map((tech: Record<string, unknown>) => ({
      technique: tech.id as string,
      tactic: tacticId,
      subtechnique: Array.isArray(tech.subtechnique)
        ? ((tech.subtechnique[0] as Record<string, unknown>)?.id as string | undefined)
        : undefined,
    }));
  });
};

const mapGeneratedRule = (ruleData: Record<string, unknown>): Partial<ReferenceRule> => ({
  name: ruleData.name as string,
  description: ruleData.description as string,
  query: ruleData.query as string,
  language: (ruleData.language as string) ?? 'esql',
  type: (ruleData.type as string) ?? 'esql',
  threat: mapThreat(ruleData.threat),
  severity: ruleData.severity as string,
  tags: (ruleData.tags as string[]) || [],
  riskScore: (ruleData.risk_score ?? ruleData.riskScore) as number,
  from: ruleData.from as string,
  interval: ruleData.interval as string,
  category: extractCategory((ruleData.name as string) || ''),
});

const extractRuleFromSyncResponse = (response: ConverseResponse) => {
  const toolSteps =
    response.steps?.filter((step) => {
      const isToolStep = step.type === 'tool_call' || step.type === 'tool_result';
      return isToolStep && step.tool_id === SECURITY_CREATE_DETECTION_RULE_TOOL_ID;
    }) ?? [];
  const lastToolStep = toolSteps.at(-1);
  const extracted = extractRuleDataFromToolResults(lastToolStep?.results);

  return {
    ...extracted,
    diagnostics: JSON.stringify({
      totalSteps: response.steps?.length ?? 0,
      toolCallSteps: toolSteps.length,
      stepToolIds:
        response.steps?.filter((step) => step.type === 'tool_call').map((step) => step.tool_id) ??
        [],
      lastToolResultTypes: lastToolStep?.results?.map((result) => result.type) ?? [],
    }),
  };
};
