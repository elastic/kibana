/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getDefaultRuleAggregation, getRuleTagsAggregation } from '@kbn/alerting-plugin/common';
import { Spaces } from '../../../scenarios';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

const aggregation = JSON.stringify(getDefaultRuleAggregation());

// eslint-disable-next-line import/no-default-export
export default function createAggregateTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('aggregate post', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    it('should aggregate when there are no alerts', async () => {
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_aggregate`)
        .set('kbn-xsrf', 'foo')
        .send({
          aggs: aggregation,
        });

      expect(response.status).to.eql(200);
      expect(response.body).to.eql({
        snoozed: {
          doc_count: 0,
          count: {
            doc_count: 0,
          },
        },
        muted: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [],
        },
        enabled: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [],
        },
        outcome: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [],
        },
        tags: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [],
        },
        status: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [],
        },
      });
    });

    it('should aggregate alert status totals', async () => {
      const NumOkAlerts = 4;
      const NumActiveAlerts = 1;
      const NumErrorAlerts = 2;

      await Promise.all(
        [...Array(NumOkAlerts)].map(async () => {
          const okAlertId = await createTestAlert(
            {
              rule_type_id: 'test.noop',
              schedule: { interval: '1s' },
            },
            'ok'
          );
          objectRemover.add(Spaces.space1.id, okAlertId, 'rule', 'alerting');
        })
      );

      await Promise.all(
        [...Array(NumActiveAlerts)].map(async () => {
          const activeAlertId = await createTestAlert(
            {
              rule_type_id: 'test.patternFiring',
              schedule: { interval: '1s' },
              params: {
                pattern: { instance: new Array(100).fill(true) },
              },
            },
            'active'
          );
          objectRemover.add(Spaces.space1.id, activeAlertId, 'rule', 'alerting');
        })
      );

      await Promise.all(
        [...Array(NumErrorAlerts)].map(async () => {
          const activeAlertId = await createTestAlert(
            {
              rule_type_id: 'test.throw',
              schedule: { interval: '1s' },
            },
            'error'
          );
          objectRemover.add(Spaces.space1.id, activeAlertId, 'rule', 'alerting');
        })
      );

      // Adding delay to allow ES refresh cycle to run. Even when the waitForStatus
      // calls are successful, the call to aggregate may return stale totals if called
      // too early.
      await delay(1000);
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_aggregate`)
        .set('kbn-xsrf', 'foo')
        .send({
          aggs: aggregation,
        });

      expect(response.status).to.eql(200);
      expect(response.body).to.eql({
        snoozed: {
          doc_count: 0,
          count: {
            doc_count: 0,
          },
        },
        muted: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 0,
              key_as_string: 'false',
              doc_count: 7,
            },
          ],
        },
        enabled: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 1,
              key_as_string: 'true',
              doc_count: 7,
            },
          ],
        },
        outcome: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 'succeeded',
              doc_count: 5,
            },
            {
              key: 'failed',
              doc_count: 2,
            },
          ],
        },
        tags: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 'foo',
              doc_count: 7,
            },
          ],
        },
        status: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 'ok',
              doc_count: 4,
            },
            {
              key: 'error',
              doc_count: 2,
            },
            {
              key: 'active',
              doc_count: 1,
            },
          ],
        },
      });
    });

    it('should reject invalid aggregations with forbidden terms', async () => {
      const invalidAggs = JSON.stringify({
        status: {
          terms: { field: 'alert.attributes.executionStatus.status' },
        },
        outcome: {
          terms: { field: 'alert.attributes.lastRun.outcome' },
        },
        apiKey: {
          terms: { field: 'alert.attributes.apiKey' },
        },
      });
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_aggregate`)
        .set('kbn-xsrf', 'foo')
        .send({
          aggs: invalidAggs,
        });

      expect(response.status).to.eql(400);
      expect(response.body.message).to.eql('Invalid aggregation term: alert.attributes.apiKey');
    });

    it('should reject invalid nested aggregations with forbidden terms', async () => {
      const invalidAggs = JSON.stringify({
        status: {
          terms: { field: 'alert.attributes.executionStatus.status' },
          aggs: {
            apiKey: {
              terms: { field: 'alert.attributes.apiKey' },
            },
          },
        },
      });

      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_aggregate`)
        .set('kbn-xsrf', 'foo')
        .send({
          aggs: invalidAggs,
        });

      expect(response.status).to.eql(400);
      expect(response.body.message).to.eql('Invalid aggregation term: alert.attributes.apiKey');
    });

    it('should reject invalid root level aggregation with forbidden terms', async () => {
      const invalidAggs = JSON.stringify({
        status: {
          terms: { field: 'alert.attributes.executionStatus.status' },
        },
        apiKey: {
          cardinality: {
            field: 'alert.attributes.apiKey',
          },
        },
      });

      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_aggregate`)
        .set('kbn-xsrf', 'foo')
        .send({
          aggs: invalidAggs,
        });

      expect(response.status).to.eql(400);
      expect(response.body.message).to.eql('Invalid aggregation term: alert.attributes.apiKey');
    });

    it('should reject incorrect aggregation', async () => {
      const invalidAggs = JSON.stringify({
        invalid: {
          max_price: {
            max: 'price',
          },
        },
      });

      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_aggregate`)
        .set('kbn-xsrf', 'foo')
        .send({
          aggs: invalidAggs,
        });

      expect(response.status).to.eql(400);
      expect(response.body.message).to.eql(
        'Invalid aggregation: [invalid.max_price] max_price aggregation is not valid (or not registered yet): Bad Request'
      );
    });

    it('should reject incorrect aggregation without using field attributes', async () => {
      const invalidFieldAggs = JSON.stringify({
        outcome: {
          terms: 'alert.attributes.lastRun.outcome',
        },
      });

      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_aggregate`)
        .set('kbn-xsrf', 'foo')
        .send({
          aggs: invalidFieldAggs,
        });

      expect(response.status).to.eql(400);
      expect(response.body.message).to.eql(
        'Invalid aggregation: [outcome.terms]: could not parse object value from json input: Bad Request'
      );
    });

    describe('tags limit', () => {
      beforeEach(async () => {
        const numOfAlerts = 3;
        const numOfTagsPerAlert = 30;
        await Promise.all(
          [...Array(numOfAlerts)].map(async (_, alertIndex) => {
            const okAlertId = await createTestAlert(
              {
                rule_type_id: 'test.noop',
                schedule: { interval: '1s' },
                tags: [...Array(numOfTagsPerAlert)].map(
                  (__, i) => `tag-${i + numOfTagsPerAlert * alertIndex}`
                ),
              },
              'ok'
            );
            objectRemover.add(Spaces.space1.id, okAlertId, 'rule', 'alerting');
          })
        );
      });

      it('should be 50 be default', async () => {
        const response = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_aggregate`)
          .set('kbn-xsrf', 'foo')
          .send({
            aggs: aggregation,
          });

        expect(response.body.tags.buckets.length).to.eql(50);
      });

      it('should paginate tags', async () => {
        const tagsAggs = JSON.stringify(
          getRuleTagsAggregation({
            maxTags: 5,
          })
        );

        const response = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_aggregate`)
          .set('kbn-xsrf', 'foo')
          .send({
            aggs: tagsAggs,
          });

        expect(response.body).to.eql({
          tags: {
            after_key: {
              tags: 'tag-12',
            },
            buckets: [
              {
                key: {
                  tags: 'tag-0',
                },
                doc_count: 1,
              },
              {
                key: {
                  tags: 'tag-1',
                },
                doc_count: 1,
              },
              {
                key: {
                  tags: 'tag-10',
                },
                doc_count: 1,
              },
              {
                key: {
                  tags: 'tag-11',
                },
                doc_count: 1,
              },
              {
                key: {
                  tags: 'tag-12',
                },
                doc_count: 1,
              },
            ],
          },
        });

        const nextTagsAggs = JSON.stringify(
          getRuleTagsAggregation({
            maxTags: 5,
            after: {
              tags: 'tag-12',
            },
          })
        );

        const nextResponse = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_aggregate`)
          .set('kbn-xsrf', 'foo')
          .send({
            aggs: nextTagsAggs,
          });

        expect(nextResponse.body).to.eql({
          tags: {
            after_key: {
              tags: 'tag-17',
            },
            buckets: [
              {
                key: {
                  tags: 'tag-13',
                },
                doc_count: 1,
              },
              {
                key: {
                  tags: 'tag-14',
                },
                doc_count: 1,
              },
              {
                key: {
                  tags: 'tag-15',
                },
                doc_count: 1,
              },
              {
                key: {
                  tags: 'tag-16',
                },
                doc_count: 1,
              },
              {
                key: {
                  tags: 'tag-17',
                },
                doc_count: 1,
              },
            ],
          },
        });
      });
    });
  });

  const WaitForStatusIncrement = 500;

  async function waitForStatus(
    id: string,
    statuses: Set<string>,
    waitMillis: number = 10000
  ): Promise<Record<string, any>> {
    if (waitMillis < 0) {
      expect().fail(`waiting for alert ${id} statuses ${Array.from(statuses)} timed out`);
    }

    const response = await supertest.get(
      `${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${id}`
    );
    expect(response.status).to.eql(200);

    const { execution_status: executionStatus } = response.body || {};
    const { status } = executionStatus || {};

    const message = `waitForStatus(${Array.from(statuses)}): got ${JSON.stringify(
      executionStatus
    )}`;

    if (statuses.has(status)) {
      return executionStatus;
    }

    // eslint-disable-next-line no-console
    console.log(`${message}, retrying`);

    await delay(WaitForStatusIncrement);
    return await waitForStatus(id, statuses, waitMillis - WaitForStatusIncrement);
  }

  async function delay(millis: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, millis));
  }

  async function createTestAlert(testAlertOverrides = {}, status: string) {
    const { body: createdAlert } = await supertest
      .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
      .set('kbn-xsrf', 'foo')
      .send(getTestRuleData(testAlertOverrides))
      .expect(200);

    await waitForStatus(createdAlert.id, new Set([status]));
    return createdAlert.id;
  }
}
