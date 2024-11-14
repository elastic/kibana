/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';
import {
  createServiceGroupApi,
  deleteAllServiceGroups,
  getServiceGroupCounts,
} from '../service_groups_api_methods';
import { generateData } from './generate_data';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const synthtrace = getService('synthtrace');
  const apmApiClient = getService('apmApi');
  const start = Date.now() - 24 * 60 * 60 * 1000;
  const end = Date.now();

  describe('Service group counts', () => {
    let synthbeansServiceGroupId: string;
    let opbeansServiceGroupId: string;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    before(async () => {
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

      const [, { body: synthbeansServiceGroup }, { body: opbeansServiceGroup }] = await Promise.all(
        [
          generateData({ start, end, apmSynthtraceEsClient }),
          createServiceGroupApi({
            apmApiClient,
            groupName: 'synthbeans',
            kuery: 'service.name: synth*',
          }),
          createServiceGroupApi({
            apmApiClient,
            groupName: 'opbeans',
            kuery: 'service.name: opbeans*',
          }),
        ]
      );
      synthbeansServiceGroupId = synthbeansServiceGroup.id;
      opbeansServiceGroupId = opbeansServiceGroup.id;
    });

    after(async () => {
      await deleteAllServiceGroups(apmApiClient);
      await apmSynthtraceEsClient.clean();
    });

    it('returns the correct number of services', async () => {
      const response = await getServiceGroupCounts(apmApiClient);
      expect(response.status).to.be(200);
      expect(Object.keys(response.body).length).to.be(2);
      expect(response.body[synthbeansServiceGroupId]).to.have.property('services', 2);
      expect(response.body[opbeansServiceGroupId]).to.have.property('services', 1);
    });
  });
}
