/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ServicesAPIResponseRT } from '@kbn/infra-plugin/common/http_api/host_details';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import type { SupertestWithRoleScopeType } from '../../../services';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

const SERVICES_ENDPOINT = '/api/infra/services';

export function generateServicesData({
  from,
  to,
  instanceCount = 1,
  servicesPerHost = 1,
}: {
  from: string;
  to: string;
  instanceCount?: number;
  servicesPerHost?: number;
}) {
  const range = timerange(from, to);
  const services = Array(instanceCount)
    .fill(null)
    .flatMap((_, hostIdx) =>
      Array(servicesPerHost)
        .fill(null)
        .map((__, serviceIdx) =>
          apm
            .service({
              name: `service-${hostIdx}-${serviceIdx}`,
              environment: 'production',
              agentName: 'nodejs',
            })
            .instance(`host-${hostIdx}`)
        )
    );
  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      services.map((service) =>
        service
          .transaction({ transactionName: 'GET /foo' })
          .timestamp(timestamp)
          .duration(500)
          .success()
      )
    );
}
// generates error logs only for services
export function generateServicesLogsOnlyData({
  from,
  to,
  instanceCount = 1,
  servicesPerHost = 1,
}: {
  from: string;
  to: string;
  instanceCount?: number;
  servicesPerHost?: number;
}) {
  const range = timerange(from, to);
  const services = Array(instanceCount)
    .fill(null)
    .flatMap((_, hostIdx) =>
      Array(servicesPerHost)
        .fill(null)
        .map((__, serviceIdx) =>
          apm
            .service({
              name: `service-${hostIdx}-${serviceIdx}`,
              environment: 'production',
              agentName: 'go',
            })
            .instance(`host-${hostIdx}`)
        )
    );
  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      services.map((service) =>
        service.error({ message: 'error', type: 'My Type' }).timestamp(timestamp)
      )
    );
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe('GET /infra/services', () => {
    let synthtraceApmClient: ApmSynthtraceEsClient;
    let supertestWithAdminScope: SupertestWithRoleScopeType;

    const from = new Date(Date.now() - 1000 * 60 * 2).toISOString();
    const to = new Date().toISOString();
    before(async () => {
      supertestWithAdminScope = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
        useCookieHeader: true,
      });

      synthtraceApmClient = await synthtrace.createApmSynthtraceEsClient();
    });
    after(async () => {
      await synthtrace.apmSynthtraceKibanaClient.uninstallApmPackage();
      await supertestWithAdminScope.destroy();
    });

    describe('with transactions', () => {
      before(async () =>
        synthtraceApmClient.index(
          generateServicesData({ from, to, instanceCount: 3, servicesPerHost: 3 })
        )
      );
      after(async () => {
        await synthtraceApmClient.clean();
      });

      it('returns no services with no data', async () => {
        const filters = JSON.stringify({
          'host.name': 'some-host',
        });

        const response = await supertestWithAdminScope
          .get(SERVICES_ENDPOINT)
          .query({
            filters,
            from,
            to,
          })
          .expect(200);

        const { services } = decodeOrThrow(ServicesAPIResponseRT)(response.body);
        expect(services.length).to.be(0);
      });
      it('should return correct number of services running on specified host', async () => {
        const filters = JSON.stringify({
          'host.name': 'host-0',
        });
        const response = await supertestWithAdminScope
          .get(SERVICES_ENDPOINT)
          .set({
            'kbn-xsrf': 'some-xsrf-token',
          })
          .query({
            filters,
            from,
            to,
          })
          .expect(200);
        expect(response.body.services.length).to.equal(3);
      });
      it('should return bad request if unallowed filter', async () => {
        const filters = JSON.stringify({
          'host.name': 'host-0',
          'agent.name': 'nodejs',
        });
        await supertestWithAdminScope
          .get(SERVICES_ENDPOINT)

          .query({
            filters,
            from,
            to,
          })
          .expect(400);
      });
    });
    describe('with logs only', () => {
      before(async () =>
        synthtraceApmClient.index(
          generateServicesLogsOnlyData({ from, to, instanceCount: 1, servicesPerHost: 2 })
        )
      );
      after(async () => {
        await synthtraceApmClient.clean();
      });
      it('should return services with logs only data', async () => {
        const filters = JSON.stringify({
          'host.name': 'host-0',
        });
        const response = await supertestWithAdminScope
          .get(SERVICES_ENDPOINT)
          .set({
            'kbn-xsrf': 'some-xsrf-token',
          })
          .query({
            filters,
            from,
            to,
          })
          .expect(200);
        expect(response.body.services.length).to.equal(2);
      });
    });
  });
}
