/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from '../../../utils/stringify';
import type { EndpointAppContextService } from '../../../endpoint_app_context_services';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../../common/endpoint/constants';
import { ResponseActionsClientError } from '../clients/errors';
import { catchAndWrapError } from '../../../utils';

export const ensureActionRequestsIndexIsConfigured = async (
  endpointService: EndpointAppContextService
): Promise<void> => {
  const logger = endpointService.createLogger('ensureActionRequestsIndexIsConfigured');
  const esClient = endpointService.getInternalEsClient();
  const isSpacesEnabled =
    endpointService.experimentalFeatures.endpointManagementSpaceAwarenessEnabled;
  const COMPONENT_TEMPLATE_NAME = '.logs-endpoint.actions@package';

  logger.debug(`Checking setup of index [${ENDPOINT_ACTIONS_INDEX}]`);

  await esClient.indices.createDataStream({ name: ENDPOINT_ACTIONS_INDEX }).catch((error) => {
    // Ignore error if the index already exists
    if (error.body?.error?.type !== 'resource_already_exists_exception') {
      throw new ResponseActionsClientError(
        `Attempt to create index [${ENDPOINT_ACTIONS_INDEX}] failed with: ${error.message}`,
        error
      );
    }

    logger.debug(`Index for [${ENDPOINT_ACTIONS_INDEX}] already exists`);
  });

  if (isSpacesEnabled) {
    logger.debug(
      `Checking field mappings for index [${ENDPOINT_ACTIONS_INDEX}] in support of space awareness`
    );

    const agentPolicyMapping = await esClient.indices
      .getFieldMapping({
        index: ENDPOINT_ACTIONS_INDEX,
        fields: 'agent.policy.integrationPolicyId',
      })
      .catch(catchAndWrapError);

    logger.debug(
      () =>
        `Index [${ENDPOINT_ACTIONS_INDEX}] existing mapping for [agent.policy.integrationPolicyId]: ${stringify(
          agentPolicyMapping
        )}`
    );

    const backingIndexName = Object.keys(agentPolicyMapping)[0];

    if (!agentPolicyMapping[backingIndexName].mappings['agent.policy.integrationPolicyId']) {
      logger.debug(
        `adding mappings to index [${ENDPOINT_ACTIONS_INDEX}] - Endpoint package v9.1.x not yet installed`
      );

      await esClient.indices
        .putMapping({
          index: ENDPOINT_ACTIONS_INDEX,
          properties: {
            originSpaceId: { type: 'keyword', ignore_above: 1024 },
            agent: {
              properties: {
                policy: {
                  properties: {
                    agentId: { type: 'keyword', ignore_above: 1024 },
                    elasticAgentId: { type: 'keyword', ignore_above: 1024 },
                    integrationPolicyId: { type: 'keyword', ignore_above: 1024 },
                    agentPolicyId: { type: 'keyword', ignore_above: 1024 },
                  },
                },
              },
            },
          },
        })
        .catch(catchAndWrapError);

      logger.info(
        `Index [${ENDPOINT_ACTIONS_INDEX}] was updated with new field mappings in support of space awareness`
      );
    } else {
      logger.debug(
        `Nothing to do - index [${ENDPOINT_ACTIONS_INDEX}] already has required mappings in support of space awareness`
      );
    }

    const componentTemplateExits = await esClient.cluster
      .existsComponentTemplate({ name: COMPONENT_TEMPLATE_NAME })
      .catch(catchAndWrapError);

    if (componentTemplateExits) {
      logger.debug(
        `Checking component template [${COMPONENT_TEMPLATE_NAME}] to ensure it has required mappings`
      );

      const currentComponentTemplate = await esClient.cluster.getComponentTemplate({
        name: COMPONENT_TEMPLATE_NAME,
      });

      logger.debug(() => `current component template: ${stringify(currentComponentTemplate, 15)}`);

      const componentMappings =
        currentComponentTemplate.component_templates[0]?.component_template.template.mappings;

      if (
        componentMappings &&
        componentMappings.properties &&
        !componentMappings.properties.originSpaceId
      ) {
        logger.debug(`Adding mappings to component template [${COMPONENT_TEMPLATE_NAME}]`);

        componentMappings.properties.originSpaceId = { type: 'keyword', ignore_above: 1024 };

        if (
          componentMappings.properties.agent &&
          'properties' in componentMappings.properties.agent
        ) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          componentMappings.properties.agent.properties!.policy = {
            properties: {
              agentId: {
                type: 'keyword',
                ignore_above: 1024,
              },
              elasticAgentId: {
                type: 'keyword',
                ignore_above: 1024,
              },
              integrationPolicyId: {
                type: 'keyword',
                ignore_above: 1024,
              },
              agentPolicyId: {
                type: 'keyword',
                ignore_above: 1024,
              },
            },
          };
        }

        logger.debug(
          () =>
            `Updating component template [${COMPONENT_TEMPLATE_NAME}] with:${stringify(
              currentComponentTemplate,
              15
            )}`
        );

        await esClient.cluster
          .putComponentTemplate({
            name: COMPONENT_TEMPLATE_NAME,
            template: { mappings: componentMappings },
          })
          .catch(catchAndWrapError);

        logger.info(
          `Component template [${COMPONENT_TEMPLATE_NAME}] was updated with mappings in support of space awareness`
        );
      }
    } else {
      logger.debug(
        `Component template [${COMPONENT_TEMPLATE_NAME}] does not exist. Nothing to check`
      );
    }
  }

  logger.debug(`Checking of index [${ENDPOINT_ACTIONS_INDEX}] done.`);
};
