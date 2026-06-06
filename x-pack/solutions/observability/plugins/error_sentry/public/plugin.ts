/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { ERROR_SENTRY_APP_ID, ERROR_SENTRY_APP_TITLE } from '../common/constants';
import { registerStepDefinitions } from './step_types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ErrorSentryPublicSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ErrorSentryPublicStart {}

export interface ErrorSentryPublicSetupDeps {
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup;
}

export interface ErrorSentryPublicStartDeps {
  agentBuilder?: AgentBuilderPluginStart;
}

export class ErrorSentryPublicPlugin
  implements
    Plugin<
      ErrorSentryPublicSetup,
      ErrorSentryPublicStart,
      ErrorSentryPublicSetupDeps,
      ErrorSentryPublicStartDeps
    >
{
  public setup(
    core: CoreSetup<ErrorSentryPublicStartDeps, ErrorSentryPublicStart>,
    plugins: ErrorSentryPublicSetupDeps
  ): ErrorSentryPublicSetup {
    registerStepDefinitions(plugins.workflowsExtensions);

    core.application.register({
      id: ERROR_SENTRY_APP_ID,
      title: ERROR_SENTRY_APP_TITLE,
      order: 8100,
      category: DEFAULT_APP_CATEGORIES.observability,
      euiIconType: 'inspect',
      visibleIn: ['globalSearch', 'sideNav', 'kibanaOverview', 'home'],
      keywords: [
        i18n.translate('errorSentry.app.keyword.errors', { defaultMessage: 'errors' }),
        i18n.translate('errorSentry.app.keyword.patterns', { defaultMessage: 'log patterns' }),
      ],
      async mount(params: AppMountParameters) {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const { renderApp } = await import('./application');
        return renderApp(coreStart, pluginsStart, params);
      },
    });

    return {};
  }

  public start(_core: CoreStart, _plugins: ErrorSentryPublicStartDeps): ErrorSentryPublicStart {
    return {};
  }

  public stop() {}
}
