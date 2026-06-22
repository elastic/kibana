/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  Logger,
} from '@kbn/core/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type {
  WorkflowsServerPluginSetup,
  WorkflowsManagementApi,
} from '@kbn/workflows-management-plugin/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { CasesServerStart } from '@kbn/cases-plugin/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { registerStepDefinitions } from './step_types';
import { registerGetStatusRoute } from './routes/get_status';
import { registerGetCasesStatsRoute } from './routes/get_cases_stats';
import { registerGetCaptureTimingRoute } from './routes/get_capture_timing';
import { registerGetActiveExecutionsRoute } from './routes/get_active_executions';
import { registerGetCaptureConfigRoute } from './routes/get_capture_config';
import { registerInstallRoutes } from './routes/install';
import { registerRunCaptureRoute } from './routes/run_capture';

export interface ErrorSentryServerPluginSetupDeps {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement: WorkflowsServerPluginSetup;
  cases: unknown;
  actions?: unknown;
}

export interface ErrorSentryServerPluginStartDeps {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  cases: CasesServerStart;
  agentBuilder?: AgentBuilderPluginStart;
  actions?: ActionsPluginStart;
}

export class ErrorSentryServerPlugin
  implements Plugin<void, void, ErrorSentryServerPluginSetupDeps, ErrorSentryServerPluginStartDeps>
{
  private readonly logger: Logger;
  private managedClient?: PluginScopedManagedWorkflowsApi;
  private workflowsManagementApi?: WorkflowsManagementApi;
  private workflowsExtensionsStart?: WorkflowsExtensionsServerPluginStart;
  private casesStart?: CasesServerStart;
  private agentBuilderStart?: AgentBuilderPluginStart;
  private actionsStart?: ActionsPluginStart;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(core: CoreSetup, plugins: ErrorSentryServerPluginSetupDeps): void {
    this.workflowsManagementApi = plugins.workflowsManagement.management;
    registerStepDefinitions(plugins.workflowsExtensions);
    plugins.workflowsExtensions.registerManagedWorkflowOwner('errorSentry');

    const router = core.http.createRouter();
    registerGetStatusRoute(router, () => {
      if (!this.managedClient || !this.workflowsExtensionsStart) {
        throw new Error('ErrorSentry plugin services not yet available');
      }
      return {
        managedClient: this.managedClient,
        workflowsExtensionsStart: this.workflowsExtensionsStart,
        agentBuilder: this.agentBuilderStart,
        actions: this.actionsStart,
      };
    });
    registerGetCasesStatsRoute(router, () => {
      if (!this.casesStart) {
        throw new Error('ErrorSentry cases service not yet available');
      }
      return this.casesStart;
    });
    registerInstallRoutes(router, () => {
      if (!this.managedClient) {
        throw new Error('ErrorSentry managed client not yet available');
      }
      return { managedClient: this.managedClient, agentBuilder: this.agentBuilderStart };
    });
    registerRunCaptureRoute(router, () => {
      if (!this.managedClient) {
        throw new Error('ErrorSentry managed client not yet available');
      }
      return { managedClient: this.managedClient };
    });
    registerGetCaptureTimingRoute(router, () => {
      if (!this.workflowsManagementApi) {
        throw new Error('ErrorSentry workflows management API not yet available');
      }
      return this.workflowsManagementApi;
    });
    registerGetActiveExecutionsRoute(router, () => {
      if (!this.workflowsManagementApi) {
        throw new Error('ErrorSentry workflows management API not yet available');
      }
      return this.workflowsManagementApi;
    });
    registerGetCaptureConfigRoute(router);
  }

  async start(_core: CoreStart, plugins: ErrorSentryServerPluginStartDeps): Promise<void> {
    this.workflowsExtensionsStart = plugins.workflowsExtensions;
    this.casesStart = plugins.cases;
    this.agentBuilderStart = plugins.agentBuilder;
    this.actionsStart = plugins.actions;

    try {
      this.managedClient = await plugins.workflowsExtensions.initManagedWorkflowsClient(
        'errorSentry'
      );
      await this.managedClient.ready();
    } catch (err) {
      this.logger.error(`Failed to initialize Error Sentry managed workflows client: ${err}`);
    }
  }

  stop(): void {}
}
