/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, from, filter, shareReplay } from 'rxjs';
import { StreamEvent } from '@langchain/core/tracers/log_stream';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { ChatEvent } from '../../../common/chat_events';
import { createAgentGraph } from './agent_graph';
import { langchainToChatEvents } from './utils';

interface AgentRunOptions {
  message: string;
}

interface AgentRunResult {
  events$: Observable<ChatEvent>;
}

export interface Agent {
  run(options: AgentRunOptions): Promise<AgentRunResult>;
}

export const createAgent = async ({
  agentId,
  chatModel,
}: {
  agentId: string;
  chatModel: InferenceChatModel;
}): Promise<Agent> => {
  const agentGraph = await createAgentGraph({ agentId, chatModel });

  return {
    run: async ({ message }): Promise<AgentRunResult> => {
      const eventStream = agentGraph.streamEvents(
        { input: message },
        {
          version: 'v2',
          runName: 'defaultAgentGraph',
          metadata: {
            agentId,
          },
        }
      );

      const isStreamEvent = (input: any): input is StreamEvent => {
        return 'event' in input;
      };

      const events$ = from(eventStream).pipe(
        filter(isStreamEvent),
        langchainToChatEvents(),
        shareReplay()
      );

      return {
        events$,
      };
    },
  };
};
