/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { ALERTZERO_ENABLED_SETTING_ID } from '@kbn/alertzero-common';

/**
 * Gates an AlertZero route on the per-space `securitySolution:enableAlertZero` advanced setting.
 * While the setting is off the route 404s as if it had never been registered.
 *
 * The setting is registered next to the routes, inside the `xpack.alertzero.enabled` guard in
 * `server/plugin.ts`, so a deployment with the kill switch off registers neither. Should the key be
 * unregistered anyway, `get` resolves to `undefined`, which keeps the route gated off.
 */
export const withAlertZeroEnabled =
  <P, Q, B>(handler: RequestHandler<P, Q, B>): RequestHandler<P, Q, B> =>
  async (context, request, response) => {
    const { uiSettings } = await context.core;
    const isEnabled = await uiSettings.client.get<boolean>(ALERTZERO_ENABLED_SETTING_ID);
    if (!isEnabled) {
      return response.notFound();
    }
    return handler(context, request, response);
  };
