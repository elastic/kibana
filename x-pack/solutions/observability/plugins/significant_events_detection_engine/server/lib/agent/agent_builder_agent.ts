/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, toArray } from 'rxjs';
import type { KibanaRequest } from '@kbn/core/server';
import {
  AgentExecutionMode,
  createNonInteractiveConfig,
  isMessageCompleteEvent,
  isRoundCompleteEvent,
} from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import {
  NIGHTSHIFT_DISCOVERY_USAGE_ID,
  NIGHTSHIFT_USAGE_PARENT_ID,
  NIGHTSHIFT_USAGE_PRODUCT_FEATURE,
  NIGHTSHIFT_USAGE_PRODUCT_SOLUTION,
} from '@kbn/nightshift-shared';
import { DETECTION_ENGINE_TRIAGE_AGENT_ID } from '../../../common';
import { ANSWER_JSON_SCHEMA, parseAnswer } from './answer_schema';
import type { ICaseRegistry } from './case_registry';
import type { ITriageAgentInstaller } from './triage_agent_type';
import type { AgentAssessment, AgentCase, ITriageAgent } from './types';

/**
 * The triage agent backed by Agent Builder. Each case is one standalone, non-interactive
 * run of the engine's agent profile: no conversation is stored, the model answers in the
 * structured shape, and token usage comes back with the round so the engine can price it.
 * A case with open events gets a case id, which the event search tool needs to reach them.
 */
export function createAgentBuilderAgent({
  agentBuilder,
  installer,
  caseRegistry,
  request,
  spaceId,
  connectorId,
  timeoutMs,
}: {
  agentBuilder: AgentBuilderPluginStart;
  installer: ITriageAgentInstaller;
  caseRegistry: ICaseRegistry;
  request: KibanaRequest;
  spaceId: string;
  /** Agent Builder picks the space's default model when this is absent. */
  connectorId?: string;
  timeoutMs: number;
}): ITriageAgent {
  return {
    kind: 'agent_builder',
    usesModel: true,

    async assess(agentCase: AgentCase, { signal, openEvents }) {
      await installer.ensure(spaceId);
      // The call ends at its own timeout or when the run is aborted, whichever comes first.
      const timeout = AbortSignal.timeout(timeoutMs);
      const abortSignal = AbortSignal.any([signal, timeout]);
      const registered = openEvents ? caseRegistry.register(openEvents) : undefined;
      try {
        return await run({ agentCase, caseId: registered?.caseId, abortSignal, timeout });
      } finally {
        registered?.release();
      }
    },
  };

  async function run({
    agentCase,
    caseId,
    abortSignal,
    timeout,
  }: {
    agentCase: AgentCase;
    caseId?: string;
    abortSignal: AbortSignal;
    timeout: AbortSignal;
  }): Promise<AgentAssessment> {
    const { events$ } = await agentBuilder.execution.executeAgent({
      request,
      mode: AgentExecutionMode.standalone,
      useTaskManager: false,
      abortSignal,
      interactive: createNonInteractiveConfig(),
      params: {
        agentId: DETECTION_ENGINE_TRIAGE_AGENT_ID,
        ...(connectorId ? { connectorId } : {}),
        structuredOutput: true,
        outputSchema: ANSWER_JSON_SCHEMA,
        nextInput: {
          message: `Assess this case:\n${JSON.stringify(
            caseId ? { case_id: caseId, ...agentCase } : agentCase,
            null,
            2
          )}`,
        },
        telemetryMetadata: {
          pluginId: NIGHTSHIFT_DISCOVERY_USAGE_ID,
          aggregateBy: NIGHTSHIFT_USAGE_PARENT_ID,
          productSolution: NIGHTSHIFT_USAGE_PRODUCT_SOLUTION,
          productFeature: NIGHTSHIFT_USAGE_PRODUCT_FEATURE,
        },
      },
    });
    const events = await lastValueFrom(events$.pipe(toArray()));
    if (timeout.aborted) {
      throw new Error(`The agent did not answer within ${Math.round(timeoutMs / 1000)} s`);
    }
    const completed = events.filter(isMessageCompleteEvent).pop();
    const round = events.filter(isRoundCompleteEvent).pop()?.data.round;
    const modelUsage = round?.model_usage;
    return {
      answer: parseAnswer(completed?.data.structured_output ?? round?.response.structured_output),
      usage: modelUsage
        ? {
            prompt: modelUsage.input_tokens,
            cached: modelUsage.cached_input_tokens ?? 0,
            completion: modelUsage.output_tokens,
            model: modelUsage.model,
            connector_id: modelUsage.connector_id,
          }
        : undefined,
    };
  }
}
