/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import type { ApmDataAccessPluginSetup } from '@kbn/apm-data-access-plugin/server';
import type { ElasticsearchClient, IUiSettingsClient, KibanaRequest } from '@kbn/core/server';
import { UI_SETTINGS } from '@kbn/data-plugin/server';

export type ApmIndices = Awaited<ReturnType<ApmDataAccessPluginSetup['getApmIndices']>>;

/** An APM event client over the given APM indices, querying as the current user. */
export const createApmEventClient = async ({
  indices,
  esClient,
  uiSettingsClient,
  request,
}: {
  indices: ApmIndices;
  esClient: ElasticsearchClient;
  uiSettingsClient: IUiSettingsClient;
  request: KibanaRequest;
}): Promise<APMEventClient> => {
  const includeFrozen = await uiSettingsClient.get<boolean>(UI_SETTINGS.SEARCH_INCLUDE_FROZEN);
  return new APMEventClient({
    indices,
    options: { includeFrozen },
    debug: false,
    esClient,
    request,
  });
};
