/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, from, filter, shareReplay } from 'rxjs';
import { StreamEvent } from '@langchain/core/tracers/log_stream';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ChatEvent } from '../../../common/chat_events';
import type { ConversationEvent } from '../../../common/conversations';
import { IntegrationsService } from '../integrations/integrations_service';
import { getLCTools } from '../integrations/utils';
import { createAgentGraph } from './agent_graph';
import { langchainToChatEvents, conversationEventsToMessages } from './utils';

interface AgentRunOptions {
  previousEvents: ConversationEvent[];
}

interface AgentRunResult {
  /**
   * Live events that can be streamed back to the UI
   */
  events$: Observable<ChatEvent>;
}

export interface Agent {
  run(options: AgentRunOptions): Promise<AgentRunResult>;
}

export const createAgent = async ({
  agentId,
  chatModel,
  integrationsService,
}: {
  agentId: string;
  chatModel: InferenceChatModel;
  integrationsService: IntegrationsService;
}): Promise<Agent> => {
  const integrationTools = await getLCTools(integrationsService);

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

      return {
        events$,
      };
    },
  };
};

const isStreamEvent = (input: any): input is StreamEvent => {
  return 'event' in input;
};
