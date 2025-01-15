/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  AGENT_POLICY_API_ROUTES,
  CreateAgentPolicyResponse,
  EPM_API_ROUTES,
  PACKAGE_POLICY_API_ROUTES,
} from '@kbn/fleet-plugin/common';
import {
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
