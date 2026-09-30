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
 * Per request rather than per space id: the setting is space-scoped and resolved from the
 * request's own space, so a Context Engine enabled in one space says nothing about another.
 *
 * `CoreStart` is read through a getter because step definitions register during `setup` while the
 * scoped clients only exist after `start`. Before then, and if `start` never ran, this reports
 * disabled -- the setting itself ships off, so writing into a Context Engine the deployment never
 * enabled is the outcome this gate exists to prevent.
 */
export const makeIsContextEngineEnabled =
  (getCoreStart: () => CoreStart | undefined) =>
  async (request: KibanaRequest): Promise<boolean> => {
    const coreStart = getCoreStart();
    if (!coreStart) {
      return false;
    }
    return coreStart.uiSettings
      .asScopedToClient(coreStart.savedObjects.getScopedClient(request))
      .get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID);
  };
