/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { appIds } from '@kbn/management-cards-navigation';
import { QueryClient, MutationCache, QueryCache } from '@kbn/react-query';
import type { Subscription } from 'rxjs';
import { of } from 'rxjs';
import type {
  ServerlessSearchPluginSetup,
  ServerlessSearchPluginSetupDependencies,
  ServerlessSearchPluginStart,
  ServerlessSearchPluginStartDependencies,
} from './types';
import { getErrorCode, getErrorMessage, isKibanaServerError } from './utils/get_error_message';
import { createNavigationTree } from './navigation_tree';
import { WEB_CRAWLERS_LABEL } from '../common/i18n_string';

export class ServerlessSearchPlugin
  implements
    Plugin<
      ServerlessSearchPluginSetup,
      ServerlessSearchPluginStart,
      ServerlessSearchPluginSetupDependencies,
      ServerlessSearchPluginStartDependencies
    >
{
  private managementCardsSubscription?: Subscription;

  public setup(
    core: CoreSetup<ServerlessSearchPluginStartDependencies, ServerlessSearchPluginStart>,
    setupDeps: ServerlessSearchPluginSetupDependencies
  ): ServerlessSearchPluginSetup {
    const queryClient = new QueryClient({
      mutationCache: new MutationCache({
        onError: (error) => {
          core.notifications.toasts.addError(error as Error, {
            title: (error as Error).name,
            toastMessage: getErrorMessage(error),
            toastLifeTimeMs: 1000,
          });
        },
      }),
      queryCache: new QueryCache({
        onError: (error) => {
          // 404s are often functionally okay and shouldn't show toasts by default
          if (getErrorCode(error) === 404) {
            return;
          }
          if (isKibanaServerError(error) && !error.skipToast) {
            core.notifications.toasts.addError(error, {
              title: error.name,
              toastMessage: getErrorMessage(error),
              toastLifeTimeMs: 1000,
            });
          }
        },
      }),
    });

    const homeTitle = i18n.translate('xpack.serverlessSearch.app.home.title', {
      defaultMessage: 'Home',
    });

    core.application.register({
      id: 'serverlessHomeRedirect',
      title: homeTitle,
      appRoute: '/app/elasticsearch',
      exactRoute: true,
      euiIconType: 'logoElastic',
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      visibleIn: [],
      async mount({}: AppMountParameters) {
        const [coreStart] = await core.getStartServices();
        coreStart.chrome.docTitle.change(homeTitle);
        coreStart.application.navigateToApp('searchHomepage');
        return () => {};
      },
    });

    core.application.register({
      id: 'serverlessWebCrawlers',
      title: WEB_CRAWLERS_LABEL,
      appRoute: '/app/web_crawlers',
      euiIconType: 'logoElastic',
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      visibleIn: ['globalSearch'],
      async mount({ element, history }: AppMountParameters) {
        const { renderApp } = await import('./application/web_crawlers');
        const [coreStart, services] = await core.getStartServices();
        coreStart.chrome.docTitle.change(WEB_CRAWLERS_LABEL);

        return await renderApp(element, coreStart, { history, ...services }, queryClient);
      },
    });

    return {};
  }

  public start(
    core: CoreStart,
    services: ServerlessSearchPluginStartDependencies
  ): ServerlessSearchPluginStart {
    const { serverless, navigation, management, security } = services;

    const navigationTree$ = of(
      createNavigationTree({
        ...core.application,
        core,
        showPerformanceLink: Boolean(core.application.capabilities.serverlessSearch?.manageCluster),
      })
    );
    navigation.initNavigation('es', navigationTree$, 'serverlessSearch');

    this.managementCardsSubscription = serverless
      .getNavigationCards$(security.authz.isRoleManagementEnabled())
      .subscribe((extendCardNavDefinitions) => {
        management.setupCardsNavigation({
          enabled: true,
          hideLinksTo: [appIds.MAINTENANCE_WINDOWS],
          extendCardNavDefinitions,
        });
      });

    return {};
  }

  public stop() {
    this.managementCardsSubscription?.unsubscribe();
  }
}
