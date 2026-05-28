/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { API_VERSIONS } from '@kbn/fleet-plugin/common';
import type { AgentPolicy } from '@kbn/fleet-plugin/common/types';
import {
  buildDefaultFleetAgentPolicy,
  buildManagedKubernetesManifestDownloadHref,
  DEFAULT_FLEET_AGENT_POLICY_ID,
  getDefaultFleetServerUrl,
  getEnrollmentTokenForPolicy,
  getManagedKubernetesManifest,
  getOrCreateDefaultFleetAgentPolicy,
} from '../fleet_managed/fleet_managed_kubernetes_api';

interface FleetManagedKubernetesHttpMock {
  get: jest.MockedFunction<HttpStart['get']>;
  post: jest.MockedFunction<HttpStart['post']>;
  basePath: {
    prepend: jest.MockedFunction<HttpStart['basePath']['prepend']>;
  };
}

const createHttpMock = (): FleetManagedKubernetesHttpMock => ({
  get: jest.fn(),
  post: jest.fn(),
  basePath: {
    prepend: jest.fn((path: string) => `/base${path}`),
  },
});

const asHttpStart = (http: FleetManagedKubernetesHttpMock): HttpStart =>
  http as unknown as HttpStart;

const createNotFoundError = () => {
  const error = new Error('Not Found') as Error & {
    request: Request;
    response: { status: number };
  };
  error.request = {} as Request;
  error.response = { status: 404 };
  return error;
};

const mockAgentPolicy: AgentPolicy = {
  id: DEFAULT_FLEET_AGENT_POLICY_ID,
  name: 'My first agent policy',
  namespace: 'default',
  status: 'active',
  is_managed: false,
  is_protected: false,
  revision: 1,
  updated_at: '2024-01-01T00:00:00.000Z',
  updated_by: 'system',
  monitoring_enabled: ['logs', 'metrics'],
};

describe('fleet_managed_kubernetes_api', () => {
  describe('getDefaultFleetServerUrl', () => {
    it('returns the default Fleet Server host URL when one is marked default', async () => {
      const http = createHttpMock();
      http.get.mockResolvedValue({
        items: [
          { id: 'host-1', host_urls: ['https://first.example.com'], is_default: false },
          { id: 'host-2', host_urls: ['https://default.example.com'], is_default: true },
        ],
      });

      await expect(getDefaultFleetServerUrl(asHttpStart(http))).resolves.toBe(
        'https://default.example.com'
      );
      expect(http.get).toHaveBeenCalledWith('/api/fleet/fleet_server_hosts', {
        version: API_VERSIONS.public.v1,
      });
    });

    it('falls back to the first host URL when no default is set', async () => {
      const http = createHttpMock();
      http.get.mockResolvedValue({
        items: [
          { id: 'host-1', host_urls: ['https://first.example.com'] },
          { id: 'host-2', host_urls: ['https://second.example.com'] },
        ],
      });

      await expect(getDefaultFleetServerUrl(asHttpStart(http))).resolves.toBe(
        'https://first.example.com'
      );
    });

    it('returns an empty string when no Fleet Server hosts exist', async () => {
      const http = createHttpMock();
      http.get.mockResolvedValue({ items: [] });

      await expect(getDefaultFleetServerUrl(asHttpStart(http))).resolves.toBe('');
    });
  });

  describe('getOrCreateDefaultFleetAgentPolicy', () => {
    it('creates the default policy when the existing policy is missing', async () => {
      const http = createHttpMock();
      http.get.mockRejectedValue(createNotFoundError());
      http.post.mockResolvedValue({ item: mockAgentPolicy });

      await expect(getOrCreateDefaultFleetAgentPolicy(asHttpStart(http))).resolves.toEqual(
        mockAgentPolicy
      );
      expect(http.get).toHaveBeenCalledWith(
        `/api/fleet/agent_policies/${DEFAULT_FLEET_AGENT_POLICY_ID}`,
        { version: API_VERSIONS.public.v1 }
      );
      expect(http.post).toHaveBeenCalledWith('/api/fleet/agent_policies', {
        body: JSON.stringify(buildDefaultFleetAgentPolicy()),
        version: API_VERSIONS.public.v1,
      });
    });

    it('reuses the existing default policy when it already exists', async () => {
      const http = createHttpMock();
      http.get.mockResolvedValue({ item: mockAgentPolicy });

      await expect(getOrCreateDefaultFleetAgentPolicy(asHttpStart(http))).resolves.toEqual(
        mockAgentPolicy
      );
      expect(http.post).not.toHaveBeenCalled();
    });

    it('rethrows non-404 errors from the policy lookup', async () => {
      const http = createHttpMock();
      const error = new Error('Forbidden');
      http.get.mockRejectedValue(error);

      await expect(getOrCreateDefaultFleetAgentPolicy(asHttpStart(http))).rejects.toThrow(
        'Forbidden'
      );
      expect(http.post).not.toHaveBeenCalled();
    });
  });

  describe('getEnrollmentTokenForPolicy', () => {
    it('throws when no enrollment token exists for the policy', async () => {
      const http = createHttpMock();
      http.get.mockResolvedValue({ items: [] });

      await expect(getEnrollmentTokenForPolicy(asHttpStart(http), 'policy-1')).rejects.toThrow(
        'No enrollment token found for policy policy-1'
      );
    });

    it('returns the enrollment token for the policy', async () => {
      const http = createHttpMock();
      http.get.mockResolvedValue({
        items: [{ id: 'key-1', api_key: 'enrollment-token', policy_id: 'policy-1' }],
      });

      await expect(getEnrollmentTokenForPolicy(asHttpStart(http), 'policy-1')).resolves.toBe(
        'enrollment-token'
      );
      expect(http.get).toHaveBeenCalledWith('/api/fleet/enrollment_api_keys', {
        version: API_VERSIONS.public.v1,
        query: {
          page: 1,
          perPage: 1,
          kuery: 'policy_id:"policy-1"',
        },
      });
    });
  });

  describe('getManagedKubernetesManifest', () => {
    it('requests the manifest with fleetServer and enrolToken query params', async () => {
      const http = createHttpMock();
      http.get.mockResolvedValue({ item: 'apiVersion: v1' });

      await expect(
        getManagedKubernetesManifest(asHttpStart(http), {
          fleetServerUrl: 'https://fleet.example.com',
          enrollmentToken: 'token+with/special&chars',
        })
      ).resolves.toBe('apiVersion: v1');

      expect(http.get).toHaveBeenCalledWith('/api/fleet/kubernetes', {
        version: API_VERSIONS.public.v1,
        query: {
          fleetServer: 'https://fleet.example.com',
          enrolToken: 'token+with/special&chars',
        },
      });
    });
  });

  describe('buildManagedKubernetesManifestDownloadHref', () => {
    it('builds a download href with encoded query params', () => {
      const http = createHttpMock();
      const fleetServerUrl = 'https://fleet.example.com';
      const enrollmentToken = 'token with spaces&symbols';
      const expectedQuery = new URLSearchParams({
        apiVersion: API_VERSIONS.public.v1,
        fleetServer: fleetServerUrl,
        enrolToken: enrollmentToken,
      }).toString();
      const expectedPath = `/api/fleet/kubernetes/download?${expectedQuery}`;

      const href = buildManagedKubernetesManifestDownloadHref(asHttpStart(http), {
        fleetServerUrl,
        enrollmentToken,
      });

      expect(http.basePath.prepend).toHaveBeenCalledWith(expectedPath);
      expect(href).toBe(`/base${expectedPath}`);
    });
  });
});
