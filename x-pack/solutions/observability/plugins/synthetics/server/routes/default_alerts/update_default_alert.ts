/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type IKibanaResponse } from '@kbn/core/server';
import { LockAcquisitionError } from '@kbn/lock-manager';
import { getSyntheticsDynamicSettings } from '../../saved_objects/synthetics_settings';
import { DefaultAlertService } from './default_alert_service';
import type { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import type { DEFAULT_ALERT_RESPONSE } from '../../../common/types/default_alerts';

export const updateDefaultAlertingRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING,
  validate: {},
  handler: async ({
    context,
    server,
    savedObjectsClient,
    request,
    response,
  }): Promise<DEFAULT_ALERT_RESPONSE | IKibanaResponse<{}>> => {
    const currentSpacePromise = server.spaces?.spacesService.getActiveSpace(request);
    const defaultAlertService = new DefaultAlertService(context, server, savedObjectsClient);
    const { defaultTLSRuleEnabled, defaultStatusRuleEnabled } = await getSyntheticsDynamicSettings(
      savedObjectsClient
    );

    const activeSpace = await currentSpacePromise;

    try {
      const [statusRule, tlsRule] = await defaultAlertService.updateDefaultRules(
        activeSpace?.id ?? 'default',
        defaultStatusRuleEnabled,
        defaultTLSRuleEnabled
      );
      return {
        statusRule: statusRule || null,
        tlsRule: tlsRule || null,
      };
    } catch (error) {
      if (error instanceof LockAcquisitionError) {
        const message = 'Simultaneous request to update default Synthetics rules';
        server.logger.error(message, { error });
        return response.conflict({
          body: {
            message,
          },
        });
      }
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
