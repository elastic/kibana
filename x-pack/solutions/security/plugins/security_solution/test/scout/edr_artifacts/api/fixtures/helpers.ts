/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import {
  API_VERSIONS,
  packagePolicyRouteService,
  type GetOnePackagePolicyResponse,
} from '@kbn/fleet-plugin/common';
import { expect } from '@kbn/scout-security/api';
import { COMMON_HEADERS } from './constants';

const UNIFIED_MANIFEST_SO_TYPE = 'endpoint:unified-user-artifact-manifest';

export interface ApiClient {
  get(
    url: string,
    options?: { headers?: Record<string, string>; responseType?: 'json' }
  ): Promise<{ statusCode: number; body: unknown }>;
}

interface UnifiedManifestAttributes {
  policyId?: string;
  artifactIds?: string[];
}

/**
 * Count artifacts in the per-policy unified manifest saved object.
 * Used to confirm the packager picked up a newly created artifact.
 */
export const getPolicyManifestArtifactCount = async (
  esClient: Client,
  packagePolicyId: string
): Promise<number> => {
  const { hits } = await esClient.search<{
    [UNIFIED_MANIFEST_SO_TYPE]: UnifiedManifestAttributes;
  }>({
    index: '.kibana*',
    query: {
      bool: { filter: [{ term: { type: UNIFIED_MANIFEST_SO_TYPE } }] },
    },
  });

  const policyManifest = hits.hits
    .map((hit) => hit._source?.[UNIFIED_MANIFEST_SO_TYPE])
    .find((manifest) => manifest?.policyId === packagePolicyId);

  return policyManifest?.artifactIds?.length ?? 0;
};

export const getPackagePolicyRevision = async (
  apiClient: ApiClient,
  packagePolicyId: string,
  apiKeyHeader: { Authorization: string }
): Promise<number> => {
  const response = await apiClient.get(packagePolicyRouteService.getInfoPath(packagePolicyId), {
    headers: {
      ...apiKeyHeader,
      ...COMMON_HEADERS,
      'elastic-api-version': API_VERSIONS.public.v1,
    },
    responseType: 'json',
  });
  expect(response).toHaveStatusCode(200);
  return (response.body as GetOnePackagePolicyResponse).item.revision;
};
