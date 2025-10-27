/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import type {
  WorkplaceAIConnectorsServerSetup,
  WorkplaceAIConnectorsServerSetupDependencies,
  WorkplaceAIConnectorsServerStart,
  WorkplaceAIConnectorsServerStartDependencies,
} from './types';
import { setupSavedObjects } from './saved_objects';
import { registerConnectorRoutes } from './routes';
import { SecretResolver } from './services/secret_resolver';
import { WorkflowCreator } from './services/workflow_creator';

export class WorkplaceAIConnectorsServerPlugin
  implements
    Plugin<
      WorkplaceAIConnectorsServerSetup,
      WorkplaceAIConnectorsServerStart,
      WorkplaceAIConnectorsServerSetupDependencies,
      WorkplaceAIConnectorsServerStartDependencies
    >
{
  private readonly logger: Logger;
  private workflowCreator?: WorkflowCreator;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    core: CoreSetup,
    plugins: WorkplaceAIConnectorsServerSetupDependencies
  ): WorkplaceAIConnectorsServerSetup {
    // Register saved objects with encrypted saved objects support
    setupSavedObjects(core.savedObjects, plugins.encryptedSavedObjects);

    // Create workflow creator service (includes optional Onechat tool creation in start)
    const workflowCreator = new WorkflowCreator(this.logger, plugins.workflowsManagement);
    this.workflowCreator = workflowCreator;

    // Register HTTP routes with workflow creator
    const router = core.http.createRouter();
    registerConnectorRoutes(router, workflowCreator, this.logger);

    return {};
  }

  start(
    core: CoreStart,
    plugins: WorkplaceAIConnectorsServerStartDependencies
  ): WorkplaceAIConnectorsServerStart {
    const secretResolver = new SecretResolver(this.logger);

    // Now that start deps are available, wire Onechat into the workflow creator if present
    if (plugins?.onechat && this.workflowCreator) {
      this.workflowCreator.setOnechat(plugins.onechat);
    }

    return {
      secretResolver,
    };
  }
}
