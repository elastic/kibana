/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { log, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { ObservabilityOnboardingApiClientKey } from '../../../common/config';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { ObservabilityOnboardingApiError } from '../../../common/observability_onboarding_api_supertest';
import { expectToReject } from '../../../common/utils/expect_to_reject';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const observabilityOnboardingApiClient = getService('observabilityOnboardingApiClient');
  const synthtrace = getService('logSynthtraceEsClient');

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
            const agentId = 'my-agent-id';

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
                    payload: {
                      agentId,
                    },
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
              describe('with a different agentId', () => {
                describe('and onboarding type is logFiles', () => {
                  before(async () => {
                    await synthtrace.index([
                      timerange('2023-11-20T10:00:00.000Z', '2023-11-20T10:01:00.000Z')
                        .interval('1m')
                        .rate(1)
                        .generator((timestamp) =>
                          log
                            .create()
                            .message('This is a log message')
                            .timestamp(timestamp)
                            .dataset(datasetName)
                            .namespace(namespace)
                            .service('my-service')
                            .defaults({
                              'agent.id': 'another-agent-id',
                              'log.file.path': '/my-service.log',
                            })
                        ),
                    ]);
                  });

                  it('should return log-ingest as incomplete', async () => {
                    const request = await callApi({
                      onboardingId,
                    });

                    expect(request.status).to.be(200);

                    const logsIngestProgress = request.body.progress['logs-ingest'];
                    expect(logsIngestProgress).to.have.property('status', 'loading');
                  });

                  after(async () => {
                    await synthtrace.clean();
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
                          payload: {
                            agentId,
                          },
                        },
                      },
                    });

                    await synthtrace.index([
                      timerange('2023-11-20T10:00:00.000Z', '2023-11-20T10:01:00.000Z')
                        .interval('1m')
                        .rate(1)
                        .generator((timestamp) =>
                          log
                            .create()
                            .message('This is a system log message')
                            .timestamp(timestamp)
                            .dataset('system.syslog')
                            .namespace(namespace)
                            .defaults({
                              'agent.id': 'another-agent-id',
                              'log.file.path': '/var/log/system.log',
                            })
                        ),
                    ]);
                  });

                  it('should return log-ingest as incomplete', async () => {
                    const request = await callApi({
                      onboardingId: systemLogsOnboardingId,
                    });

                    expect(request.status).to.be(200);

                    const logsIngestProgress = request.body.progress['logs-ingest'];
                    expect(logsIngestProgress).to.have.property('status', 'loading');
                  });

                  after(async () => {
                    await synthtrace.clean();
                  });
                });
              });

              describe('with the expected agentId', () => {
                describe('and onboarding type is logFiles', () => {
                  before(async () => {
                    await synthtrace.index([
                      timerange('2023-11-20T10:00:00.000Z', '2023-11-20T10:01:00.000Z')
                        .interval('1m')
                        .rate(1)
                        .generator((timestamp) =>
                          log
                            .create()
                            .message('This is a log message')
                            .timestamp(timestamp)
                            .dataset(datasetName)
                            .namespace(namespace)
                            .service('my-service')
                            .defaults({
                              'agent.id': agentId,
                              'log.file.path': '/my-service.log',
                            })
                        ),
                    ]);
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
                    await synthtrace.clean();
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
                          payload: {
                            agentId,
                          },
                        },
                      },
                    });

                    await synthtrace.index([
                      timerange('2023-11-20T10:00:00.000Z', '2023-11-20T10:01:00.000Z')
                        .interval('1m')
                        .rate(1)
                        .generator((timestamp) =>
                          log
                            .create()
                            .message('This is a system log message')
                            .timestamp(timestamp)
                            .dataset('system.syslog')
                            .namespace(namespace)
                            .defaults({
                              'agent.id': agentId,
                              'log.file.path': '/var/log/system.log',
                            })
                        ),
                    ]);
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
                    await synthtrace.clean();
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
