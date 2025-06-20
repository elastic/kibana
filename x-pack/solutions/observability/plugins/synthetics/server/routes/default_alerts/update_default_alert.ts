/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefaultAlertService } from './default_alert_service';
import { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { savedObjectsAdapter } from '../../saved_objects';
import { DEFAULT_ALERT_RESPONSE } from '../../../common/types/default_alerts';

export const updateDefaultAlertingRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING,
  validate: {},
  handler: async ({
    context,
    server,
    savedObjectsClient,
    request,
  }): Promise<DEFAULT_ALERT_RESPONSE> => {
    console.log('PUT ALERTING')
    const currentSpacePromise = server.spaces?.spacesService.getActiveSpace(request);
    const defaultAlertService = new DefaultAlertService(context, server, savedObjectsClient);
    const { defaultTLSRuleEnabled, defaultStatusRuleEnabled } =
      await savedObjectsAdapter.getSyntheticsDynamicSettings(savedObjectsClient);

    const activeSpace = await currentSpacePromise;

    try {
      console.log('sending the requests to create the rules');
      const [statusRule, tlsRule] = await Promise.all([
        defaultAlertService.updateStatusRule(
          activeSpace?.id ?? 'default',
          defaultStatusRuleEnabled
        ),
        defaultAlertService.updateTlsRule(activeSpace?.id ?? 'default', defaultTLSRuleEnabled),
      ]);
      return {
        statusRule: statusRule || null,
        tlsRule: tlsRule || null,
      };
    } catch (error) {
      server.logger.error(`Error updating default alerting rules, Error: ${error.message}`, {
        error,
      });
      return {
        statusRule: null,
        tlsRule: null,
      };
    }
  },
});
