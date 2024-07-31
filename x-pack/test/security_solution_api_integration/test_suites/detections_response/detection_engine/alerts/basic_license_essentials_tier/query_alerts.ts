/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
  ALERTS_AS_DATA_FIND_URL,
} from '@kbn/security-solution-plugin/common/constants';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { getAlertStatus } from '../../../utils';
import {
  createAlertsIndex,
  deleteAllAlerts,
} from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

const query = {
  ...getAlertStatus(),
  query: {
    bool: {
      should: [{ match_all: {} }],
    },
  },
};

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const es = getService('es');

  describe('@ess @serverless @serverlessQA query_signals_route and find_alerts_route', () => {
    beforeEach(async () => {
      await deleteAllAlerts(supertest, log, es);
    });

    describe('validation checks', () => {
      it('should not give errors when querying and the alerts index does exist and is empty', async () => {
        await createAlertsIndex(supertest, log);
        const { body } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(query)
          .expect(200);

        // remove any server generated items that are indeterministic
        delete body.took;

        expect(body).to.eql({
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
          aggregations: {
            statuses: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
        });

        await deleteAllAlerts(supertest, log, es);
      });
    });

    describe('runtime fields', () => {
      beforeEach(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/alerts/8.8.0_multiple_docs',
          {
            useCreate: true,
            docsOnly: true,
          }
        );
        await createAlertsIndex(supertest, log);
      });
      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
      });

      it('should be able to filter using a runtime field defined in the request', async () => {
        const queryRuntime = {
          query: {
            bool: {
              should: [{ match_phrase: { signal_status_querytime: 'open' } }],
            },
          },
          runtime_mappings: {
            signal_status_querytime: {
              type: 'keyword',
              script: {
                source: `emit(doc['signal.status'].value)`,
              },
            },
          },
        };
        const { body } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(queryRuntime)
          .expect(200);
        expect(body.hits.total.value).to.eql(3);
      });
    });

    describe('find_alerts_route', () => {
      describe('validation checks', () => {
        it('should not give errors when querying and the alerts index does exist and is empty', async () => {
          await createAlertsIndex(supertest, log);
          const { body } = await supertest
            .post(ALERTS_AS_DATA_FIND_URL)
            .set('kbn-xsrf', 'true')
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .send({
              ...query,
              index: '.siem-signals-default',
            })
            .expect(200);

          // remove any server generated items that are indeterministic
          delete body.took;

          expect(body).to.eql({
            timed_out: false,
            _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
            hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
            aggregations: {
              statuses: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
            },
          });

          await deleteAllAlerts(supertest, log, es);
        });

        it('should not give errors when executing security solution histogram aggs', async () => {
          await createAlertsIndex(supertest, log);
          await supertest
            .post(ALERTS_AS_DATA_FIND_URL)
            .set('kbn-xsrf', 'true')
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .send({
              index: '.siem-signals-default',
              aggs: {
                alertsByGrouping: {
                  terms: {
                    field: 'event.category',
                    missing: 'All others',
                    order: { _count: 'desc' },
                    size: 10,
                  },
                  aggs: {
                    alerts: {
                      date_histogram: {
                        field: '@timestamp',
                        fixed_interval: '2699999ms',
                        min_doc_count: 0,
                        extended_bounds: {
                          min: '2021-08-17T04:00:00.000Z',
                          max: '2021-08-18T03:59:59.999Z',
                        },
                      },
                    },
                  },
                },
              },
              query: {
                bool: {
                  filter: [
                    {
                      bool: {
                        must: [],
                        filter: [
                          {
                            match_phrase: {
                              'kibana.alert.rule.uuid': 'c76f1a10-ffb6-11eb-8914-9b237bf6808c',
                            },
                          },
                          { term: { 'kibana.alert.workflow_status': 'open' } },
                        ],
                        should: [],
                        must_not: [{ exists: { field: 'kibana.alert.building_block_type' } }],
                      },
                    },
                    {
                      range: {
                        '@timestamp': {
                          gte: '2021-08-17T04:00:00.000Z',
                          lte: '2021-08-18T03:59:59.999Z',
                        },
                      },
                    },
                  ],
                },
              },
            })
            .expect(200);

          await deleteAllAlerts(supertest, log, es);
        });
      });
    });
  });
};
