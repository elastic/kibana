/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type PluginInitializerContext, type CoreSetup, type CoreStart, type Plugin, type Logger } from '@kbn/core/server';

import { type SearchHomepagePluginSetup, type SearchHomepagePluginStart } from './types';

export class SearchHomepagePlugin
  implements Plugin<SearchHomepagePluginSetup, SearchHomepagePluginStart, {}, {}>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<{}, SearchHomepagePluginStart>) {
    this.logger.debug('searchHomepage: Setup');
    return {};
  }

  public start(core: CoreStart) {
    return {};
  }
}
