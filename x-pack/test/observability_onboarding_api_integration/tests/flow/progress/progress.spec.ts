/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ObservabilityOnboardingApiClientKey } from '../../../common/config';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { ObservabilityOnboardingApiError } from '../../../common/observability_onboarding_api_supertest';
import { expectToReject } from '../../../common/utils/expect_to_reject';
import { createLogDoc } from './es_utils';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const observabilityOnboardingApiClient = getService('observabilityOnboardingApiClient');
  const es = getService('es');

  async function callApi({
    onboardingId,
    user = 'logMonitoringUser',
  }: {
    onboardingId: string;
    user?: ObservabilityOnboardingApiClientKey;
  }) {
    return await observabilityOnboardingApiClient[user]({
      endpoint: 'GET /internal/observability_onboarding/flow/{onboardingId}/progress',
      params: {
        path: {
          onboardingId,
        },
      },
    });
  }

  registry.when('Get progress', { config: 'basic' }, () => {
    let onboardingId: string;
    const datasetName = 'api-tests';
    const namespace = 'default';

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
              logFilePaths: ['my-service.log'],
            },
          },
        },
      });

      onboardingId = req.body.onboardingId;
    });

    describe('when missing required privileges', () => {
      it('fails with a 404 error', async () => {
        const err = await expectToReject<ObservabilityOnboardingApiError>(
          async () =>
            await callApi({
              onboardingId,
              user: 'noAccessUser',
            })
        );

        expect(err.res.status).to.be(404);
        expect(err.res.body.message).to.contain('onboarding session not found');
      });
    });

    describe('when required privileges are set', () => {
      describe("when onboardingId doesn't exists", () => {
        it('fails with a 404 error', async () => {
          const err = await expectToReject<ObservabilityOnboardingApiError>(
            async () =>
              await callApi({
                onboardingId: 'my-onboarding-id',
              })
          );

          expect(err.res.status).to.be(404);
          expect(err.res.body.message).to.contain('onboarding session not found');
        });
      });

      describe('when onboardingId exists', () => {
        describe('when ea-status is not complete', () => {
          it('should skip log verification and return log-ingest as incomplete', async () => {
            const request = await callApi({
              onboardingId,
            });

            expect(request.status).to.be(200);

            const logsIngestProgress = request.body.progress['logs-ingest'];
            expect(logsIngestProgress).to.have.property('status', 'incomplete');
          });
        });

        describe('when ea-status is complete', () => {
          describe('should not skip logs verification', () => {
            before(async () => {
              await observabilityOnboardingApiClient.logMonitoringUser({
                endpoint: 'POST /internal/observability_onboarding/flow/{id}/step/{name}',
                params: {
                  path: {
                    id: onboardingId,
                    name: 'ea-status',
                  },
                  body: {
                    status: 'complete',
                  },
                },
              });
            });

            describe('when no logs have been ingested', () => {
              it('should return log-ingest as loading', async () => {
                const request = await callApi({
                  onboardingId,
                });

                expect(request.status).to.be(200);

                const logsIngestProgress = request.body.progress['logs-ingest'];
                expect(logsIngestProgress).to.have.property('status', 'loading');
              });
            });

            describe('when logs have been ingested', () => {
              describe('and onboarding type is logFiles', () => {
                before(async () => {
                  await es.indices.createDataStream({
                    name: `logs-${datasetName}-${namespace}`,
                  });

                  const doc = createLogDoc({
                    time: new Date('06/28/2023').getTime(),
                    logFilepath: '/my-service.log',
                    serviceName: 'my-service',
                    namespace,
                    datasetName,
                    message: 'This is a log message',
                  });

                  await es.bulk({
                    body: [{ create: { _index: `logs-${datasetName}-${namespace}` } }, doc],
                    refresh: 'wait_for',
                  });
                });

                it('should return log-ingest as complete', async () => {
                  const request = await callApi({
                    onboardingId,
                  });

                  expect(request.status).to.be(200);

                  const logsIngestProgress = request.body.progress['logs-ingest'];
                  expect(logsIngestProgress).to.have.property('status', 'complete');
                });

                after(async () => {
                  await es.indices.deleteDataStream({
                    name: `logs-${datasetName}-${namespace}`,
                  });
                });
              });

              describe('and onboarding type is systemLogs', () => {
                let systemLogsOnboardingId: string;

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

                  systemLogsOnboardingId = req.body.onboardingId;

                  await observabilityOnboardingApiClient.logMonitoringUser({
                    endpoint: 'POST /internal/observability_onboarding/flow/{id}/step/{name}',
                    params: {
                      path: {
                        id: systemLogsOnboardingId,
                        name: 'ea-status',
                      },
                      body: {
                        status: 'complete',
                      },
                    },
                  });

                  await es.indices.createDataStream({
                    name: `logs-system.syslog-${namespace}`,
                  });

                  const doc = createLogDoc({
                    time: new Date('06/28/2023').getTime(),
                    logFilepath: '/var/log/system.log',
                    namespace,
                    datasetName: 'system.syslog',
                    message: 'This is a system log message',
                  });

                  await es.bulk({
                    body: [{ create: { _index: `logs-system.syslog-${namespace}` } }, doc],
                    refresh: 'wait_for',
                  });
                });

                it('should return log-ingest as complete', async () => {
                  const request = await callApi({
                    onboardingId: systemLogsOnboardingId,
                  });

                  expect(request.status).to.be(200);

                  const logsIngestProgress = request.body.progress['logs-ingest'];
                  expect(logsIngestProgress).to.have.property('status', 'complete');
                });

                after(async () => {
                  await es.indices.deleteDataStream({
                    name: `logs-system.syslog-${namespace}`,
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}
