/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReplaySubject, firstValueFrom } from 'rxjs';
import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { FeatureFlagsManagementConfig } from './config';
import { registerFeature } from './feature';
import { registerRoutes } from './routes';
import { AuditService } from './services/audit_service';
import { APPS_CATALOG, CatalogService, ENVIRONMENTS_CATALOG } from './services/catalog_service';
import { CredentialsService } from './services/credentials_service';
import { FlagsService } from './services/flags_service';
import { ObservedContextsService } from './services/observed_contexts_service';
import { DefinitionsRepository } from './storage/definitions_repository';
import { IndexManager } from './storage/indices';
import {
  registerRetentionTask,
  scheduleRetentionTask,
} from './tasks/observed_contexts_retention_task';
import type {
  FeatureFlagsManagementSetupDeps,
  FeatureFlagsManagementStartDeps,
  FeatureFlagsServices,
} from './types';

export class FeatureFlagsManagementPlugin
  implements Plugin<void, void, FeatureFlagsManagementSetupDeps, FeatureFlagsManagementStartDeps>
{
  private readonly logger: Logger;
  private readonly config: FeatureFlagsManagementConfig;
  private readonly audit: AuditService;
  private readonly services$ = new ReplaySubject<FeatureFlagsServices>(1);

  constructor(initializerContext: PluginInitializerContext<FeatureFlagsManagementConfig>) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get();
    this.audit = new AuditService(this.logger, initializerContext.env.packageInfo.version);
  }

  public setup(
    core: CoreSetup<FeatureFlagsManagementStartDeps>,
    { features, taskManager }: FeatureFlagsManagementSetupDeps
  ) {
    registerFeature(features);
    registerRoutes(core.http.createRouter(), () => firstValueFrom(this.services$));
    registerRetentionTask(taskManager, {
      logger: this.logger.get('retention'),
      retention: this.config.observedContexts.retention,
      getEsClient: async () => {
        const [coreStart] = await core.getStartServices();
        return coreStart.elasticsearch.client.asInternalUser;
      },
    });
  }

  public start(core: CoreStart, { taskManager }: FeatureFlagsManagementStartDeps) {
    const esClient = core.elasticsearch.client.asInternalUser;
    const indexManager = new IndexManager(esClient, this.logger);
    const ensureReady = () => indexManager.ensureReady();

    // Create the indices eagerly, so Fleet Server finds them; requests retry if this fails.
    ensureReady().catch(() => undefined);
    void this.audit.start({
      esClient,
      security: core.security,
      userProfile: core.userProfile,
      userActivity: core.userActivity,
    });
    void scheduleRetentionTask(taskManager, this.logger);

    const repository = new DefinitionsRepository({ esClient, ensureReady });
    const credentials = new CredentialsService({ repository, audit: this.audit });
    this.services$.next({
      environments: new CatalogService(ENVIRONMENTS_CATALOG, {
        repository,
        audit: this.audit,
        credentials,
      }),
      apps: new CatalogService(APPS_CATALOG, { repository, audit: this.audit, credentials }),
      credentials,
      flags: new FlagsService({ repository, audit: this.audit }),
      observedContexts: new ObservedContextsService({ esClient, ensureReady }),
    });
  }

  public stop() {}
}
