/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createUsersAndRoles } from '../../../../common/lib/create_users_and_roles';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile, getService }: DeploymentAgnosticFtrProviderContext) {
  const config = getService('config');
  const license = config.get('esTestCluster.license');
  const es = getService('es');
  const supertest = getService('supertest');
  const isServerless = config.get('serverless');

  describe('spaces api with security', function () {
    // Should be enabled when custom roles can be provisioned for MKI
    // See: https://github.com/elastic/kibana/issues/207361
    this.tags('skipMKI');
    before(async () => {
      if (license === 'basic' && !isServerless) {
        await createUsersAndRoles(es, supertest);
      }
    });
    loadTestFile(require.resolve('./copy_to_space'));
  });
}
