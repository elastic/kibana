/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '@kbn/evals';
import {
  internalTools,
  isAttachmentTool,
  platformCoreTools,
} from '@kbn/agent-builder-common/tools';
import { RULE_CREATION_SKILL_ID, RULE_CREATION_TOOL_ID, RULE_PREVIEW_TOOL_ID } from '../constants';
import type { RuleCreationResult } from '../rule_creation_client';
import { extractConversationId, toolSpanJoinClauses, LLM_ISSUED_TOOL_SPAN } from './tool_routing';

const MAX_TOOL_CALLS = 8;

interface EsqlResponse {
  values: Array<Array<string | null>>;
}

export interface TrajectoryFetchOptions {
  settleMs?: number;
  maxPolls?: number;
  sleep?: (ms: number) => Promise<void>;
}

interface ToolCall {
  name: string;
  skill?: string;
}

interface ToolCalls {
  calls: ToolCall[];
  /** The agent's own trace; the workflow's trace id points at the eval client. */
  agentTraceId: string | undefined;
}

type Trajectory =
  | ({ available: true; joinedOn: string; settled: boolean } & ToolCalls)
  | { available: false; explanation: string };

const skillArgument = (toolArguments: string | null): string | undefined => {
  try {
    const { skill } = JSON.parse(toolArguments ?? '') as { skill?: unknown };
    return typeof skill === 'string' ? skill : undefined;
  } catch {
    return undefined;
  }
};

const fetchToolCalls = async (
  traceEsClient: EsClient,
  where: string
): Promise<ToolCalls | undefined> => {
  const response = (await traceEsClient.esql.query({
    query: `FROM traces-*\n| WHERE ${where} AND ${LLM_ISSUED_TOOL_SPAN}\n| SORT @timestamp ASC\n| KEEP span_id, trace_id, attributes.gen_ai.tool.name, attributes.gen_ai.tool.call.arguments`,
  })) as unknown as EsqlResponse;

  const seen = new Set<string>();
  const calls: ToolCall[] = [];
  let agentTraceId: string | undefined;
  // Rows arrive in KEEP order. Spans are indexed into two data streams, so dedupe by span_id.
  for (const [spanId, traceId, name, toolArguments] of response.values) {
    const isNewSpan = spanId != null && !seen.has(spanId);
    if (isNewSpan && name) {
      seen.add(spanId);
      calls.push(
        name === internalTools.loadSkill ? { name, skill: skillArgument(toolArguments) } : { name }
      );
      agentTraceId ??= traceId ?? undefined;
    }
  }
  // No rows means this join key reached no spans: unmeasured, not an empty trajectory.
  return calls.length > 0 ? { calls, agentTraceId } : undefined;
};

/**
 * Agent Builder exports spans in batches (1s in dev, 5s in prod), so a run's spans can still be
 * arriving when the workflow returns. Polls until two consecutive reads agree.
 */
