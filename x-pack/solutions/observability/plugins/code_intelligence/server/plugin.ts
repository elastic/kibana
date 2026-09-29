/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes } from 'node:crypto';

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { LockManagerService } from '@kbn/lock-manager';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  CODE_INTELLIGENCE_LOGGING_CLASSIFICATION_WORKFLOW_ID,
  CODE_INTELLIGENCE_OTEL_CLASSIFICATION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type {
  WorkflowsServerPluginSetup,
  WorkflowsServerPluginStart,
} from '@kbn/workflows-management-plugin/server';

import {
  LocalBareGitRepositoryResolver,
  LocalBareGitSourceReader,
} from './adapters/local_git/local_bare_git';
import { SkippedQueryValidator } from './adapters/workflows/skipped_query_validator';
import type { CodeIntelligenceConfig } from './config';
import { ExtractionService } from './extraction_service';
import { registerRoutes } from './routes';

const managedWorkflowOwner = 'codeIntelligence';

interface SetupDependencies {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement: WorkflowsServerPluginSetup;
}

interface StartDependencies {
  spaces?: SpacesPluginStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  workflowsManagement: WorkflowsServerPluginStart;
}

interface StartedServices {
  readonly extractionService: ExtractionService;
  readonly getSpaceId: (
    request: Parameters<SpacesPluginStart['spacesService']['getSpaceId']>[0]
  ) => string;
}

export class CodeIntelligencePlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  private readonly config: CodeIntelligenceConfig;
  private lockManager: LockManagerService | undefined;
  private services: StartedServices | undefined;
  private workflowsManagement: WorkflowsServerPluginSetup['management'] | undefined;

  public constructor(private readonly context: PluginInitializerContext<CodeIntelligenceConfig>) {
    this.config = context.config.get();
  }

  public setup(core: CoreSetup<StartDependencies>, plugins: SetupDependencies): void {
    if (!this.config.enabled) return;
    if (this.config.workflowConnectorId === undefined || this.config.repositories.length === 0) {
      this.context.logger
        .get()
        .warn('Code Intelligence is enabled but connector or repository configuration is missing.');
      return;
    }

    plugins.workflowsExtensions.registerManagedWorkflowOwner(managedWorkflowOwner);
    this.workflowsManagement = plugins.workflowsManagement.management;
    this.lockManager = new LockManagerService(core, this.context.logger.get());
    registerRoutes({
      catalogIndex: this.config.catalogIndex,
      getServices: () => {
        if (this.services === undefined) {
          throw new Error('Code Intelligence server has not started.');
        }
        return this.services;
      },
      repositories: new Set(this.config.repositories.map(({ repository }) => repository)),
      router: core.http.createRouter(),
    });
  }

  public async start(core: CoreStart, plugins: StartDependencies): Promise<void> {
    if (
      !this.config.enabled ||
      this.workflowsManagement === undefined ||
      this.lockManager === undefined ||
      this.config.workflowConnectorId === undefined ||
      this.config.repositories.length === 0
    ) {
      return;
    }

    const managedClient = await plugins.workflowsExtensions.initManagedWorkflowsClient(
      managedWorkflowOwner
    );
    const values = { connectorId: this.config.workflowConnectorId };
    await managedClient.install(CODE_INTELLIGENCE_LOGGING_CLASSIFICATION_WORKFLOW_ID, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
      values,
    });
    await managedClient.install(CODE_INTELLIGENCE_OTEL_CLASSIFICATION_WORKFLOW_ID, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
      values,
    });
    await managedClient.ready();

    const options = {
      repositories: this.config.repositories,
      cursorSecret: randomBytes(32).toString('hex'),
    };
    this.services = {
      extractionService: new ExtractionService({
        lockManager: this.lockManager,
        managedWorkflows: managedClient,
        management: this.workflowsManagement,
        reader: new LocalBareGitSourceReader(options),
        repositoryResolver: new LocalBareGitRepositoryResolver(options),
        validator: new SkippedQueryValidator(),
      }),
      getSpaceId: (request) => plugins.spaces?.spacesService.getSpaceId(request) ?? 'default',
    };
  }

  public stop(): void {}
}
