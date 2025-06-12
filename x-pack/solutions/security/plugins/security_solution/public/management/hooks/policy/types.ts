/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BulkGetPackagePoliciesResponse,
  GetPackagePoliciesResponse,
  PackagePolicy,
} from '@kbn/fleet-plugin/common';

/** Generic of the Fleet `GetPackagePoliciesResponse` */
export type GetIntegrationPolicyListResponse<T extends PackagePolicy = PackagePolicy> = Omit<
  GetPackagePoliciesResponse,
  'items'
> & {
  items: T[];
};

/** Generic of the Fleet `BulkGetPackagePoliciesResponse` */
export type GetBulkIntegrationPoliciesResponse<T extends PackagePolicy = PackagePolicy> = Omit<
  BulkGetPackagePoliciesResponse,
  'items'
> & {
  items: T[];
};
