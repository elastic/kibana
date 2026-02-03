/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { transformError } from '@kbn/securitysolution-es-utils';
import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';
import {
  CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_ALIAS,
  CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_LATEST,
} from '@kbn/cloud-security-posture-common';
import {
  latestFindingsTransform,
  DEPRECATED_FINDINGS_TRANSFORMS_VERSION,
  CURRENT_FINDINGS_TRANSFORM_VERSION,
} from './latest_findings_transform';
import {
  latestVulnerabilitiesTransform,
  DEPRECATED_VULN_TRANSFORM_VERSIONS,
} from './latest_vulnerabilities_transforms';

// TODO: Move transforms to integration package
export const initializeCspTransforms = async (
  esClient: ElasticsearchClient,
  latestFindingsIndexAutoCreated: boolean,
  logger: Logger
): Promise<void> => {
  // Deletes old assets from previous versions as part of upgrade process
  await deletePreviousTransformsVersions(esClient, latestFindingsIndexAutoCreated, logger);
  if (!latestFindingsIndexAutoCreated) {
    await initializeTransform(esClient, latestFindingsTransform, logger);
  }
  await initializeTransform(esClient, latestVulnerabilitiesTransform, logger);
};

export const initializeTransform = async (
  esClient: ElasticsearchClient,
  transform: TransformPutTransformRequest,
  logger: Logger
) => {
  const success = await createTransformIfNotExists(esClient, transform, logger);
  if (success) {
    // Create alias for vulnerabilities transform
    if (transform.transform_id.includes('vulnerabilities_latest')) {
      await createVulnerabilitiesIndexAlias(esClient, logger);
    }
    await startTransformIfNotStarted(esClient, transform.transform_id, logger);
  }
};

/**
 * Checks if a transform exists, And if not creates it
 *
 * @param transform - the transform to create. If a transform with the same transform_id already exists, nothing is created or updated.
 *
 * @return true if the transform exits or created, false otherwise.
 */
export const createTransformIfNotExists = async (
  esClient: ElasticsearchClient,
  transform: TransformPutTransformRequest,
  logger: Logger
) => {
  try {
    await esClient.transform.getTransform({
      transform_id: transform.transform_id,
    });
    return true;
  } catch (existErr) {
    const existError = transformError(existErr);
    if (existError.statusCode === 404) {
      try {
        await esClient.transform.putTransform(transform);
        return true;
      } catch (createErr) {
        const createError = transformError(createErr);
        logger.error(
          `Failed to create transform ${transform.transform_id}: ${createError.message}`
        );
      }
    } else {
      logger.error(
        `Failed to check if transform ${transform.transform_id} exists: ${existError.message}`
      );
    }
  }
  return false;
};

export const startTransformIfNotStarted = async (
  esClient: ElasticsearchClient,
  transformId: string,
  logger: Logger
) => {
  try {
    const transformStats = await esClient.transform.getTransformStats({
      transform_id: transformId,
    });

    if (transformStats.count <= 0) {
      logger.error(`Failed starting transform ${transformId}: couldn't find transform`);
      return;
    }

    const fetchedTransformStats = transformStats.transforms[0];

    // trying to restart the transform in case it comes to a full stop or failure
    if (fetchedTransformStats.state === 'stopped' || fetchedTransformStats.state === 'failed') {
      try {
        return await esClient.transform.startTransform({ transform_id: transformId });
      } catch (startErr) {
        const startError = transformError(startErr);
        logger.error(
          `Failed to start transform ${transformId}. Transform State: Transform State: ${fetchedTransformStats.state}. Error: ${startError.message}`
        );
      }
    }

    if (fetchedTransformStats.state === 'stopping' || fetchedTransformStats.state === 'aborting') {
      logger.error(
        `Not starting transform ${transformId} since it's state is: ${fetchedTransformStats.state}`
      );
    }
  } catch (statsErr) {
    const statsError = transformError(statsErr);
    logger.error(`Failed to check if transform ${transformId} is started: ${statsError.message}`);
  }
};

/**
 * Creates an alias for the vulnerabilities index
 * This allows queries to use the alias instead of the versioned index
 */
export const createVulnerabilitiesIndexAlias = async (
  esClient: ElasticsearchClient,
  logger: Logger
) => {
  try {
    // Check if the versioned index exists
    const indexExists = await esClient.indices.exists({
      index: CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_LATEST,
    });

    if (!indexExists) {
      logger.debug(
        `Index ${CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_LATEST} does not exist yet, skipping alias creation`
      );
      return;
    }

    // Check if alias already exists
    const aliasExists = await esClient.indices.existsAlias({
      name: CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_ALIAS,
    });

    if (aliasExists) {
      logger.debug(
        `Alias ${CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_ALIAS} already exists, skipping alias creation`
      );
      return;
    }

    // Create the alias
    await esClient.indices.updateAliases({
      actions: [
        {
          add: {
            index: CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_LATEST,
            alias: CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_ALIAS,
          },
        },
      ],
    });

    logger.info(
      `Created alias ${CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_ALIAS} for index ${CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_LATEST}`
    );
  } catch (err) {
    const error = transformError(err);
    logger.error(
      `Failed to create alias ${CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_ALIAS}: ${error.message}`
    );
  }
};

export const deletePreviousTransformsVersions = async (
  esClient: ElasticsearchClient,
  isIntegrationVersionIncludesTransformAsset: boolean,
  logger: Logger
) => {
  let deprecatedTransforms = [
    ...DEPRECATED_FINDINGS_TRANSFORMS_VERSION,
    ...DEPRECATED_VULN_TRANSFORM_VERSIONS,
  ];

  if (isIntegrationVersionIncludesTransformAsset) {
    deprecatedTransforms = [...deprecatedTransforms, CURRENT_FINDINGS_TRANSFORM_VERSION];
  }
  for (const transform of deprecatedTransforms) {
    const response = await deleteTransformSafe(esClient, logger, transform);
    if (response) return;
  }
};

const deleteTransformSafe = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  name: string
): Promise<boolean> => {
  try {
    await esClient.transform.deleteTransform({ transform_id: name, force: true });
    logger.info(`Deleted transform successfully [Name: ${name}]`);
    return true;
  } catch (e) {
    if (e instanceof errors.ResponseError && e.statusCode === 404) {
      logger.trace(`Transform not exists [Name: ${name}]`);
      return false;
    } else {
      logger.error(`Failed to delete transform [Name: ${name}]`);
      logger.error(e);
      return false;
    }
  }
};
