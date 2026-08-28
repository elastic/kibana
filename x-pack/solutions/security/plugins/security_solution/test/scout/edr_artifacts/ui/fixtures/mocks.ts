/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-security';
import type { PolicyData } from '../../../../../common/endpoint/types';
import { FleetPackagePolicyGenerator } from '../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import {
  MOCK_AGENT_POLICY_ID,
  MOCK_ENDPOINT_POLICY_ID,
  MOCK_ENDPOINT_POLICY_NAME,
} from './constants';

const EMPTY_AGENT_STATUS = {
  results: {
    events: 0,
    online: 0,
    error: 0,
    offline: 0,
    other: 0,
    updating: 0,
    inactive: 0,
    unenrolled: 0,
    all: 0,
    active: 0,
  },
};

export const createMockEndpointPackagePolicy = (): PolicyData => {
  const generator = new FleetPackagePolicyGenerator();
  return generator.generateEndpointPackagePolicy({
    id: MOCK_ENDPOINT_POLICY_ID,
    name: MOCK_ENDPOINT_POLICY_NAME,
    policy_ids: [MOCK_AGENT_POLICY_ID],
  });
};

/**
 * Intercept Fleet package-policy and agent-status HTTP so this suite never
 * talks to Fleet (no Fleet Server, no EPM install, no real package policy).
 * Artifact list CRUD still hits the real lists API.
 *
 * See elastic/security-team#18383 and #18384.
 */
export async function mockEndpointPolicyFleetApis(
  page: ScoutPage,
  policy: PolicyData = createMockEndpointPackagePolicy()
): Promise<PolicyData> {
  await page.route(/\/api\/fleet\/package_policies(\/|_bulk_get|$|\?)/, async (route, request) => {
    const method = request.method();
    const url = request.url();

    if (method === 'GET' && url.includes(policy.id)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ item: policy }),
      });
      return;
    }

    if (method === 'POST' && url.includes('_bulk_get')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [policy], itemsNotFound: [] }),
      });
      return;
    }

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [policy], total: 1, page: 1, perPage: 20 }),
      });
      return;
    }

    await route.continue();
  });

  await page.route(/\/api\/fleet\/agent_status/, async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(EMPTY_AGENT_STATUS),
      });
      return;
    }

    await route.continue();
  });

  return policy;
}
