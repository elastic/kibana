/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { UxRouteHandlerResources } from '../routes/types';

export const createUxRouteResources = ({
  core,
  esClient,
  request,
  logger,
}: {
  core: CoreSetup;
  esClient: IScopedClusterClient;
  request: KibanaRequest;
  logger: Logger;
}): UxRouteHandlerResources =>
  ({
    request,
    logger,
    context: {
      core: Promise.resolve({
        elasticsearch: { client: esClient },
      }),
    },
    core: {
      setup: core,
      start: () => core.getStartServices().then(([coreStart]) => coreStart),
    },
  } as UxRouteHandlerResources);
