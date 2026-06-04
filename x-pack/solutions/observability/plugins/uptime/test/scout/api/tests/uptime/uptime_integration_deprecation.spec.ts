/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, testData } from '../../fixtures';

const getBrowserZipInput = (zipUrl?: string) => ({
  type: 'synthetics/browser',
  policy_template: 'synthetics',
  enabled: false,
  streams: [
    {
      enabled: true,
      data_stream: { type: 'synthetics', dataset: 'browser' },
      vars: {
        __ui: { type: 'yaml' },
        enabled: { value: true, type: 'bool' },
        type: { value: 'browser', type: 'text' },
        name: { type: 'text' },
        schedule: { value: '"@every 3m"', type: 'text' },
        'service.name': { type: 'text' },
        timeout: { type: 'text' },
        tags: { type: 'yaml' },
        'source.zip_url.url': { type: 'text', value: zipUrl },
        'source.zip_url.username': { type: 'text' },
        'source.zip_url.folder': { type: 'text' },
        'source.zip_url.password': { type: 'password' },
        'source.inline.script': { type: 'yaml' },
        'source.project.content': { type: 'text' },
        params: { type: 'yaml' },
        playwright_options: { type: 'yaml' },
        screenshots: { type: 'text' },
        synthetics_args: { type: 'text' },
        ignore_https_errors: { type: 'bool' },
        'throttling.config': { type: 'text' },
        'filter_journeys.tags': { type: 'yaml' },
        'filter_journeys.match': { type: 'text' },
        'source.zip_url.ssl.certificate_authorities': { type: 'yaml' },
        'source.zip_url.ssl.certificate': { type: 'yaml' },
        'source.zip_url.ssl.key': { type: 'yaml' },
        'source.zip_url.ssl.key_passphrase': { type: 'text' },
        'source.zip_url.ssl.verification_mode': { type: 'text' },
        'source.zip_url.ssl.supported_protocols': { type: 'yaml' },
        'source.zip_url.proxy_url': { type: 'text' },
        location_name: { value: 'Fleet managed', type: 'text' },
        id: { type: 'text' },
        config_id: { type: 'text' },
        run_once: { value: false, type: 'bool' },
        origin: { type: 'text' },
        'monitor.project.id': { type: 'text' },
        'monitor.project.name': { type: 'text' },
      },
      id: 'synthetics/browser-browser-2bfd7da0-22ed-11ed-8c6b-09a2d21dfbc3-27337270-22ed-11ed-8c6b-09a2d21dfbc3-default',
    },
  ],
});

apiTest.describe('UptimeIntegrationDeprecation', { tag: '@local-stateful-classic' }, () => {
  let adminCredentials: RoleApiCredentials;
  let agentPolicyId: string;

  apiTest.beforeAll(async ({ apiClient, requestAuth }) => {
    adminCredentials = await requestAuth.getApiKey('admin');

    const response = await apiClient.post('api/fleet/agent_policies', {
      headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
      body: {
        name: `Test policy ${uuidv4()}`,
        namespace: 'default',
      },
      responseType: 'json',
    });
    expect(response.statusCode).toBe(200);
    agentPolicyId = response.body.item.id;
  });

  apiTest.afterAll(async ({ apiClient }) => {
    const response = await apiClient.post('api/fleet/agent_policies/delete', {
      headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
      body: { agentPolicyId },
      responseType: 'json',
    });
    expect(response.statusCode).toBe(200);
  });

  apiTest('returns false when no zip url policies', async ({ apiClient }) => {
    const response = await apiClient.get(
      testData.API_URLS.SYNTHETICS_HAS_INTEGRATION_MONITORS.slice(1),
      {
        headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
        responseType: 'json',
      }
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.hasIntegrationMonitors).toBe(false);
  });

  apiTest('returns true when non-managed synthetics policies exist', async ({ apiClient }) => {
    const createPolicyResponse = await apiClient.post('api/fleet/package_policies', {
      headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
      body: {
        name: `synthetics-test ${uuidv4()}`,
        description: '',
        namespace: 'default',
        policy_id: agentPolicyId,
        enabled: true,
        inputs: [getBrowserZipInput()],
        package: {
          name: 'synthetics',
          title: 'For Synthetics Tests',
          version: '0.10.2',
        },
      },
      responseType: 'json',
    });
    expect(createPolicyResponse.statusCode).toBe(200);

    const policyId = createPolicyResponse.body.item.id;

    const response = await apiClient.get(
      testData.API_URLS.SYNTHETICS_HAS_INTEGRATION_MONITORS.slice(1),
      {
        headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
        responseType: 'json',
      }
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.hasIntegrationMonitors).toBe(true);

    const deletePolicyResponse = await apiClient.post('api/fleet/package_policies/delete', {
      headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
      body: { force: true, packagePolicyIds: [policyId] },
      responseType: 'json',
    });
    expect(deletePolicyResponse.statusCode).toBe(200);
  });
});
