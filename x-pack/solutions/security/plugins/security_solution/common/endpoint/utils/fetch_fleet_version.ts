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
import { catchHttpErrorFormatAndThrow } from '../format_http_error';

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
    .catch(catchHttpErrorFormatAndThrow);
};

/**
 * Same as {@link fetchFleetLatestAvailableAgentVersion}, but safe to use as a docker image tag.
 *
 * Respin releases are published with SemVer build metadata (`9.5.4+build202609161310`), and `+`
 * is not a legal character in a docker tag. The published image replaces it with `.`, so the
 * suffix must be converted rather than stripped — stripping would resolve to the original
 * release instead of the respin.
 */
export const fetchFleetLatestAvailableAgentDockerImageVersion = async (
  kbnClient: KbnClient
): Promise<string> => {
  return (await fetchFleetLatestAvailableAgentVersion(kbnClient)).replace('+', '.');
};
