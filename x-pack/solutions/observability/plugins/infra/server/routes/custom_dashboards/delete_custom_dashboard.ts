/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import { InfraDeleteCustomDashboardsRequestParamsRT } from '../../../common/http_api/custom_dashboards_api';
import { KibanaFramework } from '../../lib/adapters/framework/kibana_framework_adapter';
import { handleRouteErrors } from '../../utils/handle_route_errors';
import { checkCustomDashboardsEnabled } from './lib/check_custom_dashboards_enabled';
import { deleteCustomDashboard } from './lib/delete_custom_dashboard';

export function initDeleteCustomDashboardRoute(framework: KibanaFramework) {
  const validateParams = createRouteValidationFunction(InfraDeleteCustomDashboardsRequestParamsRT);

  framework.registerRoute(
    {
      method: 'delete',
      path: '/api/infra/{assetType}/custom-dashboards/{id}',
      validate: {
        params: validateParams,
      },
      options: {
        access: 'internal',
      },
    },
    handleRouteErrors(async (context, request, response) => {
      const { savedObjectsClient, uiSettingsClient } = await context.infra;

      await checkCustomDashboardsEnabled(uiSettingsClient);

      const { id } = request.params;

      await deleteCustomDashboard({
        savedObjectsClient,
        savedObjectId: id,
      });

      return response.ok({
        body: id,
      });
    })
  );
}
