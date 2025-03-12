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
  ScopedHistory,
} from '@kbn/core/public';
import type { Subscription } from 'rxjs';
import type { ChromeBreadcrumb, ChromeStyle } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/logging';
import type {
  SearchNavigationPluginSetup,
  SearchNavigationPluginStart,
  ClassicNavItem,
  SearchNavigationSetBreadcrumbsOptions,
  AppPluginStartDependencies,
} from './types';
import { classicNavigationFactory } from './classic_navigation';

export class SearchNavigationPlugin
  implements Plugin<SearchNavigationPluginSetup, SearchNavigationPluginStart>
{
  private readonly logger: Logger;
  private currentChromeStyle: ChromeStyle | undefined = undefined;
  private baseClassicNavItemsFn: (() => ClassicNavItem[]) | undefined = undefined;
  private coreStart: CoreStart | undefined = undefined;
  private pluginsStart: AppPluginStartDependencies | undefined = undefined;
  private onAppMountHandlers: Array<() => Promise<void>> = [];
  private chromeSub: Subscription | undefined;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public setup(_core: CoreSetup): SearchNavigationPluginSetup {
    return {};
  }

  public start(core: CoreStart, plugins: AppPluginStartDependencies): SearchNavigationPluginStart {
    this.coreStart = core;
    this.pluginsStart = plugins;
    this.chromeSub = core.chrome.getChromeStyle$().subscribe((value) => {
      this.currentChromeStyle = value;
    });

    return {
      handleOnAppMount: this.handleOnAppMount.bind(this),
      registerOnAppMountHandler: this.registerOnAppMountHandler.bind(this),
      setGetBaseClassicNavItems: this.setGetBaseClassicNavItems.bind(this),
      useClassicNavigation: this.useClassicNavigation.bind(this),
      breadcrumbs: {
        setSearchBreadCrumbs: this.setBreadcrumbs.bind(this),
        clearBreadcrumbs: this.clearBreadcrumbs.bind(this),
      },
    };
  }

  public stop() {
    if (this.chromeSub) {
      this.chromeSub.unsubscribe();
      this.chromeSub = undefined;
    }
  }

  private async handleOnAppMount() {
    if (this.onAppMountHandlers.length === 0) return;

    try {
      await Promise.all(this.onAppMountHandlers);
    } catch (e) {
      this.logger.warn('Error handling app mount functions for search navigation');
      this.logger.warn(e);
    }
  }

  private registerOnAppMountHandler(handler: () => Promise<void>) {
    this.onAppMountHandlers.push(handler);
  }

  private setGetBaseClassicNavItems(classicNavItemsFn: () => ClassicNavItem[]) {
    this.baseClassicNavItemsFn = classicNavItemsFn;
  }

  private useClassicNavigation(history: ScopedHistory<unknown>) {
    if (
      this.baseClassicNavItemsFn === undefined ||
      this.coreStart === undefined ||
      this.currentChromeStyle !== 'classic'
    )
      return undefined;

    return classicNavigationFactory(this.baseClassicNavItemsFn(), this.coreStart, history);
  }

  private setBreadcrumbs(
    breadcrumbs: ChromeBreadcrumb[],
    { forClassicChromeStyle = false }: SearchNavigationSetBreadcrumbsOptions = {}
  ) {
    if (forClassicChromeStyle === true && this.currentChromeStyle !== 'classic') return;

    const searchBreadcrumbs = [this.getSearchHomeBreadcrumb(), ...breadcrumbs];
    if (this.pluginsStart?.serverless) {
      this.pluginsStart.serverless.setBreadcrumbs(searchBreadcrumbs);
    } else {
      this.coreStart?.chrome.setBreadcrumbs(searchBreadcrumbs);
    }
  }

  private clearBreadcrumbs() {
    if (this.pluginsStart?.serverless) {
      this.pluginsStart.serverless.setBreadcrumbs([]);
    } else {
      this.coreStart?.chrome.setBreadcrumbs([]);
    }
  }

  private getSearchHomeBreadcrumb(): ChromeBreadcrumb {
    // TODO: When search_navigation handles solution nav, use the default
    // home deep link for this breadcrumb's path.
    return {
      text: i18n.translate('xpack.searchNavigation.breadcrumbs.home.title', {
        defaultMessage: 'Elasticsearch',
      }),
    };
  }
}
