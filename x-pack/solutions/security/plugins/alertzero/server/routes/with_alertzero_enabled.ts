/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { ALERTZERO_ENABLED_SETTING_ID } from '@kbn/alertzero-common';
import type { AlertZeroRequestHandlerContext } from '../types';

/**
 * Gates an AlertZero route on subscription eligibility and the per-space `securitySolution:enableAlertZero` advanced setting.
 * While the setting is off the route 404s as if it had never been registered.
 *
 * The setting is registered next to the routes, inside the `xpack.alertzero.enabled` guard in
 * `server/plugin.ts`, so a deployment with the kill switch off registers neither. Should the key be
 * unregistered anyway, `get` resolves to `undefined`, which keeps the route gated off.
 */
export const withAlertZeroEnabled =
  <Params, Query, Body>(
    handler: RequestHandler<Params, Query, Body, AlertZeroRequestHandlerContext>
  ): RequestHandler<Params, Query, Body, AlertZeroRequestHandlerContext> =>
  async (context, request, response) => {
    const { uiSettings } = await context.core;
    const isEnabled = await uiSettings.client.get<boolean>(ALERTZERO_ENABLED_SETTING_ID);
    if (!isEnabled) {
      return response.notFound();
    }
    const { subscription, hasRequiredDependencies } = await context.alertzero;
    if (subscription !== 'available') {
      return response.forbidden({
        body: {
          message:
            subscription === 'serverless_tier'
              ? i18n.translate('xpack.alertzero.availability.tierErrorMessage', {
                  defaultMessage: 'AlertZero requires the Security Complete subscription.',
                })
              : i18n.translate('xpack.alertzero.availability.licenseErrorMessage', {
                  defaultMessage: 'AlertZero requires an active Enterprise license.',
                }),
        },
      });
    }
    if (!hasRequiredDependencies) {
      return response.customError({
        statusCode: 503,
        body: { message: 'AlertZero dependencies are unavailable.' },
      });
    }
    return handler(context, request, response);
  };