export const createTrajectoryFetcher = ({
  traceEsClient,
  log,
  settleMs = 2000,
  maxPolls = 4,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}: { traceEsClient: EsClient; log: ToolingLog } & TrajectoryFetchOptions) => {
  const cache = new Map<string, Promise<Trajectory>>();

  const resolve = async (output: RuleCreationResult | undefined): Promise<Trajectory> => {
    const traceId = output?.traceId;
    const conversationId = extractConversationId(output);
    const clauses = toolSpanJoinClauses({ traceId, conversationId });
    if (clauses.length === 0) {
      return {
        available: false,
        explanation: 'No traceId and no draft conversation_id to join tool spans on',
      };
    }

    type Read = ToolCalls & { joinedOn: string };
    const sameRead = (a: Read, b: Read) =>
      a.joinedOn === b.joinedOn &&
      a.calls.length === b.calls.length &&
      a.calls.every((call, i) => call.name === b.calls[i].name);
    let last: Read | undefined;
    for (let poll = 1; poll <= maxPolls; poll++) {
      let current: Read | undefined;
      for (const clause of clauses) {
        try {
          const calls = await fetchToolCalls(traceEsClient, clause.where);
          if (calls) {
            current = { ...calls, joinedOn: clause.name };
            break;
          }
        } catch (error) {
          log.debug(
            `Trajectory ${clause.name} join failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
      if (current && last && sameRead(current, last)) {
        return { available: true, ...current, settled: true };
      }
      last = current ?? last;
      if (poll < maxPolls) await sleep(settleMs);
    }

    if (last) {
      log.warning(
        `Trajectory span set never settled after ${maxPolls} polls (${last.calls.length} calls) — scoring potentially incomplete`
      );
      return { available: true, ...last, settled: false };
    }
    log.warning('Trajectory unavailable — no TOOL spans reachable via any join key');
    return {
      available: false,
      explanation: 'No TOOL spans reachable via the workflow trace id or the draft conversation_id',
    };
  };

  return (output: RuleCreationResult | undefined): Promise<Trajectory> => {
    const key = `${output?.traceId ?? ''}|${extractConversationId(output) ?? ''}`;
    let pending = cache.get(key);
    if (!pending) {
      pending = resolve(output);
      cache.set(key, pending);
    }
    return pending;
  };
};

type ScoreFn = (t: Extract<Trajectory, { available: true }>) => {
  score: number;
  explanation: string;
  metadata: Record<string, unknown>;
};

const trajectoryEvaluator = (
  name: string,
  fetchTrajectory: ReturnType<typeof createTrajectoryFetcher>,
  scoreFn: ScoreFn
): Evaluator => ({
  direction: 'maximize',
  name,
  kind: 'CODE',
  evaluate: async ({ output }) => {
    const trajectory = await fetchTrajectory(output as RuleCreationResult | undefined);
    if (!trajectory.available) {
      return {
        score: null,
        label: 'unavailable',
        explanation: trajectory.explanation,
        metadata: undefined,
      };
    }
    const toolNames = trajectory.calls.map((call) => call.name);
    if (!trajectory.settled) {
      return {
        score: null,
        label: 'potentially_incomplete',
        explanation: `Span set never settled (joined on ${trajectory.joinedOn})`,
        metadata: { incomplete: true, toolNames, agentTraceId: trajectory.agentTraceId },
      };
    }
    const { score, explanation, metadata } = scoreFn(trajectory);
    return {
      score,
      label: undefined,
      explanation: `${explanation} (joined on ${trajectory.joinedOn})`,
      metadata: { ...metadata, toolNames, agentTraceId: trajectory.agentTraceId },
    };
  },
});

export const scoreCallCount: ScoreFn = ({ calls }) => {
  const total = calls.length;
  return {
    score: total <= MAX_TOOL_CALLS ? 1 : 0,
    explanation: `${total} tool call(s), bound ${MAX_TOOL_CALLS}`,
    metadata: { total, max: MAX_TOOL_CALLS },
  };
};

/**
 * The detection-rule-edit skill prescribes: load the skill → research → draft the rule once →
 * preview / render the attachment. Checks the run against that shape.
 */
export const scoreCallOrder: ScoreFn = ({ calls }) => {
  const names = calls.map((call) => call.name);
  const [first] = calls;
  const firstDraft = names.indexOf(RULE_CREATION_TOOL_ID);
  const drafts = names.filter((name) => name === RULE_CREATION_TOOL_ID).length;
  const finishingTool = (name: string) => name === RULE_PREVIEW_TOOL_ID || isAttachmentTool(name);
  const beforeDraft = names.slice(1, firstDraft === -1 ? undefined : firstDraft);
  const finishedBeforeDrafting = beforeDraft.filter(finishingTool);
  const exploredAfterDraft: string[] = [];
  let previewed = false;
  for (const name of firstDraft === -1 ? [] : names.slice(firstDraft + 1)) {
    if (name === RULE_PREVIEW_TOOL_ID) previewed = true;
    const validatingPreview = previewed && name === platformCoreTools.generateEsql;
    if (name !== RULE_CREATION_TOOL_ID && !finishingTool(name) && !validatingPreview) {
      exploredAfterDraft.push(name);
    }
  }
  const unique = (list: string[]) => [...new Set(list)].join(', ');

  const violations: string[] = [];
  if (first?.name !== internalTools.loadSkill) {
    violations.push('did not load a skill before anything else');
  } else if (first.skill === undefined) {
    violations.push(
      'loaded skill is not recorded on the span (agentBuilder:tracing:includeToolDetails is off)'
    );
  } else if (!first.skill.includes(RULE_CREATION_SKILL_ID)) {
    violations.push(`loaded skill "${first.skill}" instead of ${RULE_CREATION_SKILL_ID}`);
  }
  if (firstDraft === -1) violations.push('never drafted a rule');
  if (finishedBeforeDrafting.length > 0) {
    violations.push(
      `previewed or edited attachments before drafting: ${unique(finishedBeforeDrafting)}`
    );
  }
  if (drafts > 1) violations.push(`drafted ${drafts} times`);
  if (exploredAfterDraft.length > 0) {
    violations.push(`explored after drafting: ${unique(exploredAfterDraft)}`);
  }

  return {
    score: violations.length === 0 ? 1 : 0,
    explanation:
      violations.length === 0
        ? 'skill → research → one draft → preview/attachments'
        : violations.join('; '),
    metadata: {
      loadedSkill: first?.skill,
      drafts,
      finishedBeforeDrafting,
      exploredAfterDraft,
      violations,
    },
  };
};

export const createTrajectoryEvaluators = (
  deps: { traceEsClient: EsClient; log: ToolingLog } & TrajectoryFetchOptions
): Evaluator[] => {
  const fetchTrajectory = createTrajectoryFetcher(deps);
  return [
    trajectoryEvaluator('Trajectory: Call Count', fetchTrajectory, scoreCallCount),
    trajectoryEvaluator('Trajectory: Call Order', fetchTrajectory, scoreCallOrder),
  ];
};
