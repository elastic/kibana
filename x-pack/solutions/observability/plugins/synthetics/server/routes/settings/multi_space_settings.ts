/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { SyntheticsMultiSpaceSettingsWithSpaces } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { isCCSEnabled } from '../../lib/remote_result_utils';
import { DefaultSyntheticsMultiSpaceSettingsRepository } from '../../services/synthetics_multi_space_settings_repository';
import type { SyntheticsRestApiRouteFactory } from '../types';

const MAX_SELECTED_REMOTE_CLUSTERS = 100;
const MAX_SHARED_SPACES = 1_000;

export const SyntheticsMultiSpaceSettingsSchema = z.strictObject({
  useAllRemoteClusters: z.boolean().optional(),
  selectedRemoteClusters: z.array(z.string().max(256)).max(MAX_SELECTED_REMOTE_CLUSTERS).optional(),
  // Optional list of spaces the settings should be shared with. Accepts `*` for "all spaces".
  spaces: z.array(z.string().min(1).max(256)).min(1).max(MAX_SHARED_SPACES).optional(),
});

export const createGetMultiSpaceSettingsRoute: SyntheticsRestApiRouteFactory<
  SyntheticsMultiSpaceSettingsWithSpaces
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.MULTI_SPACE_SETTINGS,
  validate: false,
  handler: async ({ savedObjectsClient, server, response }) => {
    // Mirror the UI's gating: the endpoint must not exist on serverless (where CCS is
    // unavailable), so external clients can't write a `synthetics-settings-multi-space`
    // SO that nothing else respects.
    if (!isCCSEnabled(server)) {
      return response.notFound();
    }
    const repository = new DefaultSyntheticsMultiSpaceSettingsRepository(savedObjectsClient);
    return repository.get();
  },
});

export const createPutMultiSpaceSettingsRoute: SyntheticsRestApiRouteFactory<
  SyntheticsMultiSpaceSettingsWithSpaces
> = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.MULTI_SPACE_SETTINGS,
  validate: {
    body: SyntheticsMultiSpaceSettingsSchema,
  },
  writeAccess: true,
  handler: async ({ savedObjectsClient, request, server, response }) => {
    if (!isCCSEnabled(server)) {
      return response.notFound();
    }
    const repository = new DefaultSyntheticsMultiSpaceSettingsRepository(savedObjectsClient);
    const { spaces, ...attributes } = request.body;
    try {
      return await repository.save(attributes, spaces);
    } finally {
      // `spaces` can re-share the singleton SO across arbitrary spaces, so a
      // save can change what any space sees — clear all entries, not just this one.
      // Run in finally so a partial save (SO updated, space-sharing throws) still
      // invalidates on this node.
      server.syntheticsIndicesCache.invalidate();
    }
  },
});
