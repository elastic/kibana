/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { PROJECT_ROUTING_ALL } from '@kbn/cps-server-utils';
import { NIGHTSHIFT_FEATURE_ID } from '@kbn/nightshift-shared';
import { registerRoutes } from '@kbn/server-route-repository';
import { EsqlViewsClient } from './lib/esql_views_client';
import { createSourceChangeEmitter, type SourceChangeEmitter } from './lib/source_change_emitter';
import { SourcesClient } from './lib/sources_client';
import { nightshiftSourcesRouteRepository } from './routes';
import {
  NIGHTSHIFT_SOURCE_SO_TYPE,
  nightshiftSourceSavedObjectType,
} from './saved_objects/nightshift_source_saved_object';
import type {
  GetSourcesClient,
  NightshiftSourcesServerSetup,
  NightshiftSourcesServerStart,
  NightshiftSourcesServerStartDependencies,
} from './types';

export class NightshiftSourcesPlugin
  implements
    Plugin<
      NightshiftSourcesServerSetup,
      NightshiftSourcesServerStart,
      object,
      NightshiftSourcesServerStartDependencies
    >
{
  private readonly logger: Logger;
  private readonly isDev: boolean;
  private readonly sourceChangeEmitter: SourceChangeEmitter;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.isDev = context.env.mode.dev;
    this.sourceChangeEmitter = createSourceChangeEmitter(this.logger.get('source-changes'));
  }

  public setup(
    core: CoreSetup<NightshiftSourcesServerStartDependencies, NightshiftSourcesServerStart>
  ): NightshiftSourcesServerSetup {
    core.savedObjects.registerType(nightshiftSourceSavedObjectType);

    const getSourcesClient: GetSourcesClient = async ({ request }) => {
      const [coreStart] = await core.getStartServices();
      return this.createSourcesClient({ core: coreStart, request });
    };

    registerRoutes({
      repository: nightshiftSourcesRouteRepository,
      dependencies: { getSourcesClient },
      core,
      logger: this.logger,
      runDevModeChecks: this.isDev,
    });

    return { onSourceChange: this.sourceChangeEmitter.subscribe };
  }

  public start(
    core: CoreStart,
    plugins: NightshiftSourcesServerStartDependencies
  ): NightshiftSourcesServerStart {
    if (plugins.features) {
      const hasFeature = plugins.features
        .getKibanaFeatures()
        .some((f) => f.id === NIGHTSHIFT_FEATURE_ID);
      if (!hasFeature) {
        this.logger.warn(
          `The "${NIGHTSHIFT_FEATURE_ID}" feature is not registered. ` +
            'All nightshiftSources routes will return 403 because their privileges do not exist. ' +
            'Ensure the nightshift plugin is enabled alongside nightshiftSources.'
        );
      }
    }

    return {
      getSourcesClient: async ({ request }) => this.createSourcesClient({ core, request }),
    };
  }

  private createSourcesClient({
    core,
    request,
  }: {
    core: CoreStart;
    request: KibanaRequest;
  }): SourcesClient {
    // Hidden types are left out of the scoped client unless named. Nightshift `all` / `read`
    // grant this type, so the security extension authorizes the call and writes the audit event.
    // `configure_nightshift` does not include it. The spaces extension stays on.
    const soClient = core.savedObjects.getScopedClient(request, {
      includedHiddenTypes: [NIGHTSHIFT_SOURCE_SO_TYPE],
    });

    // Views live in the origin project. Validation and health probes read the data behind a
    // source, which under CPS may live in linked projects, so they route across all of them.
    const viewsEsClient = core.elasticsearch.client.asScoped(request).asCurrentUser;
    const dataEsClient = core.elasticsearch.client.asScoped(request, {
      projectRouting: 'expression',
      value: PROJECT_ROUTING_ALL,
    }).asCurrentUser;

    return new SourcesClient({
      soClient,
      viewsClient: new EsqlViewsClient(viewsEsClient),
      dataEsClient,
      logger: this.logger.get('sources'),
      username: core.security.authc.getCurrentUser(request)?.username ?? '<system>',
      spaceId: request.spaceId,
      onChange: (change) => this.sourceChangeEmitter.emit({ ...change, request }),
    });
  }

  public stop() {}
}
