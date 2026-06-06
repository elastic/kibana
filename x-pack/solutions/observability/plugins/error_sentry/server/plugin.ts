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
import type { FakeRawRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type {
  WorkflowsManagementApi,
  WorkflowsServerPluginSetup as WorkflowsManagementSetup,
} from '@kbn/workflows-management-plugin/server';
import type { ErrorSentryConfig } from './config';
import { registerStepDefinitions } from './step_types';
import {
  ERROR_SENTRY_CAPTURE_WORKFLOW_ID,
  errorSentryCaptureWorkflowYaml,
} from './workflows/capture_errors_workflow';

const DEFAULT_SPACE_ID = 'default';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ErrorSentryServerSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ErrorSentryServerStart {}

export interface ErrorSentryServerSetupDeps {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement: WorkflowsManagementSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ErrorSentryServerStartDeps {}

export class ErrorSentryServerPlugin
  implements
    Plugin<
      ErrorSentryServerSetup,
      ErrorSentryServerStart,
      ErrorSentryServerSetupDeps,
      ErrorSentryServerStartDeps
    >
{
  private readonly logger: Logger;
  private readonly initializerContext: PluginInitializerContext;
  private workflowsManagementApi?: WorkflowsManagementApi;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
    this.logger = initializerContext.logger.get();
  }

  public setup(_core: CoreSetup, plugins: ErrorSentryServerSetupDeps): ErrorSentryServerSetup {
    registerStepDefinitions(plugins.workflowsExtensions, {
      getGithubConfig: () => this.initializerContext.config.get<ErrorSentryConfig>().github,
    });

    this.workflowsManagementApi = plugins.workflowsManagement.management;

    return {};
  }

  public start(_core: CoreStart, _plugins: ErrorSentryServerStartDeps): ErrorSentryServerStart {
    void this.ensureCaptureWorkflow();
    return {};
  }

  public stop() {}

  /**
   * Idempotently create the capture-errors workflow as a normal (unmanaged) workflow so it is
   * browsable in the Workflows app. Best-effort: failures are logged but never block startup.
   */
  private async ensureCaptureWorkflow(): Promise<void> {
    const api = this.workflowsManagementApi;
    if (!api) {
      return;
    }

    const request = kibanaRequestFactory({ headers: {}, path: '/' } as FakeRawRequest);

    try {
      const existing = await api.getWorkflow(ERROR_SENTRY_CAPTURE_WORKFLOW_ID, DEFAULT_SPACE_ID);
      if (existing) {
        this.logger.debug('Error Sentry: capture-errors workflow already present');
        return;
      }

      await api.createWorkflow(
        { id: ERROR_SENTRY_CAPTURE_WORKFLOW_ID, yaml: errorSentryCaptureWorkflowYaml },
        DEFAULT_SPACE_ID,
        request
      );
      this.logger.info('Error Sentry: capture-errors workflow created');
    } catch (error) {
      this.logger.warn('Error Sentry: failed to ensure capture-errors workflow', { error });
    }
  }
}
