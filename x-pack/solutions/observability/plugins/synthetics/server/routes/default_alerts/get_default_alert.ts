/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '../../../common/constants/synthetics_alerts';
import { DefaultAlertService } from './default_alert_service';
import { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { DEFAULT_ALERT_RESPONSE } from '../../../common/types/default_alerts';

export const getDefaultAlertingRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING,
  validate: {},
  handler: async ({ context, server, savedObjectsClient }): Promise<DEFAULT_ALERT_RESPONSE> => {
    const defaultAlertService = new DefaultAlertService(context, server, savedObjectsClient);
    const statusRule = defaultAlertService.getExistingAlert(SYNTHETICS_STATUS_RULE);
    const tlsRule = defaultAlertService.getExistingAlert(SYNTHETICS_TLS_RULE);
    const [status, tls] = await Promise.all([statusRule, tlsRule]);
    return {
      statusRule: status || null,
      tlsRule: tls || null,
    };
  },
});
