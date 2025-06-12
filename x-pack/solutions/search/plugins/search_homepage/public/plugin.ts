/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  Plugin,
  CoreStart,
  AppMountParameters,
  PluginInitializerContext,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID } from '../common';

import { SearchHomepage } from './embeddable';
import { isHomepageEnabled } from './feature_flags';
import { docLinks } from '../common/doc_links';
import { QueryClient, MutationCache, QueryCache } from '@tanstack/react-query';
import {
  SearchHomepageConfigType,
  SearchHomepagePluginSetup,
  SearchHomepagePluginStart,
  SearchHomepageAppPluginStartDependencies,
  SearchHomepageAppInfo,
  SearchHomepageServicesContext,
} from './types';
import { getErrorCode, getErrorMessage, isKibanaServerError } from './utils/get_error_message';

const appInfo: SearchHomepageAppInfo = {
  id: PLUGIN_ID,
  appRoute: '/app/elasticsearch/home',
  title: i18n.translate('xpack.searchHomepage.appTitle', { defaultMessage: 'Home' }),
};

export class SearchHomepagePlugin
  implements Plugin<SearchHomepagePluginSetup, SearchHomepagePluginStart, {}, {}>
{
  private readonly config: SearchHomepageConfigType;
  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<SearchHomepageConfigType>();
  }

  public setup(
    core: CoreSetup<SearchHomepageAppPluginStartDependencies, SearchHomepagePluginStart>
  ) {
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
    const result: SearchHomepagePluginSetup = {
      app: appInfo,
      isHomepageFeatureEnabled() {
        return isHomepageEnabled(core.uiSettings);
      },
    };
    if (!this.config.ui?.enabled) return result;
    if (!isHomepageEnabled(core.uiSettings)) return result;

    core.application.register({
      ...result.app,
      async mount({ element, history }: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        docLinks.setDocLinks(coreStart.docLinks.links);
        const startDeps: SearchHomepageServicesContext = {
          ...depsStart,
          history,
          http: coreStart.http,
        };

        return renderApp(coreStart, startDeps, element, queryClient);
      },
    });

    return result;
  }

  public start(core: CoreStart) {
    return {
      app: appInfo,
      isHomepageFeatureEnabled() {
        return isHomepageEnabled(core.uiSettings);
      },
      SearchHomepage,
    };
  }
}
