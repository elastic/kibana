/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppStatus,
  DEFAULT_APP_CATEGORIES,
  type AppUpdater,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { Subject } from 'rxjs';
import {
  ALERTZERO_APP_ID,
  ALERTZERO_APP_PATH,
  TEMPLATE_ID_INVESTIGATION,
} from '@kbn/alertzero-common';
import { registerAgenticInvestigationTemplateUI } from '@kbn/agentic-investigations-common';
import { getAlertZeroDeepLinks } from './deep_links';
import type {
  AlertZeroClientConfig,
  AlertZeroPublicSetup,
  AlertZeroPublicStart,
  AlertZeroSetupDependencies,
  AlertZeroStartDependencies,
} from './types';

// Kept as a literal rather than `ALERTZERO_PLUGIN_NAME`: the i18n extractor only reads
// string literals, so a constant reference here would silently drop the message.
const APP_TITLE = i18n.translate('xpack.alertzero.appTitle', {
  defaultMessage: 'AlertZero',
});

const INVESTIGATION_TEMPLATE_NAME = i18n.translate('xpack.alertzero.conversationTemplate.name', {
  defaultMessage: 'Investigation',
});

export class AlertZeroPublicPlugin
  implements
    Plugin<
      AlertZeroPublicSetup,
      AlertZeroPublicStart,
      AlertZeroSetupDependencies,
      AlertZeroStartDependencies
    >
{
  private readonly config: AlertZeroClientConfig;
  /**
   * Allows `start()` to push updated deep links (with capability-resolved visibility)
   * after capabilities become available, without re-registering the application.
   */
  private readonly appUpdater$ = new Subject<AppUpdater>();

  constructor(context: PluginInitializerContext<AlertZeroClientConfig>) {
    this.config = context.config.get();
  }

  public setup(
    coreSetup: CoreSetup<AlertZeroStartDependencies, AlertZeroPublicStart>,
    _setupDeps: AlertZeroSetupDependencies
  ): AlertZeroPublicSetup {
    if (!this.config.enabled) {
      return {};
    }

    coreSetup.application.register({
      id: ALERTZERO_APP_ID,
      title: APP_TITLE,
      appRoute: ALERTZERO_APP_PATH,
      category: DEFAULT_APP_CATEGORIES.security,
      euiIconType: 'securitySignalDetected',
      status: AppStatus.accessible,
      visibleIn: ['classicSideNav', 'projectSideNav', 'globalSearch'],
      order: 101,
      // Initial deep links without capability filtering — capabilities are not available at
      // setup. `start()` emits an update via appUpdater$ once capabilities are known.
      deepLinks: getAlertZeroDeepLinks(),
      updater$: this.appUpdater$,
      mount: async (params) => {
        const [coreStart, startDeps] = await coreSetup.getStartServices();
        const { renderApp } = await import('./application');
        return renderApp({
          coreStart,
          startDeps,
          params,
        });
      },
    });

    return {};
  }

  public start(core: CoreStart, startDeps: AlertZeroStartDependencies): AlertZeroPublicStart {
    if (!this.config.enabled) {
      return {};
    }

    // Push capability-resolved deep links now that `core.application.capabilities` is available.
    this.appUpdater$.next(() => ({
      deepLinks: getAlertZeroDeepLinks(core.application.capabilities),
    }));

    registerAgenticInvestigationTemplateUI({
      conversationTemplates: startDeps.agentBuilder.conversationTemplates,
      templateId: TEMPLATE_ID_INVESTIGATION,
      name: INVESTIGATION_TEMPLATE_NAME,
      icon: 'securitySignalDetected',
    });

    return {};
  }

  public stop() {}
}
