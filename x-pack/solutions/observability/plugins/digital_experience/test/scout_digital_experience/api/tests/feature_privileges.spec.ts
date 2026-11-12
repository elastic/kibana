/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

const { COMMON_HEADERS, createRole } = testData;

interface CapabilitiesResponse {
  navLinks: Record<string, boolean>;
  digital_experience: {
    show: boolean;
    save: boolean;
    manageSessions: boolean;
    createShortUrl: boolean;
  };
}

const CAPABILITY_CASES = [
  {
    title: 'resolves show, save and short URLs, but not managing sessions, for the all privilege',
    role: createRole({ digital_experience: ['all'] }),
    expected: {
      navLink: true,
      show: true,
      save: true,
      manageSessions: false,
      createShortUrl: true,
    },
  },
  {
    title: 'resolves show and save, but no short URLs, for all without the Short URLs sub-feature',
    role: createRole({ digital_experience: ['minimal_all'] }),
    expected: {
      navLink: true,
      show: true,
      save: true,
      manageSessions: false,
      createShortUrl: false,
    },
  },
  {
    title: 'resolves short URLs with the url_create sub-feature privilege',
    role: createRole({ digital_experience: ['minimal_all', 'url_create'] }),
    expected: {
      navLink: true,
      show: true,
      save: true,
      manageSessions: false,
      createShortUrl: true,
    },
  },
  {
    title: 'resolves show only for the read privilege',
    role: createRole({ digital_experience: ['read'] }),
    expected: {
      navLink: true,
      show: true,
      save: false,
      manageSessions: false,
      createShortUrl: false,
    },
  },
  {
    title: 'resolves managing sessions only with the manage_sessions sub-feature privilege',
    role: createRole({ digital_experience: ['read', 'manage_sessions'] }),
    expected: {
      navLink: true,
      show: true,
      save: false,
      manageSessions: true,
      createShortUrl: false,
    },
  },
  {
    title: 'resolves no access without the digital_experience privilege',
    role: createRole({ apm: ['read'] }),
    expected: {
      navLink: false,
      show: false,
      save: false,
      manageSessions: false,
      createShortUrl: false,
    },
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
          // Kibana adds the saved object types every app shares, so only ours is checked.
          savedObject: {
            all: expect.arrayContaining(['digital-experience-view']),
            read: expect.arrayContaining(['digital-experience-view']),
          },
        },
        read: {
          app: ['digital_experience', 'kibana'],
          api: ['read_digital_experience'],
          ui: ['show'],
          savedObject: { read: expect.arrayContaining(['digital-experience-view']) },
        },
      },
      subFeatures: [
        {
          requireAllSpaces: true,
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'manage_sessions',
                  includeIn: 'none',
                  api: ['manage_digital_experience_sessions'],
                  ui: ['manageSessions'],
                },
              ],
            },
          ],
        },
        {
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'url_create',
                  includeIn: 'all',
                  ui: ['createShortUrl'],
                  savedObject: { all: ['url'], read: [] },
                },
              ],
            },
          ],
        },
      ],
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
      expect(capabilities).toStrictEqual({
        show: expected.show,
        save: expected.save,
        manageSessions: expected.manageSessions,
        createShortUrl: expected.createShortUrl,
      });
    });
  }
});
