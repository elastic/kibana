/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { CreateAgentPolicyResponse, GetInfoResponse } from '@kbn/fleet-plugin/common';
import {
  AGENT_POLICY_API_ROUTES,
  EPM_API_ROUTES,
  PACKAGE_POLICY_API_ROUTES,
} from '@kbn/fleet-plugin/common';
import type {
  NewAgentPolicySchema,
  SimplifiedCreatePackagePolicyRequestBodySchema,
} from '@kbn/fleet-plugin/server/types';
import { rootRequest } from './common';

interface Package {
  name: string;
  version: string;
}

export type AgentPolicy = TypeOf<typeof NewAgentPolicySchema>;
export type PackagePolicy = TypeOf<typeof SimplifiedCreatePackagePolicyRequestBodySchema>;
export type PackagePolicyWithoutAgentPolicyId = Omit<PackagePolicy, 'policy_id'>;

/**
 * Installs provided integrations by installing provided packages, creating an agent policy and adding a package policy.
 * An agent policy is created with System integration enabled (with `?sys_monitoring=true` query param).
 *
 * Agent and package policies can be generated in Kibana by opening Fleet UI e.g. for AWS CloudFront the steps are following
 *
 * - open `app/integrations/detail/aws-1.17.0/overview?integration=cloudfront`
 * - click the button `Add Amazon CloudFront`
 * - fill in `Queue URL`
 * - press `Preview API request` at the bottom
 * - copy shown policies
 */
export function installIntegrations({
  packages,
  agentPolicy,
  packagePolicy,
}: {
  packages: Package[];
  agentPolicy: AgentPolicy;
  packagePolicy: Omit<PackagePolicy, 'policy_id'>;
}): void {
  // Bulk install provided packages
  rootRequest({
    method: 'POST',
    url: EPM_API_ROUTES.BULK_INSTALL_PATTERN,
    body: {
      packages,
      force: true,
    },
  });

  // Install agent and package policies
  rootRequest<CreateAgentPolicyResponse>({
    method: 'POST',
    url: `${AGENT_POLICY_API_ROUTES.CREATE_PATTERN}?sys_monitoring=true`,
    body: agentPolicy,
  }).then((response) => {
    const packagePolicyWithAgentPolicyId: PackagePolicy = {
      ...packagePolicy,
      policy_id: response.body.item.id,
    };

    rootRequest({
      method: 'POST',
      url: PACKAGE_POLICY_API_ROUTES.CREATE_PATTERN,
      body: packagePolicyWithAgentPolicyId,
    });
  });
}

/**
 * Checks if a Fleet package is installed by querying the Fleet EPM API
 * @param packageName - The name of the package to check (e.g., 'entityanalytics_okta')
 * @returns Cypress chainable that resolves to true if installed, false otherwise
 */
export const checkPackageInstalled = (packageName: string): Cypress.Chainable<boolean> => {
  return rootRequest<GetInfoResponse>({
    method: 'GET',
    url: `/api/fleet/epm/packages/${packageName}`,
    failOnStatusCode: false,
  }).then((response) => {
    const status = response.body?.item?.status;
    return status === 'installed';
  });
};

/**
 * Polls the Fleet EPM API until a package installation status is 'installed'
 * @param packageName - The name of the package to wait for (e.g., 'entityanalytics_okta')
 * @param options - Configuration options
 * @param options.timeout - Maximum time to wait in milliseconds (default: 60000)
 * @param options.interval - Polling interval in milliseconds (default: 2000)
 */
export const waitForPackageInstalled = (
  packageName: string,
  options: { timeout?: number; interval?: number } = {}
): void => {
  const { timeout = 60000, interval = 2000 } = options;

  cy.waitUntil(() => checkPackageInstalled(packageName), {
    interval,
    timeout,
  });

  cy.log(`Package ${packageName} is now installed`);
};
