/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, from, filter, map } from 'rxjs';
import { StreamEvent } from '@langchain/core/tracers/log_stream';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { ChatEvent } from '../../../common/chat_events';
import { createAgentGraph } from './agent_graph';

interface AgentRunResult {
  events$: Observable<ChatEvent>;
}

export interface Agent {
  run(): Promise<AgentRunResult>;
}

export const createAgent = async ({
  agentId,
  chatModel,
}: {
  agentId: string;
  chatModel: InferenceChatModel;
}): Promise<Agent> => {
  // TODO: everything

  const agentGraph = await createAgentGraph({ agentId, chatModel });

  return {
    run: async (): Promise<AgentRunResult> => {
      const eventStream = agentGraph.streamEvents(
        { input: 'Write 5 paragraphs on the meaning of life' },
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
        map((event) => {
          return {
            type: event.event,
            ...event,
          };
        })
      );

      return {
        events$: events$ as any, // TODO: convert
      };
    },
  };
};
