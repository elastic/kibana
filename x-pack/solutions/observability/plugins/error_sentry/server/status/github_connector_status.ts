/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { GITHUB_CONNECTOR_ID } from '../../common/constants';
import type { ComponentStatus } from '../../common/constants';

export const getGithubConnectorStatus = async (
  actions: ActionsPluginStart | undefined,
  request: KibanaRequest
): Promise<ComponentStatus> => {
  if (!actions) {
    return {
      id: 'github_connector',
      label: 'GitHub connector',
      state: 'unavailable',
      detail: 'Actions plugin is not available.',
      repairable: false,
    };
  }

  const actionsClient = await actions.getActionsClientWithRequest(request);
  const allConnectors = await actionsClient.getAll({ includeSystemActions: false });
  const githubConnector = allConnectors.find((c) => c.id === GITHUB_CONNECTOR_ID);

  if (!githubConnector) {
    return {
      id: 'github_connector',
      label: 'GitHub connector',
      state: 'missing',
      detail: 'No connector with id "github" found. Configure it in Stack Management → Connectors.',
      repairable: false,
      actionLink: '/app/management/insightsAndAlerting/triggersActionsConnectors/connectors',
    };
  }

  return {
    id: 'github_connector',
    label: 'GitHub connector',
    state: 'ok',
    repairable: false,
    actionLink: '/app/management/insightsAndAlerting/triggersActionsConnectors/connectors',
  };
};
