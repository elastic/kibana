/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart } from '@kbn/core/server';
import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { UxPluginStartDeps } from '../plugin_types';

export type UxRouteHandlerResources = DefaultRouteHandlerResources & {
  core: {
    setup: CoreSetup<UxPluginStartDeps>;
    start: () => Promise<CoreStart>;
  };
  startPlugins: () => Promise<UxPluginStartDeps>;
  workflowsManagement?: WorkflowsServerPluginSetup;
};
