/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { isValidNamespace } from '@kbn/fleet-plugin/common';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  IngestPipelineRequest,
  RouteEntry,
} from '../../../common/security_integrations/cribl/types';
import { getRouteEntriesFromPolicyConfig } from '../../../common/security_integrations/cribl/translator';
import {
  DATA_ID_MAX_LENGTH,
  isValidDataId,
} from '../../../common/security_integrations/cribl/sanitize';
import { buildPipelineRequest } from '../../lib/security_integrations/cribl/util/pipeline_builder';
import { SECURITY_INTEGRATIONS_CRIBL_ROUTING_PIPELINE } from '../../../common/constants';

type ApiPassThroughError = Error & { apiPassThrough: boolean; statusCode?: number };

export const putCriblRoutingPipeline = async (
  esClient: ElasticsearchClient,
  policy: NewPackagePolicy,
  logger: Logger
): Promise<void> => {
  const mappings = getRouteEntriesFromPolicyConfig(policy.vars);
  validateRouteEntries(mappings);
  const pipelineConf = buildPipelineRequest(mappings);
  await createOrUpdatePipeline(esClient, pipelineConf, logger);
};

export const validateRouteEntries = (mappings: RouteEntry[]): void => {
  for (const mapping of mappings) {
    if (!isValidDataId(mapping.dataId)) {
      throw createApiPassThroughError(
        `Invalid Cribl dataId "${mapping.dataId}". Only letters, numbers, '.', '_', and '-' are allowed (max ${DATA_ID_MAX_LENGTH} characters).`,
        400
      );
    }

    if (mapping.namespace) {
      const namespaceValidation = isValidNamespace(mapping.namespace, false);
      if (!namespaceValidation.valid) {
        throw createApiPassThroughError(
          `Invalid Cribl namespace "${mapping.namespace}": ${
            namespaceValidation.error ?? 'contains invalid characters'
          }`,
          400
        );
      }
    }
  }
};

const createApiPassThroughError = (message: string, statusCode?: number): ApiPassThroughError => {
  const error = new Error(message) as ApiPassThroughError;
  error.apiPassThrough = true;
  if (statusCode !== undefined) {
    error.statusCode = statusCode;
  }
  return error;
};

const createOrUpdatePipeline = async (
  esClient: ElasticsearchClient,
  pipelineConf: IngestPipelineRequest,
  logger: Logger
): Promise<void> => {
  try {
    await esClient.transport.request({
      method: 'PUT',
      path: `_ingest/pipeline/${SECURITY_INTEGRATIONS_CRIBL_ROUTING_PIPELINE}`,
      body: pipelineConf,
    });
  } catch (e) {
    const error = transformError(e);
    logger.error(`Failed to put Cribl integration routing pipeline. error: ${error.message}`);
    throw createApiPassThroughError(
      `Failed to put Cribl integration routing pipeline: ${error.message}`,
      error.statusCode
    );
  }
};
