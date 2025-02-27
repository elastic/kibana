/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, EMPTY } from 'rxjs';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { ChatEvent } from '../../../common/chat_events';

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
  return {
    run: async (): Promise<AgentRunResult> => {
      return {
        events$: EMPTY,
      };
    },
  };
};
