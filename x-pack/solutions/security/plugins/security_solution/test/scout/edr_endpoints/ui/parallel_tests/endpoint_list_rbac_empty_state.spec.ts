/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type { KbnClient } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import { fetchEndpointMetadataList } from '../../../../../scripts/endpoint/common/endpoint_metadata_services';
import { fetchIntegrationPolicyList } from '../../../../../scripts/endpoint/common/fleet_services';
import { scopeKbnClientToSpace } from '../../../edr_response_actions/common/scope_kbn_client_to_space';
import { FEATURE_PRIVILEGES, getEndpointListRole } from '../fixtures/roles';
import { spaceTest, tags } from '../fixtures';

const assertNoDefendPolicyOrHost = async (kbnClient: KbnClient, spaceId: string): Promise<void> => {
  const scopedKbnClient = scopeKbnClientToSpace(kbnClient, spaceId);
  const [policies, hosts] = await Promise.all([
    fetchIntegrationPolicyList(scopedKbnClient, {
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: endpoint`,
      perPage: 100,
    }),
    fetchEndpointMetadataList(scopedKbnClient, { pageSize: 100 }),
  ]);

  const found: string[] = [];
  if (policies.total > 0) {
    const names = policies.items.map(({ id, name }) => `${name} (${id})`).join(', ');
    found.push(`${policies.total} Endpoint package policies: ${names}`);
  }
  if (hosts.total > 0) {
    const agentIds = hosts.data.map(({ metadata }) => metadata.agent.id).join(', ');
    found.push(`${hosts.total} endpoint metadata hosts, agent ids: ${agentIds}`);
  }
  if (found.length > 0) {
    throw new Error(
      `Space "${spaceId}" must hold no Defend policy and no host for the endpoint list to show ` +
        `the policy onboarding empty state, but it has ${found.join('; ')}`
    );
  }
};

/**
 * Only the `ui:` mapping of deprecated feature versions is version-independent on the client, and
 * `edr_rbac/api/tests/siem_deprecated_ui_actions.spec.ts` asserts it, so these cases use the
 * current version. The `app:`/`api:` actions of deprecated versions stay covered by the
 * `endpoints_rbac_mocked_data_{hosts_exist,policies_exist}_siem_v1.cy.ts` Cypress specs.
 */
spaceTest.describe(
  'Endpoint list RBAC with neither a Defend policy nor hosts',
  { tag: tags.stateful.classic },
  () => {
    spaceTest.beforeAll(async ({ kbnClient, scoutSpace }) => {
      await assertNoDefendPolicyOrHost(kbnClient, scoutSpace.id);
    });

    for (const fleet of FEATURE_PRIVILEGES) {
      for (const integrations of FEATURE_PRIVILEGES) {
        const canOnboard = fleet === 'all' && integrations === 'all';
        // `noFleetAccess` renders under the same loaded-privileges condition as the button, so
        // each case waits for a visible outcome before asserting the other one is absent.
        const [shown, absent] = canOnboard
          ? (['onboardingStartButton', 'noFleetAccess'] as const)
          : (['noFleetAccess', 'onboardingStartButton'] as const);

        spaceTest(
          `${
            canOnboard ? 'shows' : 'hides'
          } Add Elastic Defend with fleet ${fleet} and integrations ${integrations}`,
          async ({ browserAuth, pageObjects }) => {
            const { endpointListEmptyState } = pageObjects;

            await browserAuth.loginWithCustomRole(getEndpointListRole({ fleet, integrations }));
            await endpointListEmptyState.goto();

            await expect(endpointListEmptyState.policyOnboardingInstructions).toBeVisible();
            await expect(endpointListEmptyState[shown]).toBeVisible();
            await expect(endpointListEmptyState[absent]).toBeHidden();
          }
        );
      }
    }
  }
);
