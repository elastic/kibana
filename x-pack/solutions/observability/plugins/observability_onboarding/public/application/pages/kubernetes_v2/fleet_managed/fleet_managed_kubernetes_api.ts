/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { API_VERSIONS } from '@kbn/fleet-plugin/common';
import type {
  AgentPolicy,
  CreateAgentPolicyResponse,
  GetOneAgentPolicyResponse,
  NewAgentPolicy,
} from '@kbn/fleet-plugin/common/types';

interface FleetServerHostsResponse {
  items: Array<{
    id: string;
    host_urls: string[];
    is_default?: boolean;
  }>;
}

interface EnrollmentApiKeysResponse {
  items?: Array<{
    id: string;
    api_key: string;
    policy_id?: string;
  }>;
}

interface GetFullAgentManifestResponse {
  item: string;
}

export const DEFAULT_FLEET_AGENT_POLICY_ID = 'fleet-first-agent-policy';

export const buildDefaultFleetAgentPolicy = (namespace = 'default'): NewAgentPolicy => ({
  id: DEFAULT_FLEET_AGENT_POLICY_ID,
  name: i18n.translate(
    'xpack.observability_onboarding.kubernetesV2.fleetManaged.defaultPolicyName',
    {
      defaultMessage: 'My first agent policy',
    }
  ),
  namespace,
  monitoring_enabled: ['logs', 'metrics'],
});

export const getDefaultFleetServerUrl = async (http: HttpStart): Promise<string> => {
  const { items } = await http.get<FleetServerHostsResponse>('/api/fleet/fleet_server_hosts', {
    version: API_VERSIONS.public.v1,
  });

  const defaultHost = items.find((item) => item.is_default);
  if (defaultHost?.host_urls[0]) {
    return defaultHost.host_urls[0];
  }

  return items[0]?.host_urls[0] ?? '';
};

export const getOrCreateDefaultFleetAgentPolicy = async (http: HttpStart): Promise<AgentPolicy> => {
  try {
    const { item } = await http.get<GetOneAgentPolicyResponse>(
      `/api/fleet/agent_policies/${encodeURIComponent(DEFAULT_FLEET_AGENT_POLICY_ID)}`,
      {
        version: API_VERSIONS.public.v1,
      }
    );
    return item;
  } catch (error) {
    if (isHttpFetchError(error) && error.response?.status === 404) {
      const { item } = await http.post<CreateAgentPolicyResponse>('/api/fleet/agent_policies', {
        body: JSON.stringify(buildDefaultFleetAgentPolicy()),
        version: API_VERSIONS.public.v1,
      });
      return item;
    }

    throw error;
  }
};

export const getEnrollmentTokenForPolicy = async (
  http: HttpStart,
  policyId: string
): Promise<string> => {
  const response = await http.get<EnrollmentApiKeysResponse>('/api/fleet/enrollment_api_keys', {
    version: API_VERSIONS.public.v1,
    query: {
      page: 1,
      perPage: 1,
      kuery: `policy_id:"${policyId}"`,
    },
  });

  const enrollmentToken = response.items?.[0]?.api_key;
  if (!enrollmentToken) {
    throw new Error(`No enrollment token found for policy ${policyId}`);
  }

  return enrollmentToken;
};

export const getManagedKubernetesManifest = async (
  http: HttpStart,
  {
    fleetServerUrl,
    enrollmentToken,
  }: {
    fleetServerUrl: string;
    enrollmentToken: string;
  }
): Promise<string> => {
  const { item } = await http.get<GetFullAgentManifestResponse>('/api/fleet/kubernetes', {
    version: API_VERSIONS.public.v1,
    query: {
      fleetServer: fleetServerUrl,
      enrolToken: enrollmentToken,
    },
  });

  return item;
};

export const buildManagedKubernetesManifestDownloadHref = (
  http: HttpStart,
  {
    fleetServerUrl,
    enrollmentToken,
  }: {
    fleetServerUrl: string;
    enrollmentToken: string;
  }
): string => {
  const params = new URLSearchParams({
    apiVersion: API_VERSIONS.public.v1,
    fleetServer: fleetServerUrl,
    enrolToken: enrollmentToken,
  });

  return http.basePath.prepend(`/api/fleet/kubernetes/download?${params.toString()}`);
};
