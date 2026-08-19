/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { registerRoutes } from '@kbn/server-route-repository';
import type { KibanaRequest } from '@kbn/core/server';
import { NightshiftInvestigationsClient } from './client/investigations_client';
import { nightshiftInvestigationsRouteRepository } from './routes';
import { triggerInvestigationStepDefinition } from './step_definitions/trigger_investigation';
import type {
  NightshiftInvestigationsServerSetup,
  NightshiftInvestigationsServerStart,
  NightshiftInvestigationsSetupDeps,
  NightshiftInvestigationsStartDeps,
} from './types';

export class NightshiftInvestigationsPlugin
  implements
    Plugin<
      NightshiftInvestigationsServerSetup,
      NightshiftInvestigationsServerStart,
      NightshiftInvestigationsSetupDeps,
      NightshiftInvestigationsStartDeps
    >
{
  private readonly logger: Logger;
  private workflowsManagement?: NightshiftInvestigationsSetupDeps['workflowsManagement'];
  private spaces?: NightshiftInvestigationsStartDeps['spaces'];

  constructor(ctx: PluginInitializerContext) {
    this.logger = ctx.logger.get();
  }

  setup(
    core: CoreSetup<NightshiftInvestigationsStartDeps, NightshiftInvestigationsServerStart>,
    plugins: NightshiftInvestigationsSetupDeps
  ): NightshiftInvestigationsServerSetup {
    this.workflowsManagement = plugins.workflowsManagement;

    const getInvestigationsClient = (request: KibanaRequest, spaceId?: string) =>
      new NightshiftInvestigationsClient(
        request,
        this.workflowsManagement,
        this.spaces,
        this.logger,
        spaceId
      );

    if (plugins.workflowsManagement) {
      if (plugins.workflowsExtensions) {
        plugins.workflowsExtensions.registerStepDefinition(
          triggerInvestigationStepDefinition(getInvestigationsClient)
        );
      }

      registerRoutes({
        repository: nightshiftInvestigationsRouteRepository,
        dependencies: { getInvestigationsClient },
        core,
        logger: this.logger,
        runDevModeChecks: false,
      });
    } else {
      this.logger.warn(
        'workflowsManagement is not available — nightshift investigations routes will not be registered'
      );
    }
  }

  start(
    _core: CoreStart,
    plugins: NightshiftInvestigationsStartDeps
  ): NightshiftInvestigationsServerStart {
    this.spaces = plugins.spaces;

    return {
      getInvestigationsClient: (request) =>
        new NightshiftInvestigationsClient(
          request,
          this.workflowsManagement,
          this.spaces,
          this.logger
        ),
    };
  }
}
