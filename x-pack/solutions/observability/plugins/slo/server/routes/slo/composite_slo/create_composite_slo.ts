/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CompositeSLOMember } from '@kbn/slo-schema';
import { createCompositeSLOParamsSchema } from '@kbn/slo-schema';
import { v4 as uuidv4 } from 'uuid';
import { IllegalArgumentError } from '../../../errors';
import { DefaultBurnRatesClient } from '../../../services/burn_rates_client';
import { persistCompositeSummaryDoc } from '../../../services/composite_summary_writer';
import { DefaultSummaryClient } from '../../../services/summary_client';
import { createSloServerRoute } from '../../create_slo_server_route';
import { assertPlatinumLicense } from '../utils/assert_platinum_license';

const MIN_MEMBERS = 2;
const MAX_MEMBERS = 25;

export const validateCompositeSloMembers = (members: CompositeSLOMember[]): void => {
  if (members.length < MIN_MEMBERS) {
    throw new IllegalArgumentError(
      `A composite SLO requires at least ${MIN_MEMBERS} members, got ${members.length}`
    );
  }
  if (members.length > MAX_MEMBERS) {
    throw new IllegalArgumentError(
      `A composite SLO supports at most ${MAX_MEMBERS} members, got ${members.length}`
    );
  }
  for (const member of members) {
    if (!Number.isInteger(member.weight) || member.weight <= 0) {
      throw new IllegalArgumentError(
        `Member weight must be a positive integer, got ${member.weight} for SLO [${member.sloId}]`
      );
    }
  }
};

export const createCompositeSLORoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slo_composites 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: createCompositeSLOParamsSchema,
  handler: async ({ context, params, logger, request, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);

    validateCompositeSloMembers(params.body.members);

    const { scopedClusterClient, repository, compositeSloRepository, spaceId } =
      await getScopedClients({
        request,
        logger,
      });

    const core = await context.core;
    const userId = core.security.authc.getCurrentUser()?.username ?? 'unknown';
    const now = new Date().toISOString();

    const compositeSlo = {
      ...params.body,
      id: params.body.id ?? uuidv4(),
      tags: params.body.tags ?? [],
      enabled: params.body.enabled ?? true,
      version: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    const created = await compositeSloRepository.create(compositeSlo);

    const burnRatesClient = new DefaultBurnRatesClient(scopedClusterClient.asCurrentUser);
    const summaryClient = new DefaultSummaryClient(
      scopedClusterClient.asCurrentUser,
      burnRatesClient
    );
    await persistCompositeSummaryDoc({
      esClient: scopedClusterClient.asCurrentUser,
      summaryClient,
      sloDefinitionRepository: repository,
      logger,
      spaceId,
      compositeSlo: created,
    });

    return created;
  },
});
