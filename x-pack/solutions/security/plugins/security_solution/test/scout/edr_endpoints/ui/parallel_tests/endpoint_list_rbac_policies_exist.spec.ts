/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, KibanaRole } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { fetchEndpointMetadataList } from '../../../../../scripts/endpoint/common/endpoint_metadata_services';
import {
  createScoutEndpointPolicy,
  deleteScoutEndpointPolicy,
} from '../../../edr_artifacts/ui/fixtures/endpoint_policy';
import { scopeKbnClientToSpace } from '../../../edr_response_actions/common/scope_kbn_client_to_space';
import type { EndpointListEmptyStatePage } from '../fixtures/page_objects/endpoint_list_empty_state';
import { FEATURE_PRIVILEGES, getEndpointListRole } from '../fixtures/roles';
import { spaceTest, tags } from '../fixtures';

type EmptyStateElement = keyof Pick<
  EndpointListEmptyStatePage,
  | 'emptyPolicyTable'
  | 'policyOnboardingInstructions'
  | 'onboardingStartButton'
  | 'noFleetAccess'
  | 'emptyHostsTable'
  | 'onboardingSteps'
>;

interface ExpectedEmptyState {
  readonly readyWhen: EmptyStateElement;
  readonly visible: readonly EmptyStateElement[];
  readonly hidden: readonly EmptyStateElement[];
}

// `noFleetAccess` renders under the same loaded-privileges condition as the button, so each case
// waits for a visible outcome before asserting the other one is absent.
const HOSTS_ONBOARDING: ExpectedEmptyState = {
  readyWhen: 'onboardingSteps',
  visible: ['emptyHostsTable', 'onboardingSteps'],
  hidden: ['noFleetAccess'],
};

const POLICY_ONBOARDING: ExpectedEmptyState = {
  readyWhen: 'policyOnboardingInstructions',
  visible: ['emptyPolicyTable', 'noFleetAccess'],
  hidden: ['onboardingStartButton'],
};

const assertNoHost = async (kbnClient: KbnClient, spaceId: string): Promise<void> => {
  const hosts = await fetchEndpointMetadataList(scopeKbnClientToSpace(kbnClient, spaceId), {
    pageSize: 100,
  });
  if (hosts.total > 0) {
    const agentIds = hosts.data.map(({ metadata }) => metadata.agent.id).join(', ');
    throw new Error(
      `Space "${spaceId}" must hold no host for the endpoint list to show an onboarding empty ` +
        `state, but it has ${hosts.total} endpoint metadata hosts, agent ids: ${agentIds}`
    );
  }
};

interface RbacCase {
  readonly title: string;
  readonly role: KibanaRole;
  readonly expected: ExpectedEmptyState;
}

// Fleet's `fleet.all` authz also needs Integrations `read` or `all`; without it the page shows the
// policy onboarding without Fleet access, even when the Defend policy is listed.
const FLEET_INTEGRATIONS_CASES: readonly RbacCase[] = FEATURE_PRIVILEGES.flatMap((fleet) =>
  FEATURE_PRIVILEGES.map((integrations) => {
    const showsHostsOnboarding = fleet === 'all' && integrations !== 'none';
    return {
      title: `${
        showsHostsOnboarding ? 'shows' : 'hides'
      } the hosts onboarding with fleet ${fleet} and integrations ${integrations}`,
      role: getEndpointListRole({ fleet, integrations }),
      expected: showsHostsOnboarding ? HOSTS_ONBOARDING : POLICY_ONBOARDING,
    };
  })
);

spaceTest.describe(
  'Endpoint list RBAC with a Defend policy and no hosts',
  { tag: tags.stateful.classic },
  () => {
    let indexedPolicy: IndexedFleetEndpointPolicyResponse | undefined;

    spaceTest.beforeAll(async ({ kbnClient, log, scoutSpace }) => {
      await assertNoHost(kbnClient, scoutSpace.id);
      indexedPolicy = await createScoutEndpointPolicy(
        kbnClient,
        log,
        `Scout policies exist ${scoutSpace.id} ${Date.now()}`,
        scoutSpace.id
      );
    });

    spaceTest.afterAll(async ({ kbnClient, log, scoutSpace }) => {
      if (indexedPolicy) {
        await deleteScoutEndpointPolicy(kbnClient, log, indexedPolicy, scoutSpace.id);
      }
    });

    for (const {
      title,
      role,
      expected: { readyWhen, visible, hidden },
    } of FLEET_INTEGRATIONS_CASES) {
      spaceTest(title, async ({ browserAuth, pageObjects }) => {
        const { endpointListEmptyState } = pageObjects;

        await browserAuth.loginWithCustomRole(role);
        await endpointListEmptyState.goto(endpointListEmptyState[readyWhen]);

        for (const element of visible) {
          await expect(endpointListEmptyState[element]).toBeVisible();
        }
        for (const element of hidden) {
          await expect(endpointListEmptyState[element]).toBeHidden();
        }
      });
    }
  }
);
