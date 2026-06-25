/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createNavigationEssSuite } from './navigation_rbac_test_suite';

describe('Navigation RBAC - ESS (siem v3)', { tags: ['@ess'] }, () => {
  createNavigationEssSuite('siemV3');
});
