/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import type { ApmDataAccessPluginSetup } from '@kbn/apm-data-access-plugin/server';
import type {
  ElasticsearchClient,
  IUiSettingsClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { UI_SETTINGS } from '@kbn/data-plugin/server';

/** An APM event client over the space's APM index settings, querying as the current user. */
export const createApmEventClient = async ({
  apmDataAccess,
  esClient,
  savedObjectsClient,
  uiSettingsClient,
  request,
}: {
  apmDataAccess: ApmDataAccessPluginSetup;
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  uiSettingsClient: IUiSettingsClient;
  request: KibanaRequest;
}): Promise<APMEventClient> => {
  const [indices, includeFrozen] = await Promise.all([
    apmDataAccess.getApmIndices(savedObjectsClient),
    uiSettingsClient.get<boolean>(UI_SETTINGS.SEARCH_INCLUDE_FROZEN),
  ]);
  return new APMEventClient({
    indices,
    options: { includeFrozen },
    debug: false,
    esClient,
    request,
  });
};
