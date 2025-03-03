/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first } from 'lodash/fp';
import { asyncForEach } from '@kbn/std';
import { createOrUpdateIndexTemplate } from '@kbn/alerting-plugin/server';
import type { EntityAnalyticsMigrationsParams } from '../../migrations';
import type { RiskEngineConfiguration } from '../../types';
import { riskEngineConfigurationTypeName } from '../saved_object';
import {
  getIndexPatternDataStream,
  nameSpaceAwareMappingsComponentName,
} from '../../risk_score/configurations';

export const MAX_PER_PAGE = 10_000;

export const deleteRiskScoreComponent = async ({
  logger,
  getStartServices,
}: EntityAnalyticsMigrationsParams) => {
  logger.info(`Migration to to delete risk score component template  begins`);
  const [coreStart] = await getStartServices();
  const soClientKibanaUser = coreStart.savedObjects.createInternalRepository();

  // Get all installed Risk Engine Configurations
  const savedObjectsResponse = await soClientKibanaUser.find<RiskEngineConfiguration>({
    type: riskEngineConfigurationTypeName,
    perPage: MAX_PER_PAGE,
    namespaces: ['*'],
  });

  await asyncForEach(savedObjectsResponse.saved_objects, async (savedObject) => {
    const namespace = first(savedObject.namespaces);
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    if (!namespace) {
      logger.error(`Namespace is undefined for saved object ${savedObject.id}`);
      return;
    }
    const indexPatterns = getIndexPatternDataStream(namespace);

    logger.info(
      `Creating/Updating index template for namespace ${namespace} with composed_of field as ${nameSpaceAwareMappingsComponentName(
        namespace
      )}`
    );
    try {
      await createOrUpdateIndexTemplate({
        logger,
        esClient,
        template: {
          name: indexPatterns.template,
          index_patterns: [indexPatterns.alias],
          composed_of: [nameSpaceAwareMappingsComponentName(namespace)],
        },
      });
    } catch (e) {
      logger.error(`Error creating/updating index template for namespace ${namespace}: ${e}`);
      return;
    }

    logger.info(`Deleting the component template for namespace ${namespace}`);
    try {
      await esClient.cluster.deleteComponentTemplate(
        {
          name: nameSpaceAwareMappingsComponentName(namespace),
        },
        { ignore: [404] }
      );
    } catch (e) {
      logger.error(`Error deleting the component template for namespace ${namespace}: ${e}`);
    }
    logger.info(
      `Migration to delete risk score component template for namespace ${namespace} completed`
    );
  });
};
