/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';

/**
 * Resolves the Context Engine advanced setting for the space a step is running in, gating the
 * coverage Knowledge Items the packaging step writes into the Context Engine's own backing index.
 *
 * Per request rather than per space id: the setting is space-scoped and read through the
 * request's own client, so the calling user's privileges apply here as they do to the rest of
 * the step. The Context Engine has its own `isContextEngineEnabledInSpace`, which is not
 * exported from that plugin and reads via an unsafe internal client keyed on a space id; using
 * it would mean a new plugin dependency and a deep import to get a less scoped answer.
 *
 * `CoreStart` is read through a getter because step definitions register during `setup` while
 * the scoped clients only exist after `start`. The getter is expected to throw before then, per
 * this plugin's `requireStarted` convention: a not-yet-started plugin is a different condition
 * from a Context Engine that is off, and the caller distinguishes them.
 */
export const makeIsContextEngineEnabled =
  (getCoreStart: () => CoreStart) =>
  async (request: KibanaRequest): Promise<boolean> => {
    const coreStart = getCoreStart();
    return coreStart.uiSettings
      .asScopedToClient(coreStart.savedObjects.getScopedClient(request))
      .get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID);
  };
