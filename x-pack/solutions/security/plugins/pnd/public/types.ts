/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { WorkflowsPublicPluginStart } from '@kbn/workflows-management-plugin/public';

export interface PndClientConfig {
  enabled: boolean;
  ui: {
    useMockData: boolean;
  };
}

export type PndSetupDependencies = Record<string, never>;

export interface PndStartDependencies {
  agentBuilder?: AgentBuilderPluginStart;
  spaces?: SpacesPluginStart;
  workflowsManagement?: WorkflowsPublicPluginStart;
}

export type PndPublicSetup = Record<string, never>;
export type PndPublicStart = Record<string, never>;
