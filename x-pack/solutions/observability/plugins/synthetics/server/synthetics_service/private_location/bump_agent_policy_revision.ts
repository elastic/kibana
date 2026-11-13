/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import type { SyntheticsServerSetup } from '../../types';

/**
 * Bumps an agent policy's revision in a space it lives in: a bump through the
 * default-space client 404s for an agent policy that lives in another space.
 */
export const bumpAgentPolicyRevision = async (
  server: SyntheticsServerSetup,
  policyId: string
): Promise<void> => {
  const { savedObjects, elasticsearch } = server.coreStart;
  const [agentPolicy] = await server.fleet.agentPolicyService.getByIds(
    savedObjects.createInternalRepository(),
    [{ id: policyId, spaceId: ALL_SPACES_ID }],
    { ignoreMissing: true, fields: ['name'] }
  );
  const spaceIds = agentPolicy?.space_ids ?? [];
  const spaceId =
    spaceIds.length === 0 || spaceIds.includes(DEFAULT_SPACE_ID) || spaceIds.includes(ALL_SPACES_ID)
      ? DEFAULT_SPACE_ID
      : spaceIds[0];

  await server.fleet.agentPolicyService.bumpRevision(
    savedObjects.getUnsafeInternalClient().asScopedToNamespace(spaceId),
    elasticsearch.client.asInternalUser,
    policyId,
    { asyncDeploy: true }
  );
};
