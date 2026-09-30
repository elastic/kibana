/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes } from 'node:crypto';

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { LockManagerService } from '@kbn/lock-manager';
import type { SandboxPluginSetup, SandboxPluginStart } from '@kbn/sandbox-plugin/server';
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
import {
  ConfigGitCredentialsProvider,
  sandboxGitSourceSessionFactory,
} from './adapters/sandbox_git/sandbox_git';
import { SkippedQueryValidator } from './adapters/workflows/skipped_query_validator';
import type { CodeIntelligenceConfig } from './config';
import { ExtractionService } from './extraction_service';
import { registerRoutes, type RouteServices } from './routes';
import type { SourceSessionFactory } from './source_session';

const managedWorkflowOwner = 'codeIntelligence';

const SANDBOX_UNAVAILABLE_MESSAGE =
  'Code Intelligence extraction uses the sandbox source, but the sandbox is not available in this deployment. Set `xpack.sandbox.enabled: true`, `xpack.sandbox.api_key`, and `xpack.sandbox.host`/`xpack.sandbox.port`, or set `xpack.code_intelligence.source: local_git`.';

interface SetupDependencies {
  sandbox?: SandboxPluginSetup;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement: WorkflowsServerPluginSetup;
}

interface StartDependencies {
  sandbox?: SandboxPluginStart;
  spaces?: SpacesPluginStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  workflowsManagement: WorkflowsServerPluginStart;
}

export class CodeIntelligencePlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  private readonly config: CodeIntelligenceConfig;
  private readonly logger: Logger;
  private lockManager: LockManagerService | undefined;
  private sandboxAvailable = false;
  private services: RouteServices | undefined;
  private workflowsManagement: WorkflowsServerPluginSetup['management'] | undefined;

  constructor(context: PluginInitializerContext<CodeIntelligenceConfig>) {
    this.config = context.config.get();
    this.logger = context.logger.get();
  }

  public setup(core: CoreSetup<StartDependencies>, plugins: SetupDependencies): void {
    if (!this.config.enabled) return;
    if (this.config.workflowConnectorId === undefined) {
      this.logger.warn(
        'Code Intelligence is enabled but `xpack.code_intelligence.workflowConnectorId` is missing.'
      );
      return;
    }
    if (this.config.source === 'local_git' && this.config.repositories.length === 0) {
      this.logger.warn(
        'Code Intelligence uses the local_git source but `xpack.code_intelligence.repositories` is empty.'
      );
      return;
    }

    this.sandboxAvailable = plugins.sandbox?.isAvailable === true;
    plugins.workflowsExtensions.registerManagedWorkflowOwner(managedWorkflowOwner);
    this.workflowsManagement = plugins.workflowsManagement.management;
    this.lockManager = new LockManagerService(core, this.logger);
    registerRoutes({
      catalogIndex: this.config.catalogIndex,
      settingsIndex: this.config.settingsIndex,
      getServices: () => {
        if (this.services === undefined) {
          throw new Error('Code Intelligence server has not started.');
        }
        return this.services;
      },
      router: core.http.createRouter(),
    });
  }

  public async start(_core: CoreStart, plugins: StartDependencies): Promise<void> {
    if (
      !this.config.enabled ||
      this.workflowsManagement === undefined ||
      this.lockManager === undefined ||
      this.config.workflowConnectorId === undefined
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

    const getSpaceId: RouteServices['getSpaceId'] = (request) =>
      plugins.spaces?.spacesService.getSpaceId(request) ?? 'default';
    const createSourceSession = this.sourceSessionFactory(plugins.sandbox);
    if (createSourceSession === undefined) {
      this.logger.error(SANDBOX_UNAVAILABLE_MESSAGE);
      this.services = { extractionUnavailableReason: SANDBOX_UNAVAILABLE_MESSAGE, getSpaceId };
      return;
    }
    this.services = {
      extractionService: new ExtractionService({
        lockManager: this.lockManager,
        managedWorkflows: managedClient,
        management: this.workflowsManagement,
        createSourceSession,
        validator: new SkippedQueryValidator(),
      }),
      getSpaceId,
    };
  }

  public stop(): void {}

  private sourceSessionFactory(sandbox?: SandboxPluginStart): SourceSessionFactory | undefined {
    const cursorSecret = randomBytes(32).toString('hex');
    if (this.config.source === 'local_git') {
      const options = { repositories: this.config.repositories, cursorSecret };
      const session = {
        reader: new LocalBareGitSourceReader(options),
        repositoryResolver: new LocalBareGitRepositoryResolver(options),
        finishRepository: async () => {},
        close: async () => {},
      };
      return () => session;
    }
    if (!this.sandboxAvailable || sandbox === undefined) return undefined;
    return sandboxGitSourceSessionFactory({
      sandbox,
      credentials: new ConfigGitCredentialsProvider(this.config.github.token),
      cursorSecret,
      logger: this.logger.get('sandbox_git'),
    });
  }
}
