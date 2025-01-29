/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import type { SupertestWithRoleScopeType } from '../../../services';

export default function ipToHostNameTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esArchiver = getService('esArchiver');

  describe('API /api/infra/ip_to_host', () => {
    let supertestWithAdminScope: SupertestWithRoleScopeType;

    before(async () => {
      supertestWithAdminScope = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
        useCookieHeader: true,
      });
      await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await supertestWithAdminScope.destroy();
    });

    it('should basically work', async () => {
      const postBody = {
        index_pattern: 'metricbeat-*',
        ip: '10.128.0.7',
      };
      const response = await supertestWithAdminScope
        .post('/api/infra/ip_to_host')
        .send(postBody)
        .expect(200);

      expect(response.body).to.have.property('host', 'demo-stack-mysql-01');
    });

    it('should return 404 for invalid ip', async () => {
      const postBody = {
        index_pattern: 'metricbeat-*',
        ip: '192.168.1.1',
      };
      return supertestWithAdminScope.post('/api/infra/ip_to_host').send(postBody).expect(404);
    });
  });
}
