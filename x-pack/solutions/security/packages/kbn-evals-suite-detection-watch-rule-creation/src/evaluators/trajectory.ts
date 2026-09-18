/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '@kbn/evals';
import { internalTools, isAttachmentTool } from '@kbn/agent-builder-common/tools';
import { RULE_CREATION_TOOL_ID, RULE_PREVIEW_TOOL_ID } from '../constants';
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

interface ToolCalls {
  toolNames: string[];
  /** The agent's own trace; the workflow's trace id points at the eval client. */
  agentTraceId: string | undefined;
}

type Trajectory =
  | ({ available: true; joinedOn: string; settled: boolean } & ToolCalls)
  | { available: false; explanation: string };

const fetchToolCalls = async (
  traceEsClient: EsClient,
  where: string
): Promise<ToolCalls | undefined> => {
  const response = (await traceEsClient.esql.query({
    query: `FROM traces-*\n| WHERE ${where} AND ${LLM_ISSUED_TOOL_SPAN}\n| SORT @timestamp ASC\n| KEEP span_id, trace_id, attributes.gen_ai.tool.name`,
  })) as unknown as EsqlResponse;

  const seen = new Set<string>();
  const toolNames: string[] = [];
  let agentTraceId: string | undefined;
  // Rows arrive in KEEP order. Spans are indexed into two data streams, so dedupe by span_id.
  for (const [spanId, traceId, toolName] of response.values) {
    const isNewSpan = spanId != null && !seen.has(spanId);
    if (isNewSpan && toolName) {
      seen.add(spanId);
      toolNames.push(toolName);
      agentTraceId ??= traceId ?? undefined;
    }
  }
  // No rows means this join key reached no spans: unmeasured, not an empty trajectory.
  return toolNames.length > 0 ? { toolNames, agentTraceId } : undefined;
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
      a.toolNames.length === b.toolNames.length &&
      a.toolNames.every((name, i) => name === b.toolNames[i]);
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
        `Trajectory span set never settled after ${maxPolls} polls (${last.toolNames.length} calls) — scoring potentially incomplete`
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
    if (!trajectory.settled) {
      return {
        score: null,
        label: 'potentially_incomplete',
        explanation: `Span set never settled (joined on ${trajectory.joinedOn})`,
        metadata: {
          incomplete: true,
          toolNames: trajectory.toolNames,
          agentTraceId: trajectory.agentTraceId,
        },
      };
    }
    const { score, explanation, metadata } = scoreFn(trajectory);
    return {
      score,
      label: undefined,
      explanation: `${explanation} (joined on ${trajectory.joinedOn})`,
      metadata: {
        ...metadata,
        toolNames: trajectory.toolNames,
        agentTraceId: trajectory.agentTraceId,
      },
    };
  },
});

export const scoreCallCount: ScoreFn = ({ toolNames }) => {
  const total = toolNames.length;
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
export const scoreCallOrder: ScoreFn = ({ toolNames }) => {
  const firstDraft = toolNames.indexOf(RULE_CREATION_TOOL_ID);
  const skillLoaded = toolNames.indexOf(internalTools.loadSkill);
  const drafts = toolNames.filter((name) => name === RULE_CREATION_TOOL_ID).length;
  const expectedAfterDraft = (name: string) =>
    name === RULE_CREATION_TOOL_ID || name === RULE_PREVIEW_TOOL_ID || isAttachmentTool(name);
  const exploredAfterDraft =
    firstDraft === -1 ? [] : toolNames.slice(firstDraft + 1).filter((n) => !expectedAfterDraft(n));

  const violations: string[] = [];
  if (firstDraft === -1) violations.push('never drafted a rule');
  else if (skillLoaded === -1 || skillLoaded > firstDraft) {
    violations.push('drafted without loading the skill first');
  }
  if (drafts > 1) violations.push(`drafted ${drafts} times`);
  if (exploredAfterDraft.length > 0) {
    violations.push(`explored after drafting: ${[...new Set(exploredAfterDraft)].join(', ')}`);
  }

  return {
    score: violations.length === 0 ? 1 : 0,
    explanation:
      violations.length === 0
        ? 'skill → research → one draft → preview/attachments'
        : violations.join('; '),
    metadata: { drafts, exploredAfterDraft, violations },
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
