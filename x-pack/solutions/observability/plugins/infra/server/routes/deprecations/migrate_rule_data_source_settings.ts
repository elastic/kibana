/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { DEFAULT_LOG_VIEW } from '@kbn/logs-shared-plugin/common';
import { CONCURRENT_SPACES_TO_CHECK, MIGRATE_RULE_DATA_SOURCE_SETTINGS_URL } from './constants';
import type { InfraBackendLibs } from '../../lib/infra_types';

// This route facilitates automated one-click handling of creating data views with the
// index pattern from Infra app settings and Kibana advanced setting as part of the Upgrade Assistant.
export const initMigrateRuleDataSourceSettingsRoute = ({
  framework,
  getStartServices,
  plugins,
}: InfraBackendLibs) => {
  framework.router.put(
    {
      path: MIGRATE_RULE_DATA_SOURCE_SETTINGS_URL,
      validate: false,
      security: {
        authz: {
          enabled: false,
          reason:
            'This API delegates security to the currently logged in user and their permissions.',
        },
      },
    },
    async (context, request, response) => {
      try {
        const { elasticsearch, savedObjects } = await context.core;
        const [_, pluginStartDeps] = await getStartServices();

        const allAvailableSpaces = await pluginStartDeps.spaces.spacesService
          .createSpacesClient(request)
          .getAll({ purpose: 'any' });

        const updated = await pMap(
          allAvailableSpaces,
          async (space) => {
            const spaceScopedSavedObjectsClient = savedObjects.client.asScopedToNamespace(space.id);

            const dataViewsService = await pluginStartDeps.dataViews.dataViewsServiceFactory(
              spaceScopedSavedObjectsClient,
              elasticsearch.client.asCurrentUser,
              request,
              true
            );

            const LOG_RULES_DATA_VIEW_ID = `log_rules_data_view_${space.id}`;
            const LOG_RULES_DATA_VIEW_NAME = 'Log Threshold Alerting Rule Source';

            const override = false;
            const skipFetchFields = false;
            const displayErrors = true;
            const setAsDefault = false;

            const logDataViewExists = await dataViewsService
              .get(LOG_RULES_DATA_VIEW_ID)
              .catch(() => false);

            if (logDataViewExists) {
              return false;
            }

            // get log indices
            const logSourcesService =
              pluginStartDeps.logsDataAccess.services.logSourcesServiceFactory.getLogSourcesService(
                spaceScopedSavedObjectsClient
              );

            const { indices: logIndices, timestampField } =
              await pluginStartDeps.logsShared.logViews
                .getClient(
                  spaceScopedSavedObjectsClient,
                  elasticsearch.client.asCurrentUser,
                  logSourcesService
                )
                .getResolvedLogView(DEFAULT_LOG_VIEW);

            // create default data view for Log threshold rules
            if (!logDataViewExists) {
              await dataViewsService.createAndSave(
                {
                  allowNoIndex: false,
                  name: LOG_RULES_DATA_VIEW_NAME,
                  title: logIndices,
                  id: LOG_RULES_DATA_VIEW_ID,
                  timeFieldName: timestampField,
                  namespaces: [space.id],
                },
                override,
                skipFetchFields,
                displayErrors,
                setAsDefault
              );
            }

            const METRIC_RULES_DATA_VIEW_ID = `infra_rules_data_view_${space.id}`;
            const METRIC_RULES_DATA_VIEW_NAME =
              'Metric AND Inventory Threshold Alerting Rule Source';

            // get metric indices
            const metricsClient = plugins.metricsDataAccess.setup.client;
            const metricIndices = await metricsClient.getMetricIndices({
              savedObjectsClient: spaceScopedSavedObjectsClient,
            });

            // create default data view for Metric and Inventory threshold rules
            const metricDataViewExists = await dataViewsService
              .get(METRIC_RULES_DATA_VIEW_ID)
              .catch(() => false);

            if (!metricDataViewExists) {
              await dataViewsService.createAndSave(
                {
                  allowNoIndex: false,
                  name: METRIC_RULES_DATA_VIEW_NAME,
                  title: metricIndices,
                  id: METRIC_RULES_DATA_VIEW_ID,
                  timeFieldName: '@timestamp',
                },
                override,
                skipFetchFields,
                displayErrors,
                setAsDefault
              );
            }

            return true;
          },
          { concurrency: CONCURRENT_SPACES_TO_CHECK }
        );

        if (!updated.includes(true)) {
          // Only throw if none of the spaces was able to migrate
          return response.customError({
            body: new Error('Unable to migrate rule data source settings.'),
            statusCode: 400,
          });
        }

        return response.ok();
      } catch (error) {
        throw error;
      }
    }
  );
};
