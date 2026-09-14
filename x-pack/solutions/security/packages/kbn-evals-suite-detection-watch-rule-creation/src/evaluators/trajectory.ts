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
import {
  SKILL_REGISTRY_TOOL_IDS,
  TRAJECTORY_MAX_TOOL_CALLS,
  TRAJECTORY_PRECEDENCE,
} from '../constants';
import type { RuleCreationResult } from '../rule_creation_client';
import {
  TOOL_KIND,
  diagnoseUnreachableToolSpans,
  extractConversationId,
  toolSpanJoinClauses,
  type EsqlResponse,
} from './trace_spans';

/** Tool name the span processor substitutes for non-builtin tools when real names are disabled. */
const ANONYMIZED_TOOL_NAME = 'custom';

const TOOL_NAME_COLUMN = 'attributes.gen_ai.tool.name';

export interface TrajectoryFetchOptions {
  /** Pause between polls while waiting for the batch span exporter to flush. */
  settleMs?: number;
  /** Total polls before giving up on a stable span set. */
  maxPolls?: number;
  sleep?: (ms: number) => Promise<void>;
}

type Trajectory =
  | {
      available: true;
      toolNames: string[];
      joinedOn: string;
      /** Two consecutive polls returned the same span count. */
      settled: boolean;
    }
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
  // Zero rows means this join key reached no TOOL spans — unmeasured, not empty.
  return names.length > 0 ? names : undefined;
};

/**
 * Resolves a run's ordered tool calls from the tracing cluster.
 *
 * Agent Builder exports spans through a BatchSpanProcessor (`scheduledDelay`, 5s by default), so
 * the trajectory can still be arriving when the workflow returns. Polling until two consecutive
 * reads agree keeps a half-exported run from being scored as a confident short trajectory; a run
 * that never settles is reported as `settled: false` so evaluators can label it, not hide it.
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
    const diagnosis = await diagnoseUnreachableToolSpans(traceEsClient);
    log.warning(`Trajectory unavailable — ${diagnosis}`);
    return {
      available: false,
      explanation: `No TOOL spans reachable via the workflow trace id or the draft conversation_id. ${diagnosis}`,
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

/** 1 up to TRAJECTORY_MAX_TOOL_CALLS, then linear decay to 0 at twice the bound. */
export const scoreCallCount: ScoreFn = ({ toolNames }) => {
  const total = toolNames.length;
  const over = Math.max(0, total - TRAJECTORY_MAX_TOOL_CALLS);
  const score = Math.max(0, 1 - over / TRAJECTORY_MAX_TOOL_CALLS);
  return {
    score,
    explanation: `${total} tool call(s), bound ${TRAJECTORY_MAX_TOOL_CALLS}`,
    metadata: { total, max: TRAJECTORY_MAX_TOOL_CALLS },
  };
};

/**
 * Fraction of applicable precedence constraints satisfied, judged on first occurrences. A
 * constraint is applicable only when both tools were called; a run that calls neither side of
 * any constraint scores 1 with `checked: 0` so the vacuous case stays visible in metadata.
 */
export const scoreCallOrder: ScoreFn = ({ toolNames }) => {
  const violations: Array<readonly [string, string]> = [];
  let checked = 0;
  for (const [earlier, later] of TRAJECTORY_PRECEDENCE) {
    const earlierAt = toolNames.indexOf(earlier);
    const laterAt = toolNames.indexOf(later);
    if (earlierAt !== -1 && laterAt !== -1) {
      checked++;
      if (laterAt < earlierAt) violations.push([earlier, later]);
    }
  }
  const score = checked === 0 ? 1 : (checked - violations.length) / checked;
  return {
    score,
    explanation:
      checked === 0
        ? 'no precedence constraint applicable to this run'
        : `${checked - violations.length}/${checked} precedence constraint(s) satisfied`,
    metadata: { checked, violations },
  };
};

/**
 * Fraction of calls naming a tool the agent can actually reach: the skill's registry tools or
 * Agent Builder's internal tools. Spans anonymized to "custom" by the tracing privacy settings
 * are reported separately and not counted as hallucinated — they are unnameable, not invented.
 */
export const scoreKnownTools: ScoreFn = ({ toolNames }) => {
  const registry: string[] = [];
  const internal: string[] = [];
  const anonymized: string[] = [];
  const unknown: string[] = [];
  for (const name of toolNames) {
    if (SKILL_REGISTRY_TOOL_IDS.has(name)) registry.push(name);
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
 * Trajectory evaluators (trace-based, direction: maximize). Tool Routing asks whether the
 * required tool was called; these ask whether the path to it was sensible. Reported as three
 * series rather than one average so a single failing dimension cannot hide behind two passing
 * ones on the dashboard.
 */
export const createTrajectoryEvaluators = (
  deps: { traceEsClient: EsClient; log: ToolingLog } & TrajectoryFetchOptions
): Evaluator[] => {
  const fetchTrajectory = createTrajectoryFetcher(deps);
  return [
    trajectoryEvaluator('Trajectory: Call Count', fetchTrajectory, scoreCallCount),
    trajectoryEvaluator('Trajectory: Call Order', fetchTrajectory, scoreCallOrder),
    trajectoryEvaluator('Trajectory: Known Tools', fetchTrajectory, scoreKnownTools),
  ];
};
