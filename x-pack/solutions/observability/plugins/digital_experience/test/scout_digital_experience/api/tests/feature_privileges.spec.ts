/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-oblt';
import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

interface CapabilitiesResponse {
  navLinks: Record<string, boolean>;
  digital_experience: { show: boolean; save: boolean };
}

const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
} as const;

const createRole = (feature: KibanaRole['kibana'][number]['feature']): KibanaRole => ({
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature, spaces: ['*'] }],
});

const CAPABILITY_CASES = [
  {
    title: 'resolves show and save for the all privilege',
    role: createRole({ digital_experience: ['all'] }),
    expected: { navLink: true, show: true, save: true },
  },
  {
    title: 'resolves show only for the read privilege',
    role: createRole({ digital_experience: ['read'] }),
    expected: { navLink: true, show: true, save: false },
  },
  {
    title: 'resolves no access without the digital_experience privilege',
    role: createRole({ apm: ['read'] }),
    expected: { navLink: false, show: false, save: false },
  },
] as const;

apiTest.describe('Digital Experience feature privileges', { tag: DIGITAL_EXPERIENCE_TAGS }, () => {
  apiTest('registers the feature with its privileges', async ({ apiClient, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();

    const response = await apiClient.get('api/features', {
      headers: { ...apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const features = response.body as Array<{ id: string }>;
    expect(features.find(({ id }) => id === 'digital_experience')).toMatchObject({
      app: ['digital_experience', 'kibana'],
      privileges: {
        all: {
          app: ['digital_experience', 'kibana'],
          api: ['read_digital_experience', 'manage_digital_experience'],
          ui: ['show', 'save'],
        },
        read: {
          app: ['digital_experience', 'kibana'],
          api: ['read_digital_experience'],
          ui: ['show'],
        },
      },
    });
  });

  for (const { title, role, expected } of CAPABILITY_CASES) {
    apiTest(title, async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(role);

      const response = await apiClient.post('api/core/capabilities', {
        headers: { ...COMMON_HEADERS, ...apiKeyHeader },
        body: { applications: ['digital_experience'] },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const { navLinks, digital_experience: capabilities } = response.body as CapabilitiesResponse;
      expect(navLinks.digital_experience).toBe(expected.navLink);
      expect(capabilities).toStrictEqual({ show: expected.show, save: expected.save });
    });
  }
});
