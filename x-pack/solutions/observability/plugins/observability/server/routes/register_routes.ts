/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { RuleDataPluginService } from '@kbn/rule-registry-plugin/server';
import { registerRoutes as registerServerRoutes } from '@kbn/server-route-repository';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { AlertDetailsContextualInsightsService } from '../services';
import { AbstractObservabilityServerRouteRepository } from './types';

interface RegisterRoutes {
  core: CoreSetup;
  repository: AbstractObservabilityServerRouteRepository;
  logger: Logger;
  dependencies: RegisterRoutesDependencies;
  isDev: boolean;
}

export interface RegisterRoutesDependencies {
  pluginsSetup: {
    core: CoreSetup;
  };
  dataViews: DataViewsServerPluginStart;
  spaces?: SpacesPluginStart;
  ruleDataService: RuleDataPluginService;
  assistant: {
    alertDetailsContextualInsightsService: AlertDetailsContextualInsightsService;
  };
  getRulesClientWithRequest: (request: KibanaRequest) => Promise<RulesClientApi>;
}

export function registerRoutes({ repository, core, logger, dependencies, isDev }: RegisterRoutes) {
  registerServerRoutes({
    core,
    dependencies: { dependencies },
    logger,
    repository,
    runDevModeChecks: isDev,
  });
}
