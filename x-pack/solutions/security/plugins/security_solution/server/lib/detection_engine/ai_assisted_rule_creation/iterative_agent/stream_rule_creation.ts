/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { RuleCreationState } from './state';

import type { getIterativeRuleCreationAgent } from './iterative_agent_graph';

/**
 * Stream the rule creation process with intermediate updates
 */
export async function* streamRuleCreation(
  graph: Awaited<ReturnType<typeof getIterativeRuleCreationAgent>>,
  initialState: { userQuery: string; errors: string[] },
  options?: {
    recursionLimit?: number;
    signal?: AbortSignal;
  }
): AsyncGenerator<RuleCreationStreamEvent, RuleCreationState | null, unknown> {
  const { recursionLimit = 25, signal } = options || {};

  try {
    const stream = graph.stream(initialState, {
      streamMode: 'updates',
      recursionLimit,
      signal,
    });

    yield {
      type: 'node_update',
      nodeState: {} as RuleCreationState,
      nodeName: 'start',
      timestamp: new Date().toISOString(),
    };

    for await (const chunk of await stream) {
      const nodeState = Object.values(chunk)[0] as RuleCreationState;

      // cleanup knowledge base documents to only include id and name to avoid large payloads
      const knowledgeBaseDocuments = (nodeState.knowledgeBase?.documents || []).map((doc) => ({
        id: doc.id,
        name: doc.name,
        text: '',
      }));
      nodeState.knowledgeBase = { documents: knowledgeBaseDocuments, insights: '' };

      yield {
        type: 'node_update',
        nodeState: omit(nodeState, ['indices.indexPatternAnalysis']) as RuleCreationState,
        nodeName: Object.keys(chunk)[0],
        timestamp: new Date().toISOString(),
      };
    }

    return null;
  } catch (error) {
    yield {
      type: 'error',
      nodeName: `error ${(error as Error).message}`,
      timestamp: new Date().toISOString(),
      nodeState: {} as RuleCreationState,
    };
    throw error;
  }
}

/**
 * Stream events emitted during rule creation
 */
export interface RuleCreationStreamEvent {
  type: 'state_update' | 'node_update' | 'debug' | 'completed' | 'error';
  nodeState: RuleCreationState;
  nodeName: string;
  timestamp: string;
}
