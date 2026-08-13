/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointOf, ServerRouteRepository } from '@kbn/server-route-repository';
import { listSessionReplaySessionsRoute } from './session_replay/list_sessions';
import { getSessionRoute } from './session_replay/get_session';
import { getSessionReplayEventsRoute } from './session_replay/get_events';
import {
  getSessionReplaySettingsRoute,
  updateSessionReplaySettingsRoute,
} from './session_replay/settings';

function getTypedUxServerRouteRepository() {
  return {
    ...listSessionReplaySessionsRoute,
    ...getSessionRoute,
    ...getSessionReplayEventsRoute,
    ...getSessionReplaySettingsRoute,
    ...updateSessionReplaySettingsRoute,
  };
}

export const getUxServerRouteRepository = (): ServerRouteRepository => {
  return getTypedUxServerRouteRepository();
};

export type UxServerRouteRepository = ReturnType<typeof getTypedUxServerRouteRepository>;
export type UxAPIEndpoint = EndpointOf<UxServerRouteRepository>;
