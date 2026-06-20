/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { ComponentStatus } from '../../common/constants';
import { SCS_TOOL_IDS } from '../agent/detective_ralph';

export const getScsToolsStatus = async (
  agentBuilder: AgentBuilderPluginStart | undefined,
  request: KibanaRequest
): Promise<ComponentStatus> => {
  if (!agentBuilder) {
    return {
      id: 'scs_tools',
      label: 'SCS Tools',
      state: 'unavailable',
      detail: 'Agent Builder plugin is not available.',
      repairable: false,
    };
  }

  try {
    const toolRegistry = await agentBuilder.tools.getRegistry({ request });
    const presentFlags = await Promise.all(SCS_TOOL_IDS.map((id) => toolRegistry.has(id)));
    const missingCount = presentFlags.filter((present) => !present).length;

    if (missingCount === 0) {
      return {
        id: 'scs_tools',
        label: 'SCS Tools',
        state: 'ok',
        repairable: false,
      };
    }

    const presentCount = SCS_TOOL_IDS.length - missingCount;
    return {
      id: 'scs_tools',
      label: 'SCS Tools',
      state: 'info',
      detail: `${presentCount} of ${SCS_TOOL_IDS.length} SCS tools found. Install Semantic Code Search to give Detective Ralph full access to the codebase — it significantly improves root-cause investigation accuracy.`,
      repairable: false,
    };
  } catch {
    return {
      id: 'scs_tools',
      label: 'SCS Tools',
      state: 'info',
      detail:
        'Could not check SCS tool availability. Install Semantic Code Search to improve investigation accuracy.',
      repairable: false,
    };
  }
};
