/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppStatus,
  DEFAULT_APP_CATEGORIES,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import {
  API_VERSIONS,
  PND_APP_ID,
  PND_APP_PATH,
  PND_FEATURE_ID,
  PND_PLUGIN_NAME,
  PND_SPACE_ENABLEMENT_SYNC_URL,
} from '@kbn/pnd-common';
import { getPndDeepLinks } from './deep_links';
import type {
  PndClientConfig,
  PndPublicSetup,
  PndPublicStart,
  PndSetupDependencies,
  PndStartDependencies,
} from './types';

const APP_TITLE = i18n.translate('xpack.pnd.appTitle', {
  defaultMessage: PND_PLUGIN_NAME,
});

export class PndPublicPlugin
  implements Plugin<PndPublicSetup, PndPublicStart, PndSetupDependencies, PndStartDependencies>
{
  private readonly config: PndClientConfig;

  constructor(context: PluginInitializerContext<PndClientConfig>) {
    this.config = context.config.get();
  }

  public setup(
    coreSetup: CoreSetup<PndStartDependencies, PndPublicStart>,
    _setupDeps: PndSetupDependencies
  ): PndPublicSetup {
    if (!this.config.enabled) {
      return {};
    }

    coreSetup.application.register({
      id: PND_APP_ID,
      title: APP_TITLE,
      appRoute: PND_APP_PATH,
      category: DEFAULT_APP_CATEGORIES.security,
      euiIconType: 'securitySignalDetected',
      status: AppStatus.accessible,
      visibleIn: ['classicSideNav', 'projectSideNav', 'globalSearch'],
      order: 101,
      deepLinks: getPndDeepLinks(),
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

  public start(core: CoreStart, _startDeps: PndStartDependencies): PndPublicStart {
    if (!this.config.enabled) {
      return {};
    }

    const capabilities = core.application.capabilities[PND_FEATURE_ID];
    if (capabilities?.write === true) {
      Promise.resolve(
        core.http.post(PND_SPACE_ENABLEMENT_SYNC_URL, { version: API_VERSIONS.internal.v1 })
      ).catch((error) => {
        core.notifications.toasts.addError(error, {
          title: i18n.translate('xpack.pnd.spaceEnablementSyncErrorMessage', {
            defaultMessage: 'Unable to synchronize PND watches in this space',
          }),
        });
      });
    }
    return {};
  }

  public stop() {}
}
