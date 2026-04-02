/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CoreSetup, type CoreStart, type Plugin } from '@kbn/core/public';

import type { Subscription } from 'rxjs';
import { docLinks } from '../common/doc_links';
import type {
  AppPluginSetupDependencies,
  SearchIndicesAppPluginStartDependencies,
  SearchIndicesPluginSetup,
  SearchIndicesPluginStart,
} from './types';

import { registerLocators } from './locators';

export class SearchIndicesPlugin
  implements Plugin<SearchIndicesPluginSetup, SearchIndicesPluginStart>
{
  private pluginEnabled: boolean = false;
  private activeSolutionIdSubscription: Subscription | undefined;

  public setup(
    core: CoreSetup<SearchIndicesAppPluginStartDependencies, SearchIndicesPluginStart>,
    plugins: AppPluginSetupDependencies
  ): SearchIndicesPluginSetup {
    this.pluginEnabled = true;

    registerLocators(plugins.share);

    return {
      enabled: true,
    };
  }

  public start(
    core: CoreStart,
    deps: SearchIndicesAppPluginStartDependencies
  ): SearchIndicesPluginStart {
    docLinks.setDocLinks(core.docLinks.links);

    return {
      enabled: this.pluginEnabled,
    };
  }

  public stop() {
    if (this.activeSolutionIdSubscription) {
      this.activeSolutionIdSubscription.unsubscribe();
      this.activeSolutionIdSubscription = undefined;
    }
  }
}
