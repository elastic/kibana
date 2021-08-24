/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ALERT_DURATION,
  ALERT_END,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_UUID,
  EVENT_KIND,
} from '@kbn/rule-data-utils';
import { merge, omit } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

interface Alert {
  schedule: {
    interval: string;
  };
  updatedAt: string;
  executionStatus: {
    lastExecutionDate: string;
    status: string;
  };
  updatedBy: string;
  id: string;
  params: Record<string, unknown>;
  scheduledTaskId: string;
}

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertestAsApmWriteUser');
  const es = getService('es');

  const MAX_POLLS = 10;
  const BULK_INDEX_DELAY = 1000;
  const INDEXING_DELAY = 5000;

  const ALERTS_INDEX_TARGET = '.alerts-observability.apm.alerts*';
  const APM_METRIC_INDEX_NAME = 'apm-8.0.0-transaction';

  const createTransactionMetric = (override: Record<string, any>) => {
    const now = Date.now();

    const time = now - INDEXING_DELAY;

    return merge(
      {
        '@timestamp': new Date(time).toISOString(),
        service: {
          name: 'opbeans-go',
        },
        event: {
          outcome: 'success',
        },
        transaction: {
          duration: {
            histogram: {
              values: [1000000],
              counts: [1],
            },
          },
          type: 'request',
        },
        processor: {
          event: 'metric',
        },
        observer: {
          version_major: 7,
        },
      },
      override
    );
  };

  async function waitUntilNextExecution(
    alert: Alert,
    intervalInSeconds: number = 1,
    count: number = 0
  ): Promise<Alert> {
    await new Promise((resolve) => {
      setTimeout(resolve, intervalInSeconds * 1000);
    });

    const { body, status } = await supertest
      .get(`/api/alerts/alert/${alert.id}`)
      .set('kbn-xsrf', 'foo');

    if (status >= 300) {
      const error = new Error('Error getting alert');
      Object.assign(error, { response: { body, status } });
      throw error;
    }

    const nextAlert = body as Alert;

    if (nextAlert.executionStatus.lastExecutionDate !== alert.executionStatus.lastExecutionDate) {
      await new Promise((resolve) => {
        setTimeout(resolve, BULK_INDEX_DELAY);
      });
      await es.indices.refresh({
        index: ALERTS_INDEX_TARGET,
      });

      return nextAlert;
    }

    if (count >= MAX_POLLS) {
      throw new Error('Maximum number of polls exceeded');
    }

    return waitUntilNextExecution(alert, intervalInSeconds, count + 1);
  }

  registry.when('Rule registry with write enabled', { config: 'rules', archives: [] }, () => {
    it('does not bootstrap indices on plugin startup', async () => {
      const { body } = await es.indices.get({
        index: ALERTS_INDEX_TARGET,
        expand_wildcards: 'open',
        allow_no_indices: true,
      });

      const indices = Object.entries(body).map(([indexName, index]) => {
        return {
          indexName,
          index,
        };
      });

      expect(indices.length).to.be(0);
    });

    describe('when creating a rule', () => {
      let createResponse: {
        alert: Alert;
        status: number;
      };

      before(async () => {
        await es.indices.create({
          index: APM_METRIC_INDEX_NAME,
          body: {
            mappings: {
              dynamic: 'strict',
              properties: {
                event: {
                  properties: {
                    outcome: {
                      type: 'keyword',
                    },
                  },
                },
                processor: {
                  properties: {
                    event: {
                      type: 'keyword',
                    },
                  },
                },
                observer: {
                  properties: {
                    version_major: {
                      type: 'byte',
                    },
                  },
                },
                service: {
                  properties: {
                    name: {
                      type: 'keyword',
                    },
                    environment: {
                      type: 'keyword',
                    },
                  },
                },
                transaction: {
                  properties: {
                    type: {
                      type: 'keyword',
                    },
                    duration: {
                      properties: {
                        histogram: {
                          type: 'histogram',
                        },
                      },
                    },
                  },
                },
                '@timestamp': {
                  type: 'date',
                },
              },
            },
          },
        });

        const body = {
          params: {
            threshold: 30,
            windowSize: 5,
            windowUnit: 'm',
            transactionType: 'request',
            environment: 'ENVIRONMENT_ALL',
            serviceName: 'opbeans-go',
          },
          consumer: 'apm',
          alertTypeId: 'apm.transaction_error_rate',
          schedule: { interval: '5s' },
          actions: [],
          tags: ['apm', 'service.name:opbeans-go'],
          notifyWhen: 'onActionGroupChange',
          name: 'Failed transaction rate threshold | opbeans-go',
        };

        const { body: response, status } = await supertest
          .post('/api/alerts/alert')
          .send(body)
          .set('kbn-xsrf', 'foo');

        createResponse = {
          alert: response,
          status,
        };
      });

      after(async () => {
        if (createResponse.alert) {
          const { body, status } = await supertest
            .delete(`/api/alerts/alert/${createResponse.alert.id}`)
            .set('kbn-xsrf', 'foo');

          if (status >= 300) {
            const error = new Error('Error deleting alert');
            Object.assign(error, { response: { body, status } });
            throw error;
          }
        }

        await es.deleteByQuery({
          index: ALERTS_INDEX_TARGET,
          body: {
            query: {
              match_all: {},
            },
          },
          refresh: true,
        });

        await es.indices.delete({
          index: APM_METRIC_INDEX_NAME,
        });
      });

      it('writes alerts data to the alert indices', async () => {
        expect(createResponse.status).to.be.below(299);

        expect(createResponse.alert).not.to.be(undefined);

        let alert = await waitUntilNextExecution(createResponse.alert);

        const beforeDataResponse = await es.search({
          index: ALERTS_INDEX_TARGET,
          body: {
            query: {
              term: {
                [EVENT_KIND]: 'signal',
              },
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        });

        expect(beforeDataResponse.body.hits.hits.length).to.be(0);

        await es.index({
          index: APM_METRIC_INDEX_NAME,
          body: createTransactionMetric({
            event: {
              outcome: 'success',
            },
          }),
          refresh: true,
        });

        alert = await waitUntilNextExecution(alert);

        const afterInitialDataResponse = await es.search({
          index: ALERTS_INDEX_TARGET,
          body: {
            query: {
              term: {
                [EVENT_KIND]: 'signal',
              },
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        });

        expect(afterInitialDataResponse.body.hits.hits.length).to.be(0);

        await es.index({
          index: APM_METRIC_INDEX_NAME,
          body: createTransactionMetric({
            event: {
              outcome: 'failure',
            },
          }),
          refresh: true,
        });

        alert = await waitUntilNextExecution(alert);

        const afterViolatingDataResponse = await es.search({
          index: ALERTS_INDEX_TARGET,
          body: {
            query: {
              term: {
                [EVENT_KIND]: 'signal',
              },
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
            _source: false,
            fields: [{ field: '*', include_unmapped: true }],
          },
        });

        expect(afterViolatingDataResponse.body.hits.hits.length).to.be(1);

        const alertEvent = afterViolatingDataResponse.body.hits.hits[0].fields as Record<
          string,
          any
        >;

        const exclude = ['@timestamp', ALERT_START, ALERT_UUID, ALERT_RULE_UUID];

        const toCompare = omit(alertEvent, exclude);

        expectSnapshot(toCompare).toMatchInline(`
          Object {
            "event.action": Array [
              "open",
            ],
            "event.kind": Array [
              "signal",
            ],
            "kibana.alert.duration.us": Array [
              0,
            ],
            "kibana.alert.evaluation.threshold": Array [
              30,
            ],
            "kibana.alert.evaluation.value": Array [
              50,
            ],
            "kibana.alert.id": Array [
              "apm.transaction_error_rate_opbeans-go_request_ENVIRONMENT_NOT_DEFINED",
            ],
            "kibana.alert.reason": Array [
              "Failed transactions rate is greater than 30% (current value is 50%) for opbeans-go",
            ],
            "kibana.alert.rule.category": Array [
              "Failed transaction rate threshold",
            ],
            "kibana.alert.rule.consumer": Array [
              "apm",
            ],
            "kibana.alert.rule.name": Array [
              "Failed transaction rate threshold | opbeans-go",
            ],
            "kibana.alert.rule.producer": Array [
              "apm",
            ],
            "kibana.alert.rule.rule_type_id": Array [
              "apm.transaction_error_rate",
            ],
            "kibana.alert.status": Array [
              "open",
            ],
            "kibana.alert.workflow_status": Array [
              "open",
            ],
            "kibana.space_ids": Array [
              "default",
            ],
            "processor.event": Array [
              "transaction",
            ],
            "service.name": Array [
              "opbeans-go",
            ],
            "tags": Array [
              "apm",
              "service.name:opbeans-go",
            ],
            "transaction.type": Array [
              "request",
            ],
          }
        `);

        await es.bulk({
          index: APM_METRIC_INDEX_NAME,
          body: [
            { index: {} },
            createTransactionMetric({
              event: {
                outcome: 'success',
              },
            }),
            { index: {} },
            createTransactionMetric({
              event: {
                outcome: 'success',
              },
            }),
          ],
          refresh: true,
        });

        alert = await waitUntilNextExecution(alert);

        const afterRecoveryResponse = await es.search({
          index: ALERTS_INDEX_TARGET,
          body: {
            query: {
              term: {
                [EVENT_KIND]: 'signal',
              },
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
            _source: false,
            fields: [{ field: '*', include_unmapped: true }],
          },
        });

        expect(afterRecoveryResponse.body.hits.hits.length).to.be(1);

        const recoveredAlertEvent = afterRecoveryResponse.body.hits.hits[0].fields as Record<
          string,
          any
        >;

        expect(recoveredAlertEvent[ALERT_STATUS]?.[0]).to.eql('closed');
        expect(recoveredAlertEvent[ALERT_DURATION]?.[0]).to.be.greaterThan(0);
        expect(new Date(recoveredAlertEvent[ALERT_END]?.[0]).getTime()).to.be.greaterThan(0);

        expectSnapshot(omit(recoveredAlertEvent, exclude.concat([ALERT_DURATION, ALERT_END])))
          .toMatchInline(`
          Object {
            "event.action": Array [
              "close",
            ],
            "event.kind": Array [
              "signal",
            ],
            "kibana.alert.evaluation.threshold": Array [
              30,
            ],
            "kibana.alert.evaluation.value": Array [
              50,
            ],
            "kibana.alert.id": Array [
              "apm.transaction_error_rate_opbeans-go_request_ENVIRONMENT_NOT_DEFINED",
            ],
            "kibana.alert.reason": Array [
              "Failed transactions rate is greater than 30% (current value is 50%) for opbeans-go",
            ],
            "kibana.alert.rule.category": Array [
              "Failed transaction rate threshold",
            ],
            "kibana.alert.rule.consumer": Array [
              "apm",
            ],
            "kibana.alert.rule.name": Array [
              "Failed transaction rate threshold | opbeans-go",
            ],
            "kibana.alert.rule.producer": Array [
              "apm",
            ],
            "kibana.alert.rule.rule_type_id": Array [
              "apm.transaction_error_rate",
            ],
            "kibana.alert.status": Array [
              "closed",
            ],
            "kibana.alert.workflow_status": Array [
              "open",
            ],
            "kibana.space_ids": Array [
              "default",
            ],
            "processor.event": Array [
              "transaction",
            ],
            "service.name": Array [
              "opbeans-go",
            ],
            "tags": Array [
              "apm",
              "service.name:opbeans-go",
            ],
            "transaction.type": Array [
              "request",
            ],
          }
        `);
      });
    });
  });

  registry.when('Rule registry with write not enabled', { config: 'basic', archives: [] }, () => {
    it('does not bootstrap the apm rule indices', async () => {
      const errorOrUndefined = await es.indices
        .get({
          index: ALERTS_INDEX_TARGET,
          expand_wildcards: 'open',
          allow_no_indices: false,
        })
        .then(() => {})
        .catch((error) => {
          return error.toString();
        });

      expect(errorOrUndefined).not.to.be(undefined);

      expect(errorOrUndefined).to.contain('index_not_found_exception');
    });
  });
}
