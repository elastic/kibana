/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Fetches the latest version of the Elastic Agent available for download
 * @param kbnClient
 */
import type { KbnClient } from '@kbn/test';
import { AGENT_API_ROUTES } from '@kbn/fleet-plugin/common';
import type { GetAvailableVersionsResponse } from '@kbn/fleet-plugin/common/types';
import { catchAxiosErrorFormatAndThrow } from '../format_axios_error';

export const fetchFleetLatestAvailableAgentVersion = async (
  kbnClient: KbnClient
): Promise<string> => {
  return kbnClient
    .request<GetAvailableVersionsResponse>({
      method: 'GET',
      path: AGENT_API_ROUTES.AVAILABLE_VERSIONS_PATTERN,
      headers: {
        'elastic-api-version': '2023-10-31',
      },
    })
    .then((response) => response.data.items[0])
    .catch(catchAxiosErrorFormatAndThrow);
};
