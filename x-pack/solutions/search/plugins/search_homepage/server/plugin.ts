/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  IRouter,
} from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { SearchHomepagePluginStart, SearchHomepagePluginSetup } from './types';
import { defineRoutes } from './routes';
import { BillingApiKeyType, BillingApiKeyEncryptionParams } from './saved_objects/billing_api_key';

export interface RouteDependencies {
  http: CoreSetup<SearchHomepagePluginSetup>['http'];
  logger: Logger;
  router: IRouter;
  getSecurity: () => Promise<SecurityPluginStart>;
}

interface SearchHomepageSetupDeps {
  encryptedSavedObjects?: EncryptedSavedObjectsPluginSetup;
}

interface SearchHomepageStartDeps {
  encryptedSavedObjects?: EncryptedSavedObjectsPluginStart;
}

export class SearchHomepagePlugin
  implements
    Plugin<
      SearchHomepagePluginSetup,
      SearchHomepagePluginStart,
      SearchHomepageSetupDeps,
      SearchHomepageStartDeps
    >
{
  private readonly logger: Logger;
  private readonly isServerless: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.isServerless = initializerContext.env.packageInfo.buildFlavor === 'serverless';
  }

  public setup(
    core: CoreSetup<SearchHomepageStartDeps, SearchHomepagePluginStart>,
    plugins: SearchHomepageSetupDeps
  ) {
    this.logger.debug('searchHomepage: Setup');
    const router = core.http.createRouter();

    core.savedObjects.registerType(BillingApiKeyType);

    if (plugins.encryptedSavedObjects) {
      plugins.encryptedSavedObjects.registerType(BillingApiKeyEncryptionParams);
    }

    defineRoutes(router, this.logger, {
      isServerless: this.isServerless,
      getStartServices: core.getStartServices,
    });
    return {};
  }

  public start(core: CoreStart) {
    return {};
  }
}
