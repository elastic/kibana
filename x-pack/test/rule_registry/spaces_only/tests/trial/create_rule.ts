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
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_UUID,
  EVENT_KIND,
  VERSION,
} from '@kbn/rule-data-utils';
import { omit } from 'lodash';
import { Rule } from '@kbn/alerting-plugin/common';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  getAlertsTargetIndices,
  createApmMetricIndex,
  createAlert,
  waitUntilNextExecution,
  createTransactionMetric,
  cleanupTargetIndices,
  deleteAlert,
} from '../../../common/lib/helpers';
import { AlertDef, AlertParams } from '../../../common/types';
import { APM_METRIC_INDEX_NAME } from '../../../common/constants';
import { obsOnly } from '../../../common/lib/authentication/users';

const SPACE_ID = 'space1';

// eslint-disable-next-line import/no-default-export
export default function registryRulesApiTest({ getService }: FtrProviderContext) {
  const es = getService('es');

  // FAILING ES PROMOTION: https://github.com/elastic/kibana/issues/125851
  describe.skip('Rule Registry API', () => {
    describe('with write permissions', () => {
      it('does not bootstrap indices on plugin startup', async () => {
        const { body: targetIndices } = await getAlertsTargetIndices(getService, obsOnly, SPACE_ID);
        try {
          const res = await es.indices.get({
            index: targetIndices[0],
            expand_wildcards: 'open',
            allow_no_indices: true,
          });
          expect(res).to.be.empty();
        } catch (exc) {
          expect(exc.statusCode).to.eql(404);
        }
      });

      describe('when creating a rule', () => {
        let createResponse: {
          alert: Rule;
          status: number;
        };
        before(async () => {
          await createApmMetricIndex(getService);
          const alertDef: AlertDef<AlertParams> = {
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
          createResponse = await createAlert(getService, obsOnly, SPACE_ID, alertDef);
        });
        after(async () => {
          await deleteAlert(getService, obsOnly, SPACE_ID, createResponse.alert.id);
          await cleanupTargetIndices(getService, obsOnly, SPACE_ID);
        });

        it('writes alerts data to the alert indices', async () => {
          expect(createResponse.status).to.be.below(299);

          expect(createResponse.alert).not.to.be(undefined);
          let alert = await waitUntilNextExecution(
            getService,
            obsOnly,
            createResponse.alert,
            SPACE_ID
          );

          const { body: targetIndices } = await getAlertsTargetIndices(
            getService,
            obsOnly,
            SPACE_ID
          );

          try {
            const res = await es.search({
              index: targetIndices[0],
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
            expect(res).to.be.empty();
          } catch (exc) {
            expect(exc.message).contain('index_not_found_exception');
          }

          await es.index({
            index: APM_METRIC_INDEX_NAME,
            body: createTransactionMetric({
              event: {
                outcome: 'success',
              },
            }),
            refresh: true,
          });

          alert = await waitUntilNextExecution(getService, obsOnly, alert, SPACE_ID);

          try {
            const res = await es.search({
              index: targetIndices[0],
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
            expect(res).to.be.empty();
          } catch (exc) {
            expect(exc.message).contain('index_not_found_exception');
          }

          await es.index({
            index: APM_METRIC_INDEX_NAME,
            body: createTransactionMetric({
              event: {
                outcome: 'failure',
              },
            }),
            refresh: true,
          });

          alert = await waitUntilNextExecution(getService, obsOnly, alert, SPACE_ID);

          const afterViolatingDataResponse = await es.search({
            index: targetIndices[0],
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

          expect(afterViolatingDataResponse.hits.hits.length).to.be(1);

          const alertEvent = afterViolatingDataResponse.hits.hits[0].fields as Record<string, any>;

          const exclude = [
            '@timestamp',
            ALERT_START,
            ALERT_UUID,
            ALERT_RULE_EXECUTION_UUID,
            ALERT_RULE_UUID,
            VERSION,
          ];

          const toCompare = omit(alertEvent, exclude);

          expectSnapshot(toCompare).toMatch();

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

          alert = await waitUntilNextExecution(getService, obsOnly, alert, SPACE_ID);

          const afterRecoveryResponse = await es.search({
            index: targetIndices[0],
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

          expect(afterRecoveryResponse.hits.hits.length).to.be(1);

          const recoveredAlertEvent = afterRecoveryResponse.hits.hits[0].fields as Record<
            string,
            any
          >;

          expect(recoveredAlertEvent[ALERT_STATUS]?.[0]).to.eql('recovered');
          expect(recoveredAlertEvent[ALERT_DURATION]?.[0]).to.be.greaterThan(0);
          expect(new Date(recoveredAlertEvent[ALERT_END]?.[0]).getTime()).to.be.greaterThan(0);

          expectSnapshot(
            omit(recoveredAlertEvent, exclude.concat([ALERT_DURATION, ALERT_END]))
          ).toMatch();
        });
      });
    });
  });
}
