/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { log, apm, generateShortId, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { LogCategory } from '@kbn/apm-plugin/server/routes/assistant_functions/get_log_categories';
import { SupertestReturnType } from '../../common/obs_api_supertest';
import { ObsFtrProviderContext } from '../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ApiTest({ getService }: ObsFtrProviderContext) {
  const obsApiClient = getService('obsApiClient');
  const apmSynthtraceClient = getService('apmSynthtraceEsClient');
  const logSynthtraceClient = getService('logSynthtraceEsClient');
  const security = getService('security');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('fetching observability alerts details context for AI assistant contextual insights', () => {
    const start = moment().subtract(10, 'minutes').valueOf();
    const end = moment().valueOf();
    const range = timerange(start, end);

    describe('when no traces or logs are available', () => {
      let response: SupertestReturnType<'GET /internal/observability/assistant/alert_details_contextual_insights'>;
      before(async () => {
        response = await obsApiClient.adminUser({
          endpoint: 'GET /internal/observability/assistant/alert_details_contextual_insights',
          params: {
            query: {
              alert_started_at: new Date(end).toISOString(),
            },
          },
        });
      });

      it('returns nothing', () => {
        expect(response.body.alertContext).to.eql([]);
      });
    });

    describe('when traces and logs are ingested and logs are not annotated with service.name', () => {
      before(async () => {
        await Promise.all([
          ingestTraces({ 'service.name': 'Backend', 'container.id': 'my-container-a' }),
          ingestLogs({
            'container.id': 'my-container-a',
            'kubernetes.pod.name': 'pod-a',
          }),
        ]);
      });

      after(async () => {
        await cleanup();
      });

      describe('when no params are specified', () => {
        let response: SupertestReturnType<'GET /internal/observability/assistant/alert_details_contextual_insights'>;
        before(async () => {
          response = await obsApiClient.adminUser({
            endpoint: 'GET /internal/observability/assistant/alert_details_contextual_insights',
            params: {
              query: {
                alert_started_at: new Date(end).toISOString(),
              },
            },
          });
        });

        it('returns only 1 log category', async () => {
          expect(response.body.alertContext).to.have.length(1);

          const logCategories = response.body.alertContext.find(
            ({ key }) => key === 'logCategories'
          )?.data as LogCategory[];

          expect(
            logCategories.map(({ errorCategory }: { errorCategory: string }) => errorCategory)
          ).to.eql(['Error message from container my-container-a']);
        });
      });

      describe('when service name is specified', () => {
        let response: SupertestReturnType<'GET /internal/observability/assistant/alert_details_contextual_insights'>;
        before(async () => {
          response = await obsApiClient.adminUser({
            endpoint: 'GET /internal/observability/assistant/alert_details_contextual_insights',
            params: {
              query: {
                alert_started_at: new Date(end).toISOString(),
                'service.name': 'Backend',
              },
            },
          });
        });

        it('returns service summary', () => {
          const serviceSummary = response.body.alertContext.find(
            ({ key }) => key === 'serviceSummary'
          );
          expect(serviceSummary?.data).to.eql({
            'service.name': 'Backend',
            'service.environment': ['production'],
            'agent.name': 'java',
            'service.version': ['1.0.0'],
            'language.name': 'java',
            instances: 1,
            anomalies: [],
            alerts: [],
            deployments: [],
          });
        });

        it('returns downstream dependencies', async () => {
          const downstreamDependencies = response.body.alertContext.find(
            ({ key }) => key === 'downstreamDependencies'
          );
          expect(downstreamDependencies?.data).to.eql([
            {
              'span.destination.service.resource': 'elasticsearch',
              'span.type': 'db',
              'span.subtype': 'elasticsearch',
            },
          ]);
        });

        it('returns log categories', () => {
          const logCategories = response.body.alertContext.find(
            ({ key }) => key === 'logCategories'
          )?.data as LogCategory[];

          expect(logCategories).to.have.length(1);

          const logCategory = logCategories[0];
          expect(logCategory?.sampleMessage).to.match(
            /Error message #\d{16} from container my-container-a/
          );
          expect(logCategory?.docCount).to.be.greaterThan(0);
          expect(logCategory?.errorCategory).to.be('Error message from container my-container-a');
        });
      });

      describe('when container id is specified', () => {
        let response: SupertestReturnType<'GET /internal/observability/assistant/alert_details_contextual_insights'>;
        before(async () => {
          response = await obsApiClient.adminUser({
            endpoint: 'GET /internal/observability/assistant/alert_details_contextual_insights',
            params: {
              query: {
                alert_started_at: new Date(end).toISOString(),
                'container.id': 'my-container-a',
              },
            },
          });
        });

        it('returns service summary', () => {
          const serviceSummary = response.body.alertContext.find(
            ({ key }) => key === 'serviceSummary'
          );
          expect(serviceSummary?.data).to.eql({
            'service.name': 'Backend',
            'service.environment': ['production'],
            'agent.name': 'java',
            'service.version': ['1.0.0'],
            'language.name': 'java',
            instances: 1,
            anomalies: [],
            alerts: [],
            deployments: [],
          });
        });

        it('returns downstream dependencies', async () => {
          const downstreamDependencies = response.body.alertContext.find(
            ({ key }) => key === 'downstreamDependencies'
          );
          expect(downstreamDependencies?.data).to.eql([
            {
              'span.destination.service.resource': 'elasticsearch',
              'span.type': 'db',
              'span.subtype': 'elasticsearch',
            },
          ]);
        });

        it('returns log categories', () => {
          const logCategories = response.body.alertContext.find(
            ({ key }) => key === 'logCategories'
          )?.data as LogCategory[];
          expect(logCategories).to.have.length(1);

          const logCategory = logCategories[0];
          expect(logCategory?.sampleMessage).to.match(
            /Error message #\d{16} from container my-container-a/
          );
          expect(logCategory?.docCount).to.be.greaterThan(0);
          expect(logCategory?.errorCategory).to.be('Error message from container my-container-a');
        });
      });

      describe('when non-existing container id is specified', () => {
        let response: SupertestReturnType<'GET /internal/observability/assistant/alert_details_contextual_insights'>;
        before(async () => {
          response = await obsApiClient.adminUser({
            endpoint: 'GET /internal/observability/assistant/alert_details_contextual_insights',
            params: {
              query: {
                alert_started_at: new Date(end).toISOString(),
                'container.id': 'non-existing-container',
              },
            },
          });
        });

        it('returns nothing', () => {
          expect(response.body.alertContext).to.eql([]);
        });
      });

      describe('when non-existing service.name is specified', () => {
        let response: SupertestReturnType<'GET /internal/observability/assistant/alert_details_contextual_insights'>;
        before(async () => {
          response = await obsApiClient.adminUser({
            endpoint: 'GET /internal/observability/assistant/alert_details_contextual_insights',
            params: {
              query: {
                alert_started_at: new Date(end).toISOString(),
                'service.name': 'non-existing-service',
              },
            },
          });
        });

        it('returns empty service summary', () => {
          const serviceSummary = response.body.alertContext.find(
            ({ key }) => key === 'serviceSummary'
          );
          expect(serviceSummary?.data).to.eql({
            'service.name': 'non-existing-service',
            'service.environment': [],
            instances: 1,
            anomalies: [],
            alerts: [],
            deployments: [],
          });
        });

        it('returns no downstream dependencies', async () => {
          const downstreamDependencies = response.body.alertContext.find(
            ({ key }) => key === 'downstreamDependencies'
          );
          expect(downstreamDependencies).to.eql(undefined);
        });

        it('returns log categories', () => {
          const logCategories = response.body.alertContext.find(
            ({ key }) => key === 'logCategories'
          )?.data as LogCategory[];
          expect(logCategories).to.have.length(1);
        });
      });
    });

    describe('when traces and logs are ingested and logs are annotated with service.name', () => {
      before(async () => {
        await ingestTraces({ 'service.name': 'Backend', 'container.id': 'my-container-a' });
        await ingestLogs({
          'service.name': 'Backend',
          'container.id': 'my-container-a',
          'kubernetes.pod.name': 'pod-a',
        });

        // also ingest unrelated Frontend traces and logs that should not show up in the response when fetching "Backend"-related things
        await ingestTraces({ 'service.name': 'Frontend', 'container.id': 'my-container-b' });
        await ingestLogs({
          'service.name': 'Frontend',
          'container.id': 'my-container-b',
          'kubernetes.pod.name': 'pod-b',
        });

        // also ingest logs that are not annotated with service.name
        await ingestLogs({
          'container.id': 'my-container-c',
          'kubernetes.pod.name': 'pod-c',
        });
      });

      after(async () => {
        await cleanup();
      });

      describe('when no params are specified', () => {
        let response: SupertestReturnType<'GET /internal/observability/assistant/alert_details_contextual_insights'>;
        before(async () => {
          response = await obsApiClient.adminUser({
            endpoint: 'GET /internal/observability/assistant/alert_details_contextual_insights',
            params: {
              query: {
                alert_started_at: new Date(end).toISOString(),
              },
            },
          });
        });

        it('returns no service summary', async () => {
          const serviceSummary = response.body.alertContext.find(
            ({ key }) => key === 'serviceSummary'
          );
          expect(serviceSummary).to.be(undefined);
        });

        it('returns 1 log category', async () => {
          const logCategories = response.body.alertContext.find(
            ({ key }) => key === 'logCategories'
          )?.data as LogCategory[];
          expect(
            logCategories.map(({ errorCategory }: { errorCategory: string }) => errorCategory)
          ).to.eql(['Error message from service', 'Error message from container my-container-c']);
        });
      });

      describe('when service name is specified', () => {
        let response: SupertestReturnType<'GET /internal/observability/assistant/alert_details_contextual_insights'>;
        before(async () => {
          response = await obsApiClient.adminUser({
            endpoint: 'GET /internal/observability/assistant/alert_details_contextual_insights',
            params: {
              query: {
                alert_started_at: new Date(end).toISOString(),
                'service.name': 'Backend',
              },
            },
          });
        });

        it('returns log categories', () => {
          const logCategories = response.body.alertContext.find(
            ({ key }) => key === 'logCategories'
          )?.data as LogCategory[];
          expect(logCategories).to.have.length(1);

          const logCategory = logCategories[0];
          expect(logCategory?.sampleMessage).to.match(/Error message #\d{16} from service Backend/);
          expect(logCategory?.docCount).to.be.greaterThan(0);
          expect(logCategory?.errorCategory).to.be('Error message from service Backend');
        });
      });

      describe('when container id is specified', () => {
        let response: SupertestReturnType<'GET /internal/observability/assistant/alert_details_contextual_insights'>;
        before(async () => {
          response = await obsApiClient.adminUser({
            endpoint: 'GET /internal/observability/assistant/alert_details_contextual_insights',
            params: {
              query: {
                alert_started_at: new Date(end).toISOString(),
                'container.id': 'my-container-a',
              },
            },
          });
        });

        it('returns log categories', () => {
          const logCategories = response.body.alertContext.find(
            ({ key }) => key === 'logCategories'
          )?.data as LogCategory[];
          expect(logCategories).to.have.length(1);

          const logCategory = logCategories[0];
          expect(logCategory?.sampleMessage).to.match(/Error message #\d{16} from service Backend/);
          expect(logCategory?.docCount).to.be.greaterThan(0);
          expect(logCategory?.errorCategory).to.be('Error message from service Backend');
        });
      });

      describe('when non-existing service.name is specified', () => {
        let response: SupertestReturnType<'GET /internal/observability/assistant/alert_details_contextual_insights'>;
        before(async () => {
          response = await obsApiClient.adminUser({
            endpoint: 'GET /internal/observability/assistant/alert_details_contextual_insights',
            params: {
              query: {
                alert_started_at: new Date(end).toISOString(),
                'service.name': 'non-existing-service',
              },
            },
          });
        });

        it('returns empty service summary', () => {
          const serviceSummary = response.body.alertContext.find(
            ({ key }) => key === 'serviceSummary'
          );
          expect(serviceSummary?.data).to.eql({
            'service.name': 'non-existing-service',
            'service.environment': [],
            instances: 1,
            anomalies: [],
            alerts: [],
            deployments: [],
          });
        });

        it('does not return log categories', () => {
          const logCategories = response.body.alertContext.find(
            ({ key }) => key === 'logCategories'
          )?.data as LogCategory[];
          expect(logCategories).to.have.length(1);

          expect(
            logCategories.map(({ errorCategory }: { errorCategory: string }) => errorCategory)
          ).to.eql(['Error message from container my-container-c']);
        });
      });
    });

    function ingestTraces(eventMetadata: {
      'service.name': string;
      'container.id'?: string;
      'host.name'?: string;
      'kubernetes.pod.name'?: string;
    }) {
      const serviceInstance = apm
        .service({
          name: eventMetadata['service.name'],
          environment: 'production',
          agentName: 'java',
        })
        .instance('my-instance');

      const events = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return serviceInstance
            .transaction({ transactionName: 'tx' })
            .timestamp(timestamp)
            .duration(10000)
            .defaults({ 'service.version': '1.0.0', ...eventMetadata })
            .outcome('success')
            .children(
              serviceInstance
                .span({
                  spanName: 'GET apm-*/_search',
                  spanType: 'db',
                  spanSubtype: 'elasticsearch',
                })
                .duration(1000)
                .success()
                .destination('elasticsearch')
                .timestamp(timestamp)
            );
        });

      return apmSynthtraceClient.index(events);
    }

    function ingestLogs(eventMetadata: {
      'service.name'?: string;
      'container.id'?: string;
      'kubernetes.pod.name'?: string;
      'host.name'?: string;
    }) {
      const getMessage = () => {
        const msgPrefix = `Error message #${generateShortId()}`;

        if (eventMetadata['service.name']) {
          return `${msgPrefix} from service ${eventMetadata['service.name']}`;
        }

        if (eventMetadata['container.id']) {
          return `${msgPrefix} from container ${eventMetadata['container.id']}`;
        }

        if (eventMetadata['kubernetes.pod.name']) {
          return `${msgPrefix} from pod ${eventMetadata['kubernetes.pod.name']}`;
        }

        if (eventMetadata['host.name']) {
          return `${msgPrefix} from host ${eventMetadata['host.name']}`;
        }

        return msgPrefix;
      };

      const events = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return [
            log
              .create()
              .message(getMessage())
              .logLevel('error')
              .defaults({
                'trace.id': generateShortId(),
                'agent.name': 'synth-agent',
                ...eventMetadata,
              })
              .timestamp(timestamp),
          ];
        });

      return logSynthtraceClient.index(events);
    }

    async function cleanup() {
      await apmSynthtraceClient.clean();
      await logSynthtraceClient.clean();
    }

    describe('security roles and access privileges', () => {
      it('is not available to unauthorized users', async () => {
        const UNAUTHORIZED_USERNAME = 'UNAUTHORIZED_USER';
        const UNAUTHORIZED_USER_PASSWORD = 'UNAUTHORIZED_USER_PASSWORD';

        // Create a user with no privileges
        await security.user.create(UNAUTHORIZED_USERNAME, {
          password: UNAUTHORIZED_USER_PASSWORD,
          roles: [],
          full_name: 'Unauthorized Test User',
        });

        try {
          // Make a request to the target API with insufficient privileges
          await supertestWithoutAuth
            .get('/internal/observability/assistant/alert_details_contextual_insights')
            .auth(UNAUTHORIZED_USERNAME, UNAUTHORIZED_USER_PASSWORD)
            .query({ alertId: 'test-alert-id' })
            .set('kbn-xsrf', 'true')
            .expect(403)
            .then(({ body }: any) => {
              expect(body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message:
                  'API [GET /internal/observability/assistant/alert_details_contextual_insights?alertId=test-alert-id] is unauthorized for user, this action is granted by the Kibana privileges [ai_assistant]',
              });
            });
        } finally {
          await security.user.delete(UNAUTHORIZED_USERNAME);
        }
      });
    });
  });
}
