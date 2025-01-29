/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAgentActionConnectRouteDefinition } from './agent_action_connect_route';
import { getAgentActionDisconnectRouteDefinition } from './agent_action_disconnect_route';
import { getActivitiesRouteDefinition } from './activities_route';
import { getAgentsRouteDefinition } from './agents_route';
import type { EmulatorServerRouteDefinition } from '../../../lib/emulator_server.types';

export const getSentinelOneRouteDefinitions = (): EmulatorServerRouteDefinition[] => {
  return [
    getAgentsRouteDefinition(),
    getActivitiesRouteDefinition(),
    getAgentActionConnectRouteDefinition(),
    getAgentActionDisconnectRouteDefinition(),
  ];
};
