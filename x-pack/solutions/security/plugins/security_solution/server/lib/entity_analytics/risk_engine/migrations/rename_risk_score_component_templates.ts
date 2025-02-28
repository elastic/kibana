/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncForEach } from '@kbn/std';
import { first } from 'lodash/fp';
import type { EntityAnalyticsMigrationsParams } from '../../migrations';
import { RiskScoreDataClient } from '../../risk_score/risk_score_data_client';
import type { RiskEngineConfiguration } from '../../types';
import { riskEngineConfigurationTypeName } from '../saved_object';
import { buildScopedInternalSavedObjectsClientUnsafe } from '../../risk_score/tasks/helpers';
import { mappingComponentName } from '../../risk_score/configurations';

export const MAX_PER_PAGE = 10_000;

/**
 * This migration renames the Risk Score component templates to include the namespace in the name.
 *
 * To achieve that it needs to update the Index template and delete the old component template.
 */
export const renameRiskScoreComponentTemplate = async ({
  auditLogger,
  logger,
  getStartServices,
  kibanaVersion,
}: EntityAnalyticsMigrationsParams) => {
  const [coreStart] = await getStartServices();
  const soClientKibanaUser = coreStart.savedObjects.createInternalRepository();
  const esClient = coreStart.elasticsearch.client.asInternalUser;

  // Check if there are any existing component templates with the namespace in the name
  const oldComponentTemplateExists = await esClient.cluster.existsComponentTemplate({
    name: mappingComponentName,
  });

  if (!oldComponentTemplateExists) {
    return;
  }

  // Get all installed Risk Engine Configurations
  const savedObjectsResponse = await soClientKibanaUser.find<RiskEngineConfiguration>({
    type: riskEngineConfigurationTypeName,
    perPage: MAX_PER_PAGE,
    namespaces: ['*'],
  });

  await asyncForEach(savedObjectsResponse.saved_objects, async (savedObject) => {
    const namespace = first(savedObject.namespaces); // We install one Risk Engine Configuration object per space

    if (!namespace) {
      logger.error('Unexpected saved object. Risk Score saved objects must have a namespace');
      return;
    }

    logger.info(`Starting Risk Score component template migration on namespace ${namespace}`);

    const soClient = buildScopedInternalSavedObjectsClientUnsafe({ coreStart, namespace });

    const riskScoreDataClient = new RiskScoreDataClient({
      logger,
      kibanaVersion,
      esClient,
      namespace,
      soClient,
      auditLogger,
    });

    await riskScoreDataClient.createOrUpdateRiskScoreComponentTemplate();
    await riskScoreDataClient.createOrUpdateRiskScoreIndexTemplate();

    logger.debug(`Risk score component template migration ran on namespace ${namespace}`);
  });

  // Delete the legacy component template without the namespace in the name
  await esClient.cluster.deleteComponentTemplate(
    {
      name: mappingComponentName,
    },
    { ignore: [404] }
  );
};
