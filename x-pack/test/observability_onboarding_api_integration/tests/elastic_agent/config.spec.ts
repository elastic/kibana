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
      describe('and onboarding type is logFiles', () => {
        before(async () => {
          const req = await observabilityOnboardingApiClient.logMonitoringUser({
            endpoint: 'POST /internal/observability_onboarding/logs/flow',
            params: {
              body: {
                type: 'logFiles',
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

        it('should return input properties configured', async () => {
          const req = await callApi({
            onboardingId,
          });

          expect(req.status).to.be(200);

          const ymlConfig = load(req.text);
          expect(ymlConfig.inputs[0].data_stream.namespace).to.be(namespace);
          expect(ymlConfig.inputs[0].streams[0].data_stream.dataset).to.be(datasetName);
          expect(ymlConfig.inputs[0].streams[0].paths).to.be.eql([logFilepath]);
          expect(ymlConfig.inputs[0].streams[0].processors[0].add_fields.fields.name).to.be.eql(
            serviceName
          );
        });
      });

      describe('and onboarding type is systemLogs', () => {
        before(async () => {
          const req = await observabilityOnboardingApiClient.logMonitoringUser({
            endpoint: 'POST /internal/observability_onboarding/logs/flow',
            params: {
              body: {
                type: 'systemLogs',
                name: 'name',
              },
            },
          });

          onboardingId = req.body.onboardingId;
        });

        it('should return input properties configured', async () => {
          const req = await callApi({
            onboardingId,
          });

          expect(req.status).to.be(200);

          const ymlConfig = load(req.text);
          expect(ymlConfig.inputs[0].data_stream.namespace).to.be('default');
          expect(ymlConfig.inputs[0].streams.length).to.be(2);
          expect(ymlConfig.inputs[0].streams[0].data_stream.dataset).to.be('system.auth');
          expect(ymlConfig.inputs[0].streams[1].data_stream.dataset).to.be('system.syslog');
        });
      });
    });
  });
}
