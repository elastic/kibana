/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsMigrationsParams } from '../../migrations';
import { RiskScoreDataClient } from '../../risk_score/risk_score_data_client';
import type { RiskEngineConfiguration } from '../../types';
import { riskEngineConfigurationTypeName } from '../saved_object';
import { buildScopedInternalSavedObjectsClientUnsafe } from '../../risk_score/tasks/helpers';
import { mappingComponentName } from '../../risk_score/configurations';

export const MAX_PER_PAGE = 10_000;

/**
 * This migration renames the Risk Score component templates to include the namespace in the name. Before 8.18 all spaces used the `.risk-score-mappings` component template, we now use `.risk-score-mappings-<spacename>`.
 *
 * The migration creates the new component template and updates the index template for each space, then finally deletes the old component template.
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

  // Check if the legacy component templates (without the namespace in the name) exists
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

  const settledPromises = await Promise.allSettled(
    savedObjectsResponse.saved_objects.map(async (savedObject) => {
      const namespace = savedObject.namespaces?.[0]; // We need to create one component template per space

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
    })
  );

  const rejectedPromises = settledPromises.filter(
    (promise) => promise.status === 'rejected'
  ) as PromiseRejectedResult[];

  // Migration successfully ran on all spaces
  if (rejectedPromises.length === 0) {
    // Delete the legacy component template without the namespace in the name
    await esClient.cluster.deleteComponentTemplate(
      {
        name: mappingComponentName,
      },
      { ignore: [404] }
    );
  } else {
    const errorMessages = rejectedPromises.map((promise) => promise.reason?.message).join('\n');
    throw new Error(
      `Risk Score component template migration failed with errors: \n${errorMessages}`
    );
  }
};
