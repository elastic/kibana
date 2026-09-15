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
import { TRAJECTORY_MAX_TOOL_CALLS } from '../constants';
import type { RuleCreationResult } from '../rule_creation_client';
import { extractConversationId, toolSpanJoinClauses } from './tool_routing';

// What AgentBuilderSpanProcessor writes for non-builtin tools when includeRealNames is off.
const ANONYMIZED_TOOL_NAME = 'custom';

const TOOL_KIND = 'attributes.elastic.inference.span.kind == "TOOL"';
const TOOL_NAME_COLUMN = 'attributes.gen_ai.tool.name';

interface EsqlResponse {
  columns: Array<{ name: string }>;
  values: Array<Array<string | null>>;
}

export interface TrajectoryFetchOptions {
  settleMs?: number;
  maxPolls?: number;
  sleep?: (ms: number) => Promise<void>;
}

type Trajectory =
  | { available: true; toolNames: string[]; joinedOn: string; settled: boolean }
  | { available: false; explanation: string };

const fetchToolNames = async (
  traceEsClient: EsClient,
  where: string
): Promise<string[] | undefined> => {
  const response = (await traceEsClient.esql.query({
    query: `FROM traces-*\n| WHERE ${where} AND ${TOOL_KIND}\n| SORT @timestamp ASC\n| KEEP ${TOOL_NAME_COLUMN}`,
  })) as unknown as EsqlResponse;
  const nameIdx = response.columns.findIndex((c) => c.name === TOOL_NAME_COLUMN);
  if (nameIdx === -1) return undefined;
  const names = response.values
    .map((row) => row[nameIdx])
    .filter((n): n is string => typeof n === 'string' && n.length > 0);
  // No rows means this join key reached no spans: unmeasured, not an empty trajectory.
  return names.length > 0 ? names : undefined;
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

    let last: { toolNames: string[]; joinedOn: string } | undefined;
    for (let poll = 1; poll <= maxPolls; poll++) {
      let current: { toolNames: string[]; joinedOn: string } | undefined;
      for (const clause of clauses) {
        try {
          const toolNames = await fetchToolNames(traceEsClient, clause.where);
          if (toolNames) {
            current = { toolNames, joinedOn: clause.name };
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
        ...(trajectory.settled ? {} : { incomplete: true }),
      },
    };
  },
});

export const scoreCallCount: ScoreFn = ({ toolNames }) => {
  const total = toolNames.length;
  return {
    score: total <= TRAJECTORY_MAX_TOOL_CALLS ? 1 : 0,
    explanation: `${total} tool call(s), bound ${TRAJECTORY_MAX_TOOL_CALLS}`,
    metadata: { total, max: TRAJECTORY_MAX_TOOL_CALLS },
  };
};

// Anonymized spans are unnameable, not invented, so they are reported but not penalized.
export const scoreKnownTools =
  (knownToolIds: ReadonlySet<string>): ScoreFn =>
  ({ toolNames }) => {
    const registry: string[] = [];
    const internal: string[] = [];
    const anonymized: string[] = [];
    const unknown: string[] = [];
    for (const name of toolNames) {
      if (knownToolIds.has(name)) registry.push(name);
      else if (isInternalTool(name)) internal.push(name);
      else if (name === ANONYMIZED_TOOL_NAME) anonymized.push(name);
      else unknown.push(name);
    }
    const score = 1 - unknown.length / toolNames.length;
    return {
      score,
      explanation:
        unknown.length === 0
          ? `all ${toolNames.length} call(s) name reachable tools${
              anonymized.length > 0
                ? `; ${anonymized.length} anonymized by tracing privacy settings`
                : ''
            }`
          : `${unknown.length} call(s) name tools the agent cannot reach: ${[
              ...new Set(unknown),
            ].join(', ')}`,
      metadata: { registry, internal, anonymized, unknown },
    };
  };

/**
 * Separate series rather than one average, so a failing dimension cannot hide behind a passing one.
 * `knownToolIds` is the skill's registered tool list read from the stack under test.
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
