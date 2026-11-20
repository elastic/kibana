/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContextEnginePluginSetup } from '@kbn/context-engine-plugin/server';
import { getAiIndexDest } from '@kbn/context-engine-plugin/common/ai_index_dest';
import { ALERTZERO_AI_INDICES, type AlertZeroAiIndex } from './ai_index_registry';

/** Registers each AI index as managed, so Context Engine resolves it in every space. */
export const registerAiIndices = ({
  contextEngine,
  aiIndices = ALERTZERO_AI_INDICES,
}: {
  contextEngine: Pick<ContextEnginePluginSetup, 'registerAiIndex'>;
  aiIndices?: readonly AlertZeroAiIndex[];
}): void => {
  for (const { id, description } of aiIndices) {
    contextEngine.registerAiIndex(id, {
      description,
      memory_enabled: false,
      dest: getAiIndexDest('index', id),
      automations: [],
      sources: [],
      traces: [],
    });
  }
};
