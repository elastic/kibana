/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, filter, shareReplay } from 'rxjs';
import { StreamEvent } from '@langchain/core/tracers/log_stream';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { IntegrationsSession } from '../integrations/integrations_session';
import { getLCTools } from '../integrations/utils';
import { createAgentGraph } from './agent_graph';
import { langchainToChatEvents, conversationEventsToMessages } from './utils';
import type { Agent, AgentRunResult } from './types';

export const createAgent = async ({
  agentId,
  chatModel,
  integrationsSession,
}: {
  agentId: string;
  chatModel: InferenceChatModel;
  integrationsSession: IntegrationsSession;
}): Promise<Agent> => {
  const integrationTools = await getLCTools(integrationsSession);

  const agentGraph = await createAgentGraph({ agentId, chatModel, integrationTools });

  return {
    run: async ({ previousEvents }): Promise<AgentRunResult> => {
      const initialMessages = conversationEventsToMessages(previousEvents);

      const runName = 'defaultAgentGraph';

      const eventStream = agentGraph.streamEvents(
        { initialMessages },
        {
          version: 'v2',
          runName,
          metadata: {
            agentId,
          },
          recursionLimit: 5,
        }
      );

      const events$ = from(eventStream).pipe(
        filter(isStreamEvent),
        langchainToChatEvents({ runName }),
        shareReplay()
      );

      events$.subscribe({
        complete: () => {
          integrationsSession.disconnect();
        },
        error: () => {
          integrationsSession.disconnect();
        },
      });

      return {
        events$,
      };
    },
  };
};

const isStreamEvent = (input: any): input is StreamEvent => {
  return 'event' in input;
};
