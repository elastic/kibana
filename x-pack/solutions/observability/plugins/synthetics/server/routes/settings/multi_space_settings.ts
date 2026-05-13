/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SyntheticsMultiSpaceSettings } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { DefaultSyntheticsMultiSpaceSettingsRepository } from '../../services/synthetics_multi_space_settings_repository';
import type { SyntheticsRestApiRouteFactory } from '../types';

const MAX_SELECTED_REMOTE_CLUSTERS = 100;

export const SyntheticsMultiSpaceSettingsSchema = schema.object({
  useAllRemoteClusters: schema.maybe(schema.boolean()),
  selectedRemoteClusters: schema.maybe(
    schema.arrayOf(schema.string(), { maxSize: MAX_SELECTED_REMOTE_CLUSTERS })
  ),
});

export const createGetMultiSpaceSettingsRoute: SyntheticsRestApiRouteFactory<
  SyntheticsMultiSpaceSettings
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.MULTI_SPACE_SETTINGS,
  validate: false,
  handler: async ({ savedObjectsClient }) => {
    const repository = new DefaultSyntheticsMultiSpaceSettingsRepository(savedObjectsClient);
    return repository.get();
  },
});

export const createPutMultiSpaceSettingsRoute: SyntheticsRestApiRouteFactory<
  SyntheticsMultiSpaceSettings
> = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.MULTI_SPACE_SETTINGS,
  validate: {
    body: SyntheticsMultiSpaceSettingsSchema,
  },
  writeAccess: true,
  handler: async ({ savedObjectsClient, request }) => {
    const repository = new DefaultSyntheticsMultiSpaceSettingsRepository(savedObjectsClient);
    return repository.save(request.body);
  },
});
