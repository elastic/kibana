/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefaultAlertService } from './default_alert_service';
import { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { DEFAULT_ALERT_RESPONSE } from '../../../common/types/default_alerts';
import {
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '../../../common/constants/synthetics_alerts';

export const enableDefaultAlertingRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING,
  validate: {},
  handler: async ({
    context,
    server,
    savedObjectsClient,
    request,
  }): Promise<DEFAULT_ALERT_RESPONSE> => {
    console.log('POST ALERTING');
    const activeSpace = await server.spaces?.spacesService.getActiveSpace(request);
    const defaultAlertService = new DefaultAlertService(context, server, savedObjectsClient);

    console.log('CALLING THE SERVICE TO SETUP DEFAULT ALERTS');
    console.log('ACTIVE SPACE ID: ', activeSpace?.id ?? 'default');
    const [statusRule, tlsRule] = await Promise.all([
      defaultAlertService.getExistingAlert(SYNTHETICS_STATUS_RULE),
      defaultAlertService.getExistingAlert(SYNTHETICS_TLS_RULE),
    ]);
    if (statusRule && tlsRule) {
      console.log('DEFAULT ALERTS ALREADY SETUP, RETURNING EARLY');
      return {
        statusRule,
        tlsRule,
      };
    }
    const result = defaultAlertService.setupDefaultAlerts(activeSpace?.id ?? 'default');
    console.log('HI I AM FINISHED AND IT IS HAPPY PLEASE SEND A 200');
    return result;
  },
});
