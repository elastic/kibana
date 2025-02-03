/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rtrCommandRoute } from './rtr_command_route';
import { batchRTRRefreshSessionRoute } from './batch_refresh_rtr_session_route';
import { rtrAdminCommandRoute } from './rtr_admin_route';
import { refreshRTRSessionRoute } from './refresh_rtr_session_route';
import { getCustomScriptsDetailsRoute } from './get_scripts_details_route';
import { initRTRSessionRoute } from './init_rtr_route';
import { getRTRCommandDetailsRoute } from './get_rtr_command_details_route';
import { batchRTRCommandRoute } from './batch_rtr_command_route';
import { batchInitRTRSessionRoute } from './batch_init_rtr_route';
import { getTokenRouteDefinition } from './get_token_route';
import type { EmulatorServerRouteDefinition } from '../../../lib/emulator_server.types';
import { hostActionsRouteDefinition } from './host_actions_route';
import { getAgentDetailsRouteDefinition } from './get_agent_details_route';
import { getAgentOnlineStatusRouteDefinition } from './get_agent_online_status_route';
import { getCustomScriptsIdsRoute } from './get_scripts_ids_route';

export const getCrowdstrikeRouteDefinitions = (): EmulatorServerRouteDefinition[] => {
  return [
    getTokenRouteDefinition(),
    hostActionsRouteDefinition(),
    getAgentDetailsRouteDefinition(),
    getAgentOnlineStatusRouteDefinition(),
    batchInitRTRSessionRoute(),
    batchRTRCommandRoute(),
    getRTRCommandDetailsRoute(),
    getCustomScriptsIdsRoute(),
    getCustomScriptsDetailsRoute(),
    initRTRSessionRoute(),
    refreshRTRSessionRoute(),
    rtrAdminCommandRoute(),
    batchRTRRefreshSessionRoute(),
    rtrCommandRoute(),
  ];
};
