/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRbacEmptyStateSuite } from './rbac_empty_state_test_suite';

describe(
  'Endpoints page RBAC - neither Defend policy nor hosts are present (siem v1)',
  { tags: ['@ess'] },
  () => {
    createRbacEmptyStateSuite('siem');
  }
);
