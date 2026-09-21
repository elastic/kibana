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
import { filter, from, map, switchMap, take, type Subscription } from 'rxjs';
import {
  ALERTZERO_APP_ID,
  ALERTZERO_APP_PATH,
  ALERTZERO_ENABLED_SETTING_ID,
  API_VERSIONS,
  TEMPLATE_ID_INVESTIGATION,
  buildInvestigationUrl,
} from '@kbn/alertzero-common';
import type { GetInvestigationResponse } from '@kbn/alertzero-common';
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
  private templateRegistration?: Subscription;

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
      // Inaccessible until the per-space setting is on. Core then empties `visibleIn` and
      // `deepLinks` for us, which is what removes the AlertZero nodes from the Security
      // navigation tree — those trees hold no check of their own.
      status: AppStatus.inaccessible,
      visibleIn: ['classicSideNav', 'projectSideNav', 'globalSearch'],
      order: 101,
      deepLinks: getAlertZeroDeepLinks(),
      updater$: from(coreSetup.getStartServices()).pipe(
        switchMap(([coreStart]) =>
          coreStart.uiSettings.get$<boolean>(ALERTZERO_ENABLED_SETTING_ID, false).pipe(
            map(
              (settingEnabled): AppUpdater =>
                () => ({
                  status: settingEnabled ? AppStatus.accessible : AppStatus.inaccessible,
                })
            )
          )
        )
      ),
      mount: async (params) => {
        const [coreStart, startDeps] = await coreSetup.getStartServices();
        const { renderApp } = await import('./application');
        return renderApp({
          coreStart,
          startDeps,
          params,
          config: this.config,
        });
      },
    });

    return {};
  }

  public start(core: CoreStart, startDeps: AlertZeroStartDependencies): AlertZeroPublicStart {
    if (!this.config.enabled) {
      return {};
    }

    // The template registration API has no deregistration counterpart, so this is one-shot: we
    // register on the first `true` and cannot remove the entry if the setting is later disabled.
    // The setting is therefore registered with `requiresPageReload`, so disabling it prompts for a
    // reload and the next session starts without the registration. `loadInvestigation` re-checks
    // the live setting to cover the window before that reload, where slots opened while AlertZero
    // is disabled surface an error instead of issuing a 404.
    //
    // Errors from registerAgenticInvestigationTemplateUI are re-raised as unhandled rejections
    // so they surface in the browser console and unhandledrejection listeners, rather than
    // being silently swallowed by RxJS's global error handler.
    this.templateRegistration = core.uiSettings
      .get$<boolean>(ALERTZERO_ENABLED_SETTING_ID, false)
      .pipe(filter(Boolean), take(1))
      .subscribe({
        next: () => {
          try {
            registerAgenticInvestigationTemplateUI({
              conversationTemplates: startDeps.agentBuilder.conversationTemplates,
              templateId: TEMPLATE_ID_INVESTIGATION,
              name: INVESTIGATION_TEMPLATE_NAME,
              icon: 'securitySignalDetected',
              loadInvestigation: async (conversationId) => {
                if (!core.uiSettings.get<boolean>(ALERTZERO_ENABLED_SETTING_ID, false)) {
                  throw new Error('AlertZero is disabled for this space');
                }
                const { investigation } = await core.http.get<GetInvestigationResponse>(
                  buildInvestigationUrl(conversationId),
                  { version: API_VERSIONS.internal.v1 }
                );
                return investigation;
              },
            });
          } catch (err) {
            Promise.reject(err);
          }
        },
      });

    return {};
  }

  public stop() {
    this.templateRegistration?.unsubscribe();
  }
}
