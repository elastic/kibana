/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRbacPoliciesExistSuite } from './rbac_policies_exist_test_suite';

describe(
  'Endpoints page RBAC - Defend policy is present, but no hosts (siem v3)',
  { tags: ['@ess'] },
  () => {
    createRbacPoliciesExistSuite('siemV3');
  }
);
