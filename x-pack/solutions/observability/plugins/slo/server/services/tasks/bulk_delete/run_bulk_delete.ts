/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import {
  SLI_DESTINATION_INDEX_PATTERN,
  SUMMARY_DESTINATION_INDEX_PATTERN,
  getSLOSummaryTransformId,
  getSLOTransformId,
  getWildcardPipelineId,
} from '../../../../common/constants';
import { retryTransientEsErrors } from '../../../utils/retry';
import { KibanaSavedObjectsSLORepository } from '../../slo_repository';

interface Dependencies {
  internalEsClient: ElasticsearchClient;
  logger: Logger;
  internalSoClient: SavedObjectsClientContract;
  abortController: AbortController;
  request: KibanaRequest;
}

async function waitFor(time: number) {
  return new Promise((resolve) => setTimeout(() => resolve(1), time));
}

export async function runBulkDelete(
  params: { list: string[] },
  { internalEsClient, internalSoClient, logger, abortController, request }: Dependencies
) {
  // main problem to figure out: we only have the esClient internal user.
  logger.info(`running bulk deletion: ${params.list}`);

  await waitFor(20000);

  const repository = new KibanaSavedObjectsSLORepository(internalSoClient, logger);

  // handle loop
  const slo = await repository.findById(params.list[0]).catch((err) => undefined);
  if (!slo) {
    return;
  }

  // handle requests parallelism
  await retryTransientEsErrors(
    () =>
      internalEsClient.transform.deleteTransform(
        { transform_id: getSLOTransformId(slo.id, slo.revision), force: true },
        { ignore: [404] }
      ),
    { logger }
  );

  await retryTransientEsErrors(
    () =>
      internalEsClient.transform.deleteTransform(
        { transform_id: getSLOSummaryTransformId(slo.id, slo.revision), force: true },
        { ignore: [404] }
      ),
    { logger }
  );

  await retryTransientEsErrors(() =>
    internalEsClient.ingest.deletePipeline(
      { id: getWildcardPipelineId(slo.id, slo.revision) },
      { ignore: [404] }
    )
  );

  await repository.deleteById(slo.id);

  // I think we should craft one delete_by_query for all SLO ids
  await internalEsClient.deleteByQuery({
    index: SLI_DESTINATION_INDEX_PATTERN,
    wait_for_completion: false,
    conflicts: 'proceed',
    slices: 'auto',
    query: {
      bool: {
        filter: {
          term: {
            'slo.id': slo.id,
          },
        },
      },
    },
  });

  // I think we should craft one delete_by_query for all SLO ids
  await internalEsClient.deleteByQuery({
    index: SUMMARY_DESTINATION_INDEX_PATTERN,
    refresh: false,
    wait_for_completion: false,
    conflicts: 'proceed',
    slices: 'auto',
    query: {
      bool: {
        filter: {
          term: {
            'slo.id': slo.id,
          },
        },
      },
    },
  });

  // bulk remove for all slo id at once
  // rules client is tied to a request... need to investigate
  // await rulesClient.bulkDeleteRules({
  //   filter: `alert.attributes.params.sloId:${slo.id}`,
  // });

  logger.info(`completed bulk deletion: ${params.list}`);

  return;
}
