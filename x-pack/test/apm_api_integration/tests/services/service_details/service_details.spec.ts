/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { first } from 'lodash';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { dataConfig, generateData } from './generate_data';

type ServiceDetails = APIReturnType<'GET /internal/apm/services/{serviceName}/metadata/details'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const {
    service: { name: serviceName },
  } = dataConfig;
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi() {
    return await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/metadata/details',
      params: {
        path: { serviceName },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
        },
      },
    });
  }

  registry.when(
    'Service details when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const { status, body } = await callApi();

        expect(status).to.be(200);
        expect(body).to.empty();
      });
    }
  );

  registry.when('Service details when data is generated', { config: 'basic', archives: [] }, () => {
    let body: ServiceDetails;
    let status: number;

    before(async () => {
      await generateData({ synthtraceEsClient, start, end });
      const response = await callApi();
      body = response.body;
      status = response.status;
    });

    after(() => synthtraceEsClient.clean());

    it('returns correct HTTP status', () => {
      expect(status).to.be(200);
    });

    it('returns correct cloud details', () => {
      const { cloud } = dataConfig;
      const {
        provider,
        availabilityZone,
        region,
        machineType,
        projectName,
        serviceName: cloudServiceName,
      } = cloud;

      expect(first(body?.cloud?.availabilityZones)).to.be(availabilityZone);
      expect(first(body?.cloud?.machineTypes)).to.be(machineType);
      expect(body?.cloud?.provider).to.be(provider);
      expect(body?.cloud?.projectName).to.be(projectName);
      expect(body?.cloud?.serviceName).to.be(cloudServiceName);
      expect(first(body?.cloud?.regions)).to.be(region);
    });

    it('returns correct container details', () => {
      expect(body?.container?.totalNumberInstances).to.be(1);
    });

    it('returns correct serverless details', () => {
      const { cloud, serverless } = dataConfig;
      const { serviceName: cloudServiceName } = cloud;
      const { faasTriggerType, firstFunctionName, secondFunctionName } = serverless;

      expect(body?.serverless?.type).to.be(cloudServiceName);
      expect(body?.serverless?.functionNames).to.have.length(2);
      expect(body?.serverless?.functionNames).to.contain(firstFunctionName);
      expect(body?.serverless?.functionNames).to.contain(secondFunctionName);
      expect(first(body?.serverless?.faasTriggerTypes)).to.be(faasTriggerType);
    });

    it('returns correct service details', () => {
      const { service } = dataConfig;
      const { version, runtime, framework, agent } = service;
      const { name: runTimeName, version: runTimeVersion } = runtime;
      const { name: agentName, version: agentVersion } = agent;

      expect(body?.service?.framework).to.be(framework);
      expect(body?.service?.agent.name).to.be(agentName);
      expect(body?.service?.agent.version).to.be(agentVersion);
      expect(body?.service?.runtime?.name).to.be(runTimeName);
      expect(body?.service?.runtime?.version).to.be(runTimeVersion);
      expect(first(body?.service?.versions)).to.be(version);
    });
  });
}
