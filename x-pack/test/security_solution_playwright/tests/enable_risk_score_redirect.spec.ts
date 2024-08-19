/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import { test } from '../fixtures/es_archiver';

test.describe('Enable risk scores from dashboard', () => {
  test('host risk enable button should redirect to entity management page', async ({
    page,
    request,
    esArchiver,
  }) => {
    await esArchiver.load('auditbeat_single');

    const response = await request.post('/internal/security/login', {
      headers: {
        'kbn-xsrf': 'cypress-creds',
        'x-elastic-internal-origin': 'security-solution',
        'elastic-api-version': '2023-10-31',
      },
      data: {
        providerType: 'basic',
        providerName: 'basic',
        currentURL: '/',
        params: {
          username: process.env.ELASTICSEARCH_USERNAME,
          password: process.env.ELASTICSEARCH_PASSWORD,
        },
      },
    });

    if (response.ok()) {
      const cookies = response.headers()['set-cookie'];

      const parsedCookies = cookies.split(', ').map((cookie) => {
        const [nameValue] = cookie.split('; ');
        const [name, value] = nameValue.split('=');
        return { name, value, url: process.env.KIBANA_URL };
      });

      await page.context().addCookies(parsedCookies);
    } else {
      throw new Error(
        `Authentication failed with status ${response.status()}: ${response.statusText()}`
      );
    }

    await page.goto('/app/security/entity_analytics');

    await expect(page.locator('[data-test-subj="enable_host_risk_score"]')).toBeVisible({
      timeout: 60000,
    });

    await page.locator('[data-test-subj="enable_host_risk_score"]').click();

    await expect(page.locator('[data-test-subj="entityAnalyticsManagementPageTitle"]')).toHaveText(
      'Entity Risk Score',
      { timeout: 60000 }
    );
  });

  test('user risk enable button should redirect to entity management page', async ({
    page,
    request,
  }) => {
    const response = await request.post('/internal/security/login', {
      headers: {
        'kbn-xsrf': 'cypress-creds',
        'x-elastic-internal-origin': 'security-solution',
        'elastic-api-version': '2023-10-31',
      },
      data: {
        providerType: 'basic',
        providerName: 'basic',
        currentURL: '/',
        params: {
          username: process.env.ELASTICSEARCH_USERNAME,
          password: process.env.ELASTICSEARCH_PASSWORD,
        },
      },
    });

    if (response.ok()) {
      const cookies = response.headers()['set-cookie'];

      const parsedCookies = cookies.split(', ').map((cookie) => {
        const [nameValue] = cookie.split('; ');
        const [name, value] = nameValue.split('=');
        return { name, value, url: process.env.KIBANA_URL };
      });

      await page.context().addCookies(parsedCookies);
    } else {
      throw new Error(
        `Authentication failed with status ${response.status()}: ${response.statusText()}`
      );
    }

    await page.goto('/app/security/entity_analytics');

    await expect(page.locator('[data-test-subj="enable_user_risk_score"]')).toBeVisible({
      timeout: 60000,
    });

    await page.locator('[data-test-subj="enable_user_risk_score"]').click();

    await expect(page.locator('[data-test-subj="entityAnalyticsManagementPageTitle"]')).toHaveText(
      'Entity Risk Score',
      { timeout: 60000 }
    );
  });
});
