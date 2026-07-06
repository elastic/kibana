/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, CoreStart, Logger } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { WorkflowsManagementApi } from '@kbn/discoveries/impl/attack_discovery/generation/invoke_alert_retrieval_workflow';
import type { DiscoveriesPluginStartDeps } from '../../../types';

// Stub: real implementation is added by a later PR in the stack (PR2 →
// scaffold; runtime impl added downstream). PR3 calls
// `getRunStepDefinition({ ..., workflowsManagementApi })` and reads
// `runStepDef.id` to register the step. The placeholder is never invoked
// unless the FF is on.
export const getRunStepDefinition = (_params: {
  analytics?: AnalyticsServiceSetup;
  getEventLogIndex: () => Promise<string>;
  getEventLogger: () => Promise<IEventLogger>;
  getStartServices: () => Promise<{
    coreStart: CoreStart;
    pluginsStart: DiscoveriesPluginStartDeps;
  }>;
  logger: Logger;
  workflowsManagementApi?: WorkflowsManagementApi;
}): { handler: (context: never) => Promise<unknown>; id: string } & Record<string, unknown> => ({
  handler: async () => undefined,
  id: 'security.attack-discovery.run',
});
