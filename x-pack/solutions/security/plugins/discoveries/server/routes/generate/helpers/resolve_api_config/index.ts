/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';

import type { DiscoveriesPluginStartDeps } from '../../../../types';
import { resolveConnectorDetails } from '../../../../workflows/helpers/resolve_connector_details';

interface ApiConfigInput {
  action_type_id?: string;
  connector_id: string;
}

/**
 * Ensures the api_config has a resolved action_type_id before workflow execution.
 *
 * If action_type_id is already set (non-empty), returns the config unchanged without
 * making any service calls. If empty or undefined, lazily calls getStartServices() to
 * obtain an actions client and optional inference plugin, then resolves the action_type_id
 * via resolveConnectorDetails.
 *
 * This encapsulates the "resolve action_type_id from connector when not provided" semantic
 * required before executing the generation workflow.
 */
export const resolveApiConfig = async <T extends ApiConfigInput>({
  apiConfig,
  getStartServices,
  logger,
  request,
}: {
  apiConfig: T;
  getStartServices: () => Promise<{
    coreStart: CoreStart;
    pluginsStart: DiscoveriesPluginStartDeps;
  }>;
  logger: Logger;
  request: KibanaRequest;
}): Promise<T & { action_type_id: string }> => {
  if (apiConfig.action_type_id) {
    return apiConfig as T & { action_type_id: string };
  }

  const { pluginsStart } = await getStartServices();
  const actionsClient = await pluginsStart.actions.getActionsClientWithRequest(request);

  const { actionTypeId } = await resolveConnectorDetails({
    actionsClient,
    connectorId: apiConfig.connector_id,
    inference: pluginsStart.inference,
    logger,
    request,
  });

  return { ...apiConfig, action_type_id: actionTypeId } as T & { action_type_id: string };
};
