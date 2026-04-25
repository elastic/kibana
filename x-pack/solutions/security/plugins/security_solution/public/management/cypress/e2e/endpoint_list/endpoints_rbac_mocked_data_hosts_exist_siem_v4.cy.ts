/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRbacHostsExistSuite } from './rbac_hosts_exist_test_suite';

describe('Endpoints page RBAC - some hosts are enrolled (siem v4)', { tags: ['@ess'] }, () => {
  createRbacHostsExistSuite('siemV4');
});
