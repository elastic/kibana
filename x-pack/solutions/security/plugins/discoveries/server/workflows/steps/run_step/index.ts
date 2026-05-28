/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, CoreStart, Logger } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { DiscoveriesPluginStartDeps } from '../../../types';

// Stub: real implementation is added by a later PR in the stack. PR2's plugin
// scaffold needs this step to exist so register_workflow_steps can import it;
// the placeholder step definition is never invoked unless the FF is on.
export const getRunStepDefinition = (_params: {
  analytics?: AnalyticsServiceSetup;
  getEventLogIndex: () => Promise<string>;
  getEventLogger: () => Promise<IEventLogger>;
  getStartServices: () => Promise<{
    coreStart: CoreStart;
    pluginsStart: DiscoveriesPluginStartDeps;
  }>;
  logger: Logger;
}) =>
  ({
    id: 'security.attack-discovery.run',
  } as unknown as Parameters<
    import('@kbn/workflows-extensions/server').WorkflowsExtensionsServerPluginSetup['registerStepDefinition']
  >[0]);
