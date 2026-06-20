/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

const APM_SERVICE_1 = 'agent-builder-svc-1';
const APM_SERVICE_2 = 'agent-builder-svc-2';
const START = new Date('2024-01-01T00:00:00.000Z');
const END = new Date('2024-01-01T00:15:00.000Z');

const ENDPOINT = '/api/apm/services';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe('GET /api/apm/services', () => {
    describe('when there is no data', () => {
      it('returns an empty services list', async () => {
        const supertest = await roleScopedSupertest.getSupertestWithRoleScope('editor');
        const response = await supertest
          .get(ENDPOINT)
          .query({ start: START.toISOString(), end: END.toISOString() })
          .set('kbn-xsrf', 'true');

        expect(response.status).to.be(200);
        expect(response.body.services).to.be.an('array');
        expect(response.body.services.length).to.be(0);
        expect(response.body.maxCountExceeded).to.be(false);
      });

      it('uses schema defaults when start/end are omitted', async () => {
        const supertest = await roleScopedSupertest.getSupertestWithRoleScope('editor');
        const response = await supertest.get(ENDPOINT).set('kbn-xsrf', 'true');

        expect(response.status).to.be(200);
        expect(response.body.services).to.be.an('array');
      });
    });

    describe('when data is loaded', () => {
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

        const service1 = apm
          .service({ name: APM_SERVICE_1, environment: 'production', agentName: 'nodejs' })
          .instance('instance-1');

        const service2 = apm
          .service({ name: APM_SERVICE_2, environment: 'staging', agentName: 'java' })
          .instance('instance-2');

        await apmSynthtraceEsClient.index(
          timerange(START, END)
            .interval('1m')
            .rate(10)
            .generator((timestamp) => [
              service1
                .transaction({ transactionName: 'GET /api' })
                .duration(100)
                .success()
                .timestamp(timestamp),
              service2
                .transaction({ transactionName: 'POST /data' })
                .duration(200)
                .failure()
                .timestamp(timestamp),
            ])
        );
      });

      after(() => apmSynthtraceEsClient.clean());

      it('returns APM services with performance metrics', async () => {
        const supertest = await roleScopedSupertest.getSupertestWithRoleScope('editor');
        const response = await supertest
          .get(ENDPOINT)
          .query({ start: START.toISOString(), end: END.toISOString() })
          .set('kbn-xsrf', 'true');

        expect(response.status).to.be(200);
        expect(response.body.services).to.be.an('array');
        expect(response.body.maxCountExceeded).to.be(false);

        const serviceNames = response.body.services.map(
          (s: { serviceName: string }) => s.serviceName
        );
        expect(serviceNames).to.contain(APM_SERVICE_1);
        expect(serviceNames).to.contain(APM_SERVICE_2);
      });

      it('returns agent-shaped fields on each service', async () => {
        const supertest = await roleScopedSupertest.getSupertestWithRoleScope('editor');
        const response = await supertest
          .get(ENDPOINT)
          .query({ start: START.toISOString(), end: END.toISOString() })
          .set('kbn-xsrf', 'true');

        const svc1 = response.body.services.find(
          (s: { serviceName: string }) => s.serviceName === APM_SERVICE_1
        );

        expect(svc1).to.be.ok();
        if (!svc1) return;
        expect(svc1).to.have.property('serviceName', APM_SERVICE_1);
        expect(svc1).to.have.property('anomalySeverity');
        if (svc1.latency != null) {
          expect(svc1.latency).to.be.a('number');
        }
      });

      it('filters by kqlFilter', async () => {
        const supertest = await roleScopedSupertest.getSupertestWithRoleScope('editor');
        const response = await supertest
          .get(ENDPOINT)
          .query({
            start: START.toISOString(),
            end: END.toISOString(),
            kqlFilter: `service.name: "${APM_SERVICE_1}"`,
          })
          .set('kbn-xsrf', 'true');

        expect(response.status).to.be(200);
        const serviceNames = response.body.services.map(
          (s: { serviceName: string }) => s.serviceName
        );
        expect(serviceNames).to.contain(APM_SERVICE_1);
        expect(serviceNames).not.to.contain(APM_SERVICE_2);
      });

      it('uses schema defaults when start/end are omitted', async () => {
        const supertest = await roleScopedSupertest.getSupertestWithRoleScope('editor');
        const response = await supertest.get(ENDPOINT).set('kbn-xsrf', 'true');

        expect(response.status).to.be(200);
        expect(response.body.services).to.be.an('array');
      });
    });
  });
}
