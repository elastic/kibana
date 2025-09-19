/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LockAcquisitionError } from '@kbn/lock-manager';
import type { IKibanaResponse } from '@kbn/core/server';
import { DefaultRuleService } from './default_alert_service';
import type { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import type { DEFAULT_ALERT_RESPONSE } from '../../../common/types/default_alerts';
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
    response,
    spaceId,
  }): Promise<DEFAULT_ALERT_RESPONSE | IKibanaResponse<{}>> => {
    try {
      const defaultAlertService = new DefaultRuleService(context, server, savedObjectsClient);

      const [statusRule, tlsRule] = await Promise.all([
        defaultAlertService.getExistingRule(SYNTHETICS_STATUS_RULE),
        defaultAlertService.getExistingRule(SYNTHETICS_TLS_RULE),
      ]);
      if (statusRule && tlsRule) {
        return {
          statusRule,
          tlsRule,
        };
      }
      // do not delete this `await`, or we will skip the custom exception handling
      const result = await defaultAlertService.setupDefaultRules(spaceId);
      return result;
    } catch (error) {
      if (error instanceof LockAcquisitionError) {
        return response.conflict({
          body: {
            message: `Another process is already modifying the default rules.`,
          },
        });
      }
      throw error;
    }
  },
});
