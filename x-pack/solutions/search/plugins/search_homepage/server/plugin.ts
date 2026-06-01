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
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { SearchHomepagePluginStart, SearchHomepagePluginSetup } from './types';
import { defineRoutes } from './routes';
import { nightshiftApiKeyAttachmentType } from './agent_brief/nightshift_api_key_type';

export interface RouteDependencies {
  http: CoreSetup<SearchHomepagePluginSetup>['http'];
  logger: Logger;
  router: IRouter;
  getSecurity: () => Promise<SecurityPluginStart>;
}

export interface SearchHomepageServerPluginSetupDeps {
  agentBuilder?: AgentBuilderPluginSetup;
}

export class SearchHomepagePlugin
  implements
    Plugin<
      SearchHomepagePluginSetup,
      SearchHomepagePluginStart,
      SearchHomepageServerPluginSetupDeps,
      {}
    >
{
  private readonly logger: Logger;
  private readonly isServerless: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.isServerless = initializerContext.env.packageInfo.buildFlavor === 'serverless';
  }

  public setup(
    core: CoreSetup<{}, SearchHomepagePluginStart>,
    plugins: SearchHomepageServerPluginSetupDeps
  ) {
    this.logger.debug('searchHomepage: Setup');
    const router = core.http.createRouter();

    defineRoutes(router, this.logger, {
      isServerless: this.isServerless,
    });

    /*
     * Register the VectorDB "Expiring API key" attachment type with the
     * Agent Builder runtime. Without this server-side registration the
     * conversation round fails validation (the server's
     * `validateAttachment` rejects "Unknown attachment type:
     * nightshift.apiKey"), which surfaces in the UI as a "Reasoning
     * error" / generic round error — matches the obs Nightshift
     * pattern where each client-side attachment definition has a
     * mirror on the server. The agent doesn't read the data; it only
     * needs the type to validate and a text representation to ground
     * the conversation.
     */
    plugins.agentBuilder?.attachments.registerType(nightshiftApiKeyAttachmentType);

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }
}
