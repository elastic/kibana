/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../../common';
import {
  DUE_DILIGENCE_CYCLE_HOOK_ID,
  DUE_DILIGENCE_EVERY_CYCLES,
  DUE_DILIGENCE_TIMEOUT_MS,
} from './constants';
import { formatDueDiligenceNotice } from './format_notice';
import { runDueDiligence, type DueDiligenceDeps } from './run_check';

/**
 * A due-diligence reviewer that runs every few cycles while the investigation works. Unlike the
 * findings recorder, which writes the record without being waited for, the agent waits for this
 * one: when a hypothesis is held at 60% confidence or more, its review is appended to the agent's
 * context as a note, so the agent can act on it before it settles. One of its checks is that the
 * alert's change of state is explained from what moved, not restated from knowledge.
 */
export const registerDueDiligence = ({
  agentBuilder,
  deps,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  deps: DueDiligenceDeps;
}): void => {
  agentBuilder.hooks.registerCycleHook({
    id: DUE_DILIGENCE_CYCLE_HOOK_ID,
    when: { everyCycles: DUE_DILIGENCE_EVERY_CYCLES },
    boundAgents: [NIGHTSHIFT_INVESTIGATION_AGENT_ID],
    timeout: DUE_DILIGENCE_TIMEOUT_MS,
    getHandler: async ({ conversation, request, input, services }) => {
      const conversationId = conversation.id;
      // A read-only run must not change the conversation, and a note is a change to it.
      if (!conversationId || conversation.access === 'readOnly') return undefined;
      const question = typeof input?.message === 'string' ? input.message : undefined;
      // The cycle hook is not told the connector, but the run's own default model is it.
      const connectorId = await services.modelProvider
        .getDefaultModel()
        .then((model) => model.connector.connectorId)
        .catch(() => undefined);

      // The same review twice in a row says nothing new, so it is not shown to the agent twice.
      let lastText: string | undefined;
      return async ({ steps, abortSignal }, api) => {
        const reviewed = await runDueDiligence(deps, {
          request,
          conversationId,
          steps,
          question,
          connectorId,
          signal: abortSignal,
        });
        if (reviewed.length === 0 || abortSignal.aborted) return;
        const { text, data } = formatDueDiligenceNotice(reviewed);
        if (text === lastText) return;
        lastText = text;
        api.append({ text, data });
      };
    },
  });
};
