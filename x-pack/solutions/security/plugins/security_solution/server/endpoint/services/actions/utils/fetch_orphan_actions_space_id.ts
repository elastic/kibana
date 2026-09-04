/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointAppContextService } from '../../../endpoint_app_context_services';
import type { OrphanResponseActionsMetadata } from '../../../lib/reference_data';
import { REF_DATA_KEYS } from '../../../lib/reference_data';

/**
 * The space that actions whose integration policy has been deleted are displayed in
 */
export const fetchOrphanActionsSpaceId = async (
  endpointService: EndpointAppContextService
): Promise<string | undefined> =>
  (
    await endpointService
      .getReferenceDataClient()
      .get<OrphanResponseActionsMetadata>(REF_DATA_KEYS.orphanResponseActionsSpace)
  ).metadata.spaceId;
