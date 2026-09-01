/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

export interface DiscoveriesPublicPluginSetupDeps {
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup;
}

export interface DiscoveriesPublicPluginStartDeps {
  agentBuilder?: AgentBuilderPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DiscoveriesPublicPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DiscoveriesPublicPluginStart {}
