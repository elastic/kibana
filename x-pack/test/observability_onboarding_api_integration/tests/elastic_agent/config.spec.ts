/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { load } from 'js-yaml';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const observabilityOnboardingApiClient = getService('observabilityOnboardingApiClient');

  async function callApi({ onboardingId }: { onboardingId: string }) {
    return await observabilityOnboardingApiClient.logMonitoringUser({
      endpoint: 'GET /internal/observability_onboarding/elastic_agent/config',
      params: {
        query: {
          onboardingId,
        },
      },
    });
  }

  registry.when('Generate elastic_agent yml', { config: 'basic' }, () => {
    let onboardingId: string;
    const datasetName = 'api-tests';
    const namespace = 'default';
    const logFilepath = '/my-logs.log';
    const serviceName = 'my-service';

    before(async () => {
      const req = await observabilityOnboardingApiClient.logMonitoringUser({
        endpoint: 'POST /internal/observability_onboarding/custom_logs/save',
        params: {
          body: {
            name: 'name',
            state: {
              datasetName,
              namespace,
              logFilePaths: [logFilepath],
              serviceName,
            },
          },
        },
      });

      onboardingId = req.body.onboardingId;
    });

    describe("when onboardingId doesn't exists", () => {
      it('should return input properties empty', async () => {
        const req = await callApi({
          onboardingId: 'my-onboarding-id',
        });

        expect(req.status).to.be(200);

        const ymlConfig = load(req.text);
        expect(ymlConfig.inputs[0].data_stream.namespace).to.be('');
        expect(ymlConfig.inputs[0].streams[0].data_stream.dataset).to.be('');
        expect(ymlConfig.inputs[0].streams[0].paths).to.be.empty();
      });
    });

    describe('when onboardingId exists', () => {
      it('should return input properties configured', async () => {
        const req = await callApi({
          onboardingId,
        });

        expect(req.status).to.be(200);

        const ymlConfig = load(req.text);
        expect(ymlConfig.inputs[0].data_stream.namespace).to.be(namespace);
        expect(ymlConfig.inputs[0].streams[0].data_stream.dataset).to.be(datasetName);
        expect(ymlConfig.inputs[0].streams[0].paths).to.be.eql([logFilepath]);
      });
    });
  });
}
