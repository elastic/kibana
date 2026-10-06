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
import type { FeaturesPluginStart } from '@kbn/features-plugin/server';
import { NIGHTSHIFT_FEATURE_ID } from '@kbn/nightshift-shared';
import { registerRoutes } from '@kbn/server-route-repository';
import { EsqlViewsClient } from './lib/esql_views_client';
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
} from './types';

const createSourcesClient = (
  core: CoreStart,
  request: KibanaRequest,
  logger: Logger
): SourcesClient => {
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
    logger,
    username: core.security.authc.getCurrentUser(request)?.username ?? '<system>',
    spaceId: request.spaceId,
  });
};

export class NightshiftSourcesPlugin
  implements Plugin<NightshiftSourcesServerSetup, NightshiftSourcesServerStart>
{
  private readonly logger: Logger;
  private readonly isDev: boolean;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.isDev = context.env.mode.dev;
  }

  public setup(core: CoreSetup): NightshiftSourcesServerSetup {
    core.savedObjects.registerType(nightshiftSourceSavedObjectType);

    const getSourcesClient: GetSourcesClient = async ({ request }) => {
      const [coreStart] = await core.getStartServices();
      return createSourcesClient(coreStart, request, this.logger.get('sources'));
    };

    registerRoutes({
      repository: nightshiftSourcesRouteRepository,
      dependencies: { getSourcesClient },
      core,
      logger: this.logger,
      runDevModeChecks: this.isDev,
    });
  }

  public start(
    core: CoreStart,
    plugins: { features?: FeaturesPluginStart }
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
      getSourcesClient: async ({ request }) =>
        createSourcesClient(core, request, this.logger.get('sources')),
    };
  }

  public stop() {}
}
