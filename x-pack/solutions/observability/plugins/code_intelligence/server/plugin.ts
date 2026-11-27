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
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
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
  ConfigGitCredentialsProvider,
  sandboxGitSourceSessionFactory,
} from './adapters/sandbox_git/sandbox_git';
import { SkippedQueryValidator } from './adapters/workflows/skipped_query_validator';
import { registerAgentBuilder } from './agent_builder/register_agent_builder';
import type { CodeIntelligenceConfig } from './config';
import { ExtractionService } from './extraction_service';
import { registerRoutes, type RouteServices } from './routes';
import type { SourceSessionFactory } from './source_session';

const managedWorkflowOwner = 'codeIntelligence';

const SANDBOX_UNAVAILABLE_MESSAGE =
  'Code Intelligence extraction uses the sandbox source, but the sandbox is not available in this deployment. Set `xpack.sandbox.enabled: true`, `xpack.sandbox.api_key`, and `xpack.sandbox.host`/`xpack.sandbox.port`.';

interface SetupDependencies {
  agentBuilder?: AgentBuilderPluginSetup;
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

    this.sandboxAvailable = plugins.sandbox?.isAvailable === true;
    plugins.workflowsExtensions.registerManagedWorkflowOwner(managedWorkflowOwner);
    this.workflowsManagement = plugins.workflowsManagement.management;
    this.lockManager = new LockManagerService(core, this.logger);
    const getServices = (): RouteServices => {
      if (this.services === undefined) {
        throw new Error('Code Intelligence server has not started.');
      }
      return this.services;
    };
    registerRoutes({
      catalogIndex: this.config.catalogIndex,
      findingsIndex: this.config.findingsIndex,
      settingsIndex: this.config.settingsIndex,
      getServices,
      router: core.http.createRouter(),
    });
    registerAgentBuilder({
      agentBuilder: plugins.agentBuilder,
      catalogIndex: this.config.catalogIndex,
      findingsIndex: this.config.findingsIndex,
      settingsIndex: this.config.settingsIndex,
      getServices,
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
        logger: this.logger.get('extraction'),
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
    if (!this.sandboxAvailable || sandbox === undefined) return undefined;
    return sandboxGitSourceSessionFactory({
      sandbox,
      credentials: new ConfigGitCredentialsProvider(this.config.github.token),
      cursorSecret: randomBytes(32).toString('hex'),
      logger: this.logger.get('sandbox_git'),
    });
  }
}
