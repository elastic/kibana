/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DeprecationsDetails } from '@kbn/core-deprecations-common';
import type { GetDeprecationsContext } from '@kbn/core-deprecations-server';
import pMap from 'p-map';
import type { Space } from '@kbn/spaces-plugin/common';
import { i18n } from '@kbn/i18n';
import { CONCURRENT_SPACES_TO_CHECK, MIGRATE_RULE_DATA_SOURCE_SETTINGS_URL } from './constants';
import type { InfraPluginCoreSetup } from '../../types';

export interface RuleDataSourceDeprecationParams {
  context: GetDeprecationsContext;
  getStartServices: InfraPluginCoreSetup['getStartServices'];
}

export const getRuleDataSourceDeprecationInfo = async (
  params: RuleDataSourceDeprecationParams
): Promise<DeprecationsDetails[]> => {
  const [_, pluginStartDeps] = await params.getStartServices();

  const allAvailableSpaces = await pluginStartDeps.spaces.spacesService
    .createSpacesClient(params.context.request)
    .getAll({ purpose: 'any' });

  const deprecationPerSpaceFactory = getRuleDataSourceDeprecationInfoForSpaceFactory(params);

  const results = await pMap(allAvailableSpaces, deprecationPerSpaceFactory, {
    concurrency: CONCURRENT_SPACES_TO_CHECK, // limit the number of spaces handled concurrently to make sure that we cover large deployments
  });

  const offendingSpaces = results.filter(Boolean) as string[];

  if (offendingSpaces.length) {
    const shortList =
      offendingSpaces.length < 4
        ? offendingSpaces.join(', ')
        : `${offendingSpaces.slice(0, 3).join(', ')}, ...`;
    const fullList = offendingSpaces.join(', ');
    return [
      {
        title: i18n.translate(
          'xpack.infra.deprecations.migrateInfraRuleDataSourceSetttings.title',
          {
            defaultMessage:
              'Log/Inventory/Metric threshold rules data source settings in {count} spaces: {shortList}',
            values: { count: offendingSpaces.length, shortList },
          }
        ),
        level: 'critical',
        deprecationType: 'feature',
        message: i18n.translate(
          'xpack.infra.deprecations.migrateInfraRuleDataSourceSetttings.message',
          {
            defaultMessage:
              'Metric indices previously provided via Infra app settings and Log indices previously provided via Kibana advanced settings are now deprecated. Please migrate to using "Log Threshold Alerting Rule Source" and "Inventory and Metric Threshold Alerting Rule Source" data views in each of the following spaces: {fullList}.',
            values: { fullList },
          }
        ),
        correctiveActions: {
          manualSteps: offendingSpaces.map((spaceName) =>
            i18n.translate(
              'xpack.infra.deprecations.migrateInfraRuleDataSourceSetttings.message.manualStepMessage',
              {
                defaultMessage:
                  'While in the space "{spaceName}" 1) update the index pattern in "Log Threshold Alerting Rule Source" data view to match the Log indices previously provided via Kibana advanced setting and 2) update the index pattern in "Inventory and Metric Threshold Alerting Rule Source" data view to match the Metric Indices previously provided via the Infra app settings.',
                values: { spaceName },
              }
            )
          ),
          api: {
            method: 'PUT',
            path: MIGRATE_RULE_DATA_SOURCE_SETTINGS_URL,
          },
        },
      },
    ];
  } else {
    return [];
  }
};

export const getRuleDataSourceDeprecationInfoForSpaceFactory = ({
  getStartServices,
  context,
}: RuleDataSourceDeprecationParams): ((space: Space) => Promise<string | undefined>) => {
  return async (space) => {
    const [_, pluginStartDeps] = await getStartServices();

    // Get a new Saved Object Client scoped to the space.id
    const spaceScopedSavedObjectsClient = context.savedObjectsClient.asScopedToNamespace(space.id);

    const dataViewsService = await pluginStartDeps.dataViews.dataViewsServiceFactory(
      spaceScopedSavedObjectsClient,
      context.esClient.asCurrentUser,
      undefined,
      true
    );

    const logRulesDataViewExists = await dataViewsService
      .get(`log_rules_data_view_${space.id}`)
      .catch(() => false);
    const infraRulesDataViewExists = await dataViewsService
      .get(`infra_rules_data_view_${space.id}`)
      .catch(() => false);

    if (!logRulesDataViewExists || !infraRulesDataViewExists) {
      return space.name;
    }
  };
};
