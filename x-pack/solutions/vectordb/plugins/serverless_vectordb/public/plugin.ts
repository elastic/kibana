/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, of, type Subscription } from 'rxjs';
import type { AppDeepLink, AppUpdater, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { hasSeenOnboarding } from '@kbn/vectordb-onboarding';
import {
  VECTORDB_APP_ID,
  GETTING_STARTED_DEEP_LINK_ID,
  GETTING_STARTED_PATH,
} from '../common/constants';
import { createNavigationTree } from './navigation_tree';
import { CONSOLE_DEFAULT_CONTENT } from './console_default_content';
import type {
  ServerlessVectordbPluginSetup,
  ServerlessVectordbPluginStart,
  ServerlessVectordbServices,
  ServerlessVectordbSetupDependencies,
  ServerlessVectordbStartDependencies,
} from './types';

const ONBOARDING_DEEP_LINKS: AppDeepLink[] = [
  {
    id: GETTING_STARTED_DEEP_LINK_ID,
    path: GETTING_STARTED_PATH,
    title: i18n.translate('xpack.serverlessVectordb.gettingStarted.title', {
      defaultMessage: 'Getting started',
    }),
    visibleIn: ['globalSearch', 'projectSideNav'],
  },
];

export class ServerlessVectordbPlugin
  implements
    Plugin<
      ServerlessVectordbPluginSetup,
      ServerlessVectordbPluginStart,
      ServerlessVectordbSetupDependencies,
      ServerlessVectordbStartDependencies
    >
{
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));
  private hideChrome = false;
  private integratedOnboardingEnabled = false;
  private integratedOnboardingSubscription?: Subscription;

  public setup(
    core: CoreSetup<ServerlessVectordbStartDependencies, ServerlessVectordbPluginStart>,
    { console: consolePlugin }: ServerlessVectordbSetupDependencies
  ): ServerlessVectordbPluginSetup {
    consolePlugin?.setDefaultEditorContent?.(CONSOLE_DEFAULT_CONTENT);

    // Read once: updaters re-run on every applications$ change, and the landing page marks
    // onboarding seen on mount, so a lazy read would show the chrome mid-wizard.
    this.hideChrome = !hasSeenOnboarding();
    this.updateApp();
    const showChrome = () => {
      this.hideChrome = false;
      this.updateApp();
    };

    core.application.register({
      id: VECTORDB_APP_ID,
      title: i18n.translate('xpack.serverlessVectordb.app.title', {
        defaultMessage: 'Vector DB',
      }),
      appRoute: '/app/vectordb',
      euiIconType: 'logoVectorDB',
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      updater$: this.appUpdater$,
      deepLinks: ONBOARDING_DEEP_LINKS,
      async mount(params) {
        const [coreStart, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./application');
        const appServices: ServerlessVectordbServices = {
          ...coreStart,
          share: depsStart.share,
          console: depsStart.console,
          cloud: depsStart.cloud,
          agentBuilder: depsStart.agentBuilder,
          elasticsearchHome: depsStart.elasticsearchHome,
          history: params.history,
        };
        return renderApp(coreStart, appServices, params, showChrome);
      },
    });

    return {};
  }

  public start(
    core: CoreStart,
    { navigation, elasticsearchHome }: ServerlessVectordbStartDependencies
  ): ServerlessVectordbPluginStart {
    // `hideChrome` is read in setup, before feature flag values exist, so the flag is applied here.
    this.integratedOnboardingSubscription = elasticsearchHome
      .getIntegratedOnboardingEnabled$()
      .subscribe((enabled) => {
        this.integratedOnboardingEnabled = enabled;
        this.updateApp();
      });

    const navigationTree$ = of(createNavigationTree({ ...core.application, core }));
    navigation.initNavigation('vectordb', navigationTree$, 'serverlessVectordb');
    return {};
  }

  public stop() {
    this.integratedOnboardingSubscription?.unsubscribe();
  }

  private updateApp() {
    if (this.integratedOnboardingEnabled) {
      this.appUpdater$.next(() => ({ hideChrome: false, deepLinks: [] }));
      return;
    }
    const { hideChrome } = this;
    this.appUpdater$.next(() => ({ hideChrome }));
  }
}
