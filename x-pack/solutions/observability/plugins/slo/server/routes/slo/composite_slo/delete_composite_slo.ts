/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { deleteCompositeSLOParamsSchema } from '@kbn/slo-schema';
import { COMPOSITE_SUMMARY_INDEX_NAME } from '../../../../common/constants';
import { buildCompositeSloSummaryDocId } from '../../../services/composites/composite_slo_summary_index';
import { retryTransientEsErrors } from '../../../utils/retry';
import { createSloServerRoute } from '../../create_slo_server_route';
import { assertPlatinumLicense } from '../utils/assert_platinum_license';

// TODO: move into CompositeSummaryRepository alongside the upsert added for inline summary persist on create/update
export const deleteCompositeSummaryDoc = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  id: string,
  logger: Logger
): Promise<void> => {
  const docId = buildCompositeSloSummaryDocId(spaceId, id);
  try {
    await retryTransientEsErrors(
      () =>
        esClient.delete({
          index: COMPOSITE_SUMMARY_INDEX_NAME,
          id: docId,
          refresh: true,
        }),
      { logger }
    );
  } catch (err) {
    // 404 means the summary doc was never written (e.g. task hasn't run yet) — not an error
    if (err?.statusCode !== 404) {
      logger.debug(`Failed to delete composite summary doc [${docId}]: ${err}`);
    }
  }
};

export const deleteCompositeSLORoute = createSloServerRoute({
  endpoint: 'DELETE /api/observability/slo_composites/{id} 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: deleteCompositeSLOParamsSchema,
  handler: async ({ response, params, logger, request, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);

    const { scopedClusterClient, compositeSloRepository, spaceId } = await getScopedClients({
      request,
      logger,
    });

    await compositeSloRepository.deleteById(params.path.id);
    await deleteCompositeSummaryDoc(
      scopedClusterClient.asCurrentUser,
      spaceId,
      params.path.id,
      logger
    );

    return response.noContent();
  },
});
