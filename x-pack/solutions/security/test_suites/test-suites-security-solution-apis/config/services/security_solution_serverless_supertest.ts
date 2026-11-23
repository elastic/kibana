/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

// It is wrapper around supertest that injects Serverless auth headers for the admin user.
export async function SecuritySolutionServerlessSuperTest({ getService }: FtrProviderContext) {
  const { createSuperTest } = getService('securitySolutionUtils');

  return await createSuperTest('admin');
}
