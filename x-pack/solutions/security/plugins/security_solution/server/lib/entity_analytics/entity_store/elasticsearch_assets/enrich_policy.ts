/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EntityType } from '../../../../../common/api/entity_analytics';
import { EngineComponentResourceEnum } from '../../../../../common/api/entity_analytics';
import { getEntitiesIndexName } from '../utils';
import type { EntityEngineInstallationDescriptor } from '../installation/types';

type DefinitionMetadata = Pick<EntityEngineInstallationDescriptor, 'entityType' | 'version'> & {
  namespace: string;
};

export const getFieldRetentionEnrichPolicyName = ({
  namespace,
  entityType,
  version,
}: DefinitionMetadata): string => {
  return `entity_store_field_retention_${entityType}_${namespace}_v${version}`;
};

export const createFieldRetentionEnrichPolicy = async ({
  esClient,
  description,
  options,
}: {
  esClient: ElasticsearchClient;
  description: EntityEngineInstallationDescriptor;
  options: { namespace: string };
}) => {
  const enrichFields = description.dynamic
    ? ['*']
    : description.fields.map(({ destination }) => destination);

  return esClient.enrich.putPolicy({
    name: getFieldRetentionEnrichPolicyName({
      namespace: options.namespace,
      entityType: description.entityType,
      version: description.version,
    }),
    match: {
      indices: getEntitiesIndexName(description.entityType, options.namespace),
      match_field: description.identityField,
      enrich_fields: enrichFields,
    },
  });
};

export const executeFieldRetentionEnrichPolicy = async ({
  esClient,
  entityType,
  version,
  logger,
  options,
}: {
  entityType: EntityType;
  version: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  options: { namespace: string };
}): Promise<{ executed: boolean }> => {
  const name = getFieldRetentionEnrichPolicyName({
    namespace: options.namespace,
    entityType,
    version,
  });
  try {
    await esClient.enrich.executePolicy({ name });
    return { executed: true };
  } catch (e) {
    if (e.statusCode === 404) {
      return { executed: false };
    }
    logger.error(`Error executing field retention enrich policy for ${entityType}: ${e.message}`);
    throw e;
  }
};

export const deleteFieldRetentionEnrichPolicy = async ({
  description,
  options,
  esClient,
  logger,
  attempts = 5,
  delayMs = 2000,
}: {
  description: EntityEngineInstallationDescriptor;
  options: { namespace: string };
  esClient: ElasticsearchClient;
  logger: Logger;
  attempts?: number;
  delayMs?: number;
}) => {
  const name = getFieldRetentionEnrichPolicyName({
    namespace: options.namespace,
    entityType: description.entityType,
    version: description.version,
  });
  let currentAttempt = 1;
  while (currentAttempt <= attempts) {
    try {
      await esClient.enrich.deletePolicy({ name }, { ignore: [404] });
      return;
    } catch (e) {
      // a 429 status code indicates that the enrich policy is being executed
      if (currentAttempt === attempts || e.statusCode !== 429) {
        logger.error(
          `Error deleting enrich policy ${name}: ${e.message} after ${currentAttempt} attempts`
        );
        throw e;
      }

      logger.info(
        `Enrich policy ${name} is being executed, waiting for it to finish before deleting`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      currentAttempt++;
    }
  }
};

export const getFieldRetentionEnrichPolicyStatus = async ({
  definitionMetadata,
  esClient,
}: {
  definitionMetadata: DefinitionMetadata;
  esClient: ElasticsearchClient;
}) => {
  const name = getFieldRetentionEnrichPolicyName(definitionMetadata);
  const policy = await esClient.enrich.getPolicy({ name }, { ignore: [404] });
  const policies = policy.policies;

  return {
    installed: policies.length > 0,
    id: name,
    resource: EngineComponentResourceEnum.enrich_policy,
  };
};
