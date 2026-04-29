/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import type { AxiosResponse } from 'axios';
import {
  PACKAGE_POLICY_API_ROUTES,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '@kbn/fleet-plugin/common/constants';
import { catchAxiosErrorFormatAndThrow } from '../../../common/endpoint/format_axios_error';
import { indexFleetEndpointPolicy } from '../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { setupFleetForEndpoint } from '../../../common/endpoint/data_loaders/setup_fleet_for_endpoint';
import type { GetPolicyListResponse } from '../../../public/management/pages/policy/types';
import { getEndpointPackageInfo } from '../../../common/endpoint/utils/package';

const fetchEndpointPolicies = (
  kbnClient: KbnClient
): Promise<AxiosResponse<GetPolicyListResponse>> => {
  return kbnClient
    .request<GetPolicyListResponse>({
      method: 'GET',
      path: PACKAGE_POLICY_API_ROUTES.LIST_PATTERN,
      query: {
        perPage: 100,
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: endpoint`,
      },
    })
    .catch(catchAxiosErrorFormatAndThrow);
};

// Setup a list of real endpoint policies and return a method to randomly select one
export const randomPolicyIdGenerator: (
  kbn: KbnClient,
  log: ToolingLog
) => Promise<() => string> = async (kbn, log) => {
  log.info('Setting up fleet');
  await setupFleetForEndpoint(kbn, log);
  const endpointPackage = await getEndpointPackageInfo(kbn);

  log.info('Generarting test policies...');
  const randomN = (max: number): number => Math.floor(Math.random() * max);
  const policyIds: string[] =
    (await fetchEndpointPolicies(kbn)).data.items.map((policy) => policy.id) || [];

  // If the number of existing policies is less than 5, then create some more policies
  if (policyIds.length < 5) {
    for (let i = 0, t = 5 - policyIds.length; i < t; i++) {
      policyIds.push(
        (
          await indexFleetEndpointPolicy(
            kbn,
            `Policy for exceptions assignment ${i + 1}`,
            endpointPackage.version
          )
        ).integrationPolicies[0].id
      );
    }
  }

  return () => policyIds[randomN(policyIds.length)];
};
