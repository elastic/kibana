/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { deleteCompositeSLOParamsSchema } from '@kbn/slo-schema';
import { COMPOSITE_SUMMARY_INDEX_NAME } from '../../../../common/constants';
import { DefaultCompositeSLORepository } from '../../../services/composite_slo_repository';
import { createSloServerRoute } from '../../create_slo_server_route';
import { assertPlatinumLicense } from '../utils/assert_platinum_license';

// TODO: move into CompositeSummaryRepository alongside the upsert added for inline summary persist on create/update
export const deleteCompositeSummaryDoc = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  id: string,
  logger: Logger
): Promise<void> => {
  try {
    await esClient.delete({ index: COMPOSITE_SUMMARY_INDEX_NAME, id: `${spaceId}:${id}` });
  } catch (err) {
    // 404 means the summary doc was never written (e.g. task hasn't run yet) — not an error
    if (err?.statusCode !== 404) {
      logger.error(`Failed to delete composite summary doc [${spaceId}:${id}]: ${err}`);
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

    const { soClient, scopedClusterClient, spaceId } = await getScopedClients({ request, logger });
    const repository = new DefaultCompositeSLORepository(soClient, logger);

    await repository.deleteById(params.path.id);
    await deleteCompositeSummaryDoc(
      scopedClusterClient.asCurrentUser,
      spaceId,
      params.path.id,
      logger
    );

    return response.noContent();
  },
});
