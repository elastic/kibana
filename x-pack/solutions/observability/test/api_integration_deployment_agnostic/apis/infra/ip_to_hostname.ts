/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { InfraSynthtraceEsClient } from '@kbn/synthtrace';
import { infra, timerange } from '@kbn/synthtrace-client';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { SupertestWithRoleScopeType } from '../../services';

function generateHostsData({ from, to }: { from: string; to: string }) {
  const range = timerange(from, to);

  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => [
      infra
        .host('demo-stack-mysql-01')
        .overrides({ 'host.ip': '10.128.0.7' })
        .cpu()
        .timestamp(timestamp),
      infra
        .host('demo-stack-mysql-01')
        .overrides({ 'host.ip': '10.128.0.7' })
        .memory()
        .timestamp(timestamp),
      infra
        .host('demo-stack-mysql-01')
        .overrides({ 'host.ip': '10.128.0.7' })
        .network()
        .timestamp(timestamp),
    ]);
}

export default function ipToHostNameTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe('API /api/infra/ip_to_host', function () {
    let supertestWithAdminScope: SupertestWithRoleScopeType;
    let synthtraceClient: InfraSynthtraceEsClient;

    const from = new Date(Date.now() - 1000 * 60 * 10).toISOString();
    const to = new Date().toISOString();

    before(async () => {
      supertestWithAdminScope = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
        useCookieHeader: true,
      });

      synthtraceClient = synthtrace.createInfraSynthtraceEsClient();
      await synthtraceClient.clean();
      await synthtraceClient.index(generateHostsData({ from, to }));
    });

    after(async () => {
      await synthtraceClient.clean();
      await supertestWithAdminScope.destroy();
    });

    it('should basically work', async () => {
      const postBody = {
        index_pattern: 'metrics-*',
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
        index_pattern: 'metrics-*',
        ip: '192.168.1.1',
      };
      return supertestWithAdminScope.post('/api/infra/ip_to_host').send(postBody).expect(404);
    });
  });
}
