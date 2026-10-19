/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentKind, EngineConfig } from '../../../common';
import { createHeuristicAgent } from '../agent/heuristic_agent';
import type { AgentAnswer, AgentCase, AgentUsage, IDiscoveryAgent } from '../agent/types';
import { validateAnswer } from '../agent/validate_answer';
import { getErrorMessage } from '../errors';
import type { IRunRecorder } from './run_recorder';

/** Why the agent cannot take another case in this run. */
export type AgentUnavailableReason = 'run_budget' | 'time_budget';

/** The agent as one run uses it: budgets, the model-day limit, fallback and validation. */
export interface IAgentRunner {
  /** Undefined when the agent may take another case, or why not. */
  unavailable(): AgentUnavailableReason | undefined;
  /**
   * Decides with the heuristic agent alone, at no cost, when the model has no budget left in
   * this run. A decision now beats a model's decision a minute later.
   */
  assessWithoutModel(
    agentCase: AgentCase,
    reason: string
  ): Promise<{
    answer: AgentAnswer;
    agentKind: AgentKind;
    corrections: string[];
  }>;
  assess(agentCase: AgentCase): Promise<{
    answer: AgentAnswer;
    agentKind: AgentKind;
    corrections: string[];
  }>;
  /** Model usage of this run's calls, to price after the run. */
  usage(): AgentUsage[];
}

/** Reserved for the first model call of a run, before any call was timed. */
const INITIAL_CALL_RESERVE_MS = 30_000;
/** A new call starts only with this many times the slowest call so far left in the budget. */
const CALL_RESERVE_FACTOR = 2;

/**
 * Wraps the configured agent. Every answer is validated in code; a failed, invalid or late
 * answer falls back to the heuristic agent, so one bad model call never stops the run. Past the
 * daily model budget the heuristic decides alone, which keeps detection running at no cost.
 */
export function createAgentRunner({
  agent,
  config,
  modelCallsToday,
  recorder,
  deadline,
  agentTimeoutMs,
  signal,
}: {
  agent: IDiscoveryAgent;
  config: EngineConfig;
  /** Model calls already made today in this space, from the cost ledger. */
  modelCallsToday: number;
  recorder: IRunRecorder;
  deadline: number;
  agentTimeoutMs: number;
  signal: AbortSignal;
}): IAgentRunner {
  const fallback = createHeuristicAgent();
  const usages: AgentUsage[] = [];
  const { summary } = recorder;
  let modelCalls = 0;
  let dayLimitLogged = false;
  // What a call takes in practice. Reserving the full timeout before each call would stop the
  // agent a minute and a half before the run ends, and defer everything after.
  let slowestCallMs = INITIAL_CALL_RESERVE_MS;

  const activeAgent = (): IDiscoveryAgent => {
    if (!agent.usesModel || modelCallsToday + modelCalls < config.max_agent_calls_per_day) {
      return agent;
    }
    if (!dayLimitLogged) {
      dayLimitLogged = true;
      recorder.log({
        step: 'agent',
        action: 'day_budget_reached',
        message: `The daily budget of ${config.max_agent_calls_per_day} model calls is used up; the heuristic agent decides until tomorrow (UTC).`,
      });
    }
    return fallback;
  };

  const assessWithFallback = async (agentCase: AgentCase, reason: string) => {
    const { answer: raw } = await fallback.assess(agentCase, { signal });
    const validated = validateAnswer(agentCase, raw);
    if (!validated.ok) {
      throw new Error(
        `The heuristic agent produced an invalid answer (${reason}): ${validated.reason}`
      );
    }
    return {
      answer: validated.answer,
      agentKind: 'heuristic' as const,
      corrections: validated.corrections,
    };
  };

  return {
    unavailable() {
      if (summary.agent.calls >= config.max_agent_calls_per_run) {
        return 'run_budget';
      }
      // A call must be able to finish before the run stops starting new work.
      const heuristicOnly = !activeAgent().usesModel;
      if (
        !heuristicOnly &&
        Date.now() + Math.min(agentTimeoutMs, slowestCallMs * CALL_RESERVE_FACTOR) > deadline
      ) {
        return 'time_budget';
      }
      return undefined;
    },

    async assess(agentCase) {
      summary.agent.calls += 1;
      const current = activeAgent();
      const subject = agentCase.event?.event_id;
      try {
        if (current.usesModel) {
          modelCalls += 1;
        }
        const started = Date.now();
        // A call never outlives the run's budget; a late one falls back to the heuristic.
        const callSignal = AbortSignal.any([
          signal,
          AbortSignal.timeout(Math.max(1, Math.min(agentTimeoutMs, deadline - started))),
        ]);
        const { answer: raw, usage } = await current.assess(agentCase, { signal: callSignal });
        if (current.usesModel) {
          slowestCallMs = Math.max(slowestCallMs, Date.now() - started);
        }
        if (usage) {
          usages.push(usage);
        }
        const validated = validateAnswer(agentCase, raw);
        if (validated.ok) {
          return {
            answer: validated.answer,
            agentKind: current.kind,
            corrections: validated.corrections,
          };
        }
        summary.agent.rejected_answers += 1;
        recorder.log({
          step: 'agent',
          action: 'answer_rejected',
          event_id: subject,
          message: `Rejected the ${current.kind} agent's answer: ${validated.reason}. Fell back to the heuristic agent.`,
        });
        return assessWithFallback(agentCase, 'after a rejected answer');
      } catch (error) {
        if (signal.aborted) {
          throw error;
        }
        summary.agent.failures += 1;
        recorder.log({
          step: 'agent',
          action: 'failed',
          event_id: subject,
          message: `The ${current.kind} agent failed: ${getErrorMessage(
            error
          )}. Fell back to the heuristic agent.`,
        });
        return assessWithFallback(agentCase, 'after a failure');
      }
    },

    assessWithoutModel(agentCase, reason) {
      summary.agent.heuristic_when_busy = (summary.agent.heuristic_when_busy ?? 0) + 1;
      return assessWithFallback(agentCase, reason);
    },

    usage: () => usages,
  };
}
