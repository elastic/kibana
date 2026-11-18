/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AcknowledgedResponseBase } from '@elastic/elasticsearch/lib/api/types';
import murmurhash from 'murmurhash';
import { retryTransientEsErrors } from './retry_transient_es_errors';

export const stopTransform = async ({
  esClient,
  logger,
  transformId,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  transformId: string;
}): Promise<AcknowledgedResponseBase> =>
  retryTransientEsErrors(
    () =>
      esClient.transform.stopTransform(
        {
          transform_id: transformId,
          wait_for_completion: true,
          force: true,
        },
        { ignore: [409, 404] }
      ),
    { logger }
  );

export const deleteTransform = ({
  esClient,
  logger,
  transformId,
  deleteData = false,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  transformId: string;
  deleteData?: boolean;
}): Promise<AcknowledgedResponseBase> =>
  retryTransientEsErrors(
    () =>
      esClient.transform.deleteTransform(
        {
          transform_id: transformId,
          force: true,
          delete_dest_index: deleteData,
        },
        { ignore: [404] }
      ),
    { logger }
  );

/** Elasticsearch transform ids are limited to 64 characters. Long space ids are hashed. */
export const getLatestTransformId = (namespace: string): string => {
  const maxTransformId = 64;
  const prefix = `risk_score_latest_transform_`;
  const fullName = `${prefix}${namespace}`;

  const processedNamespace =
    fullName.length > maxTransformId ? murmurhash.v3(namespace).toString(16) : namespace;
  return `${prefix}${processedNamespace}`;
};
