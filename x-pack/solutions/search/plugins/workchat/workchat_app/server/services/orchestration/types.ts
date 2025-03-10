/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { ChunkEvent, MessageEvent } from '../../../common/chat_events';
import type { ConversationEvent } from '../../../common/conversations';

/**
 * Represents an instance of a configured agent, ready to run.
 */
export interface Agent {
  run(options: AgentRunOptions): Promise<AgentRunResult>;
}

/**
 * Options to call {@link Agent.run}
 */
export interface AgentRunOptions {
  previousEvents: ConversationEvent[];
}

/**
 * Subsets of chat events the agent can emit
 */
export type AgentRunEvents = ChunkEvent | MessageEvent;

/**
 * Output of {@link Agent.run}
 */
export interface AgentRunResult {
  /**
   * Live events that can be streamed back to the UI
   */
  events$: Observable<AgentRunEvents>;
}
