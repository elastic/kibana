/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '@kbn/evals';
import { isInternalTool } from '@kbn/agent-builder-common/tools';
import type { RuleCreationResult } from '../rule_creation_client';
import { extractConversationId, toolSpanJoinClauses } from './tool_routing';

// Provisional: sized from the skill's prescribed path, not from sampled traces.
const MAX_TOOL_CALLS = 8;

interface EsqlResponse {
  columns: Array<{ name: string }>;
  values: Array<Array<string | null>>;
}

export interface TrajectoryFetchOptions {
  settleMs?: number;
  maxPolls?: number;
  sleep?: (ms: number) => Promise<void>;
}

interface ToolCalls {
  toolNames: string[];
  /** Trace the agent's spans live in — not the workflow's trace id, which the eval client owns. */
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
    // tool.call.id is set only on calls the LLM issued; helper spans tools open internally
    // (e.g. search's natural_language_search) have none and are not part of the trajectory.
    query: `FROM traces-*\n| WHERE ${where} AND attributes.elastic.inference.span.kind == "TOOL" AND attributes.gen_ai.tool.call.id IS NOT NULL\n| SORT @timestamp ASC\n| KEEP span_id, trace_id, attributes.gen_ai.tool.name`,
  })) as unknown as EsqlResponse;

  const seen = new Set<string>();
  const toolNames: string[] = [];
  let agentTraceId: string | undefined;
  // Rows arrive in KEEP order. Spans are indexed into two data streams, so the same span_id
  // can appear twice; it is one call.
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
 * Agent Builder exports spans in batches (5s delay by default), so a run's spans can still be
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
      if (current && last && current.toolNames.length === last.toolNames.length) {
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
    // Tool Routing scores the same run and logs the cluster-level diagnosis; not repeated here.
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
    const { score, explanation, metadata } = scoreFn(trajectory);
    return {
      score,
      label: trajectory.settled ? undefined : 'potentially_incomplete',
      explanation: `${explanation} (joined on ${trajectory.joinedOn})`,
      metadata: {
        ...metadata,
        toolNames: trajectory.toolNames,
        agentTraceId: trajectory.agentTraceId,
        ...(trajectory.settled ? {} : { incomplete: true }),
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

// Anonymized spans are unnameable, not invented, so they are reported but not penalized.
export const scoreKnownTools =
  (knownToolIds: ReadonlySet<string>): ScoreFn =>
  ({ toolNames }) => {
    const registered: string[] = [];
    const internal: string[] = [];
    const anonymized: string[] = [];
    const unknown: string[] = [];
    for (const name of toolNames) {
      if (knownToolIds.has(name)) registered.push(name);
      else if (isInternalTool(name)) internal.push(name);
      // AgentBuilderSpanProcessor writes "custom" for non-builtin tools when includeRealNames is off.
      else if (name === 'custom') anonymized.push(name);
      else unknown.push(name);
    }
    const score = 1 - unknown.length / toolNames.length;
    return {
      score,
      explanation:
        unknown.length === 0
          ? `all ${toolNames.length} call(s) name registered tools${
              anonymized.length > 0
                ? `; ${anonymized.length} anonymized by tracing privacy settings`
                : ''
            }`
          : `${unknown.length} call(s) name tools not registered on this stack: ${[
              ...new Set(unknown),
            ].join(', ')}`,
      metadata: { registered, internal, anonymized, unknown },
    };
  };

/**
 * Separate series rather than one average, so a failing dimension cannot hide behind a passing one.
 * `knownToolIds` is Agent Builder's tool registry as read from the stack under test.
 */
export const createTrajectoryEvaluators = ({
  knownToolIds,
  ...deps
}: {
  traceEsClient: EsClient;
  log: ToolingLog;
  knownToolIds: ReadonlySet<string>;
} & TrajectoryFetchOptions): Evaluator[] => {
  const fetchTrajectory = createTrajectoryFetcher(deps);
  return [
    trajectoryEvaluator('Trajectory: Call Count', fetchTrajectory, scoreCallCount),
    trajectoryEvaluator('Trajectory: Known Tools', fetchTrajectory, scoreKnownTools(knownToolIds)),
  ];
};
