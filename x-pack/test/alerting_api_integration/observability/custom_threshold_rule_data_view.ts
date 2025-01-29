/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Aggregators } from '@kbn/observability-plugin/common/custom_threshold_rule/types';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';

import { COMPARATORS } from '@kbn/alerting-comparators';
import { FtrProviderContext } from '../common/ftr_provider_context';
import { getUrlPrefix, ObjectRemover } from '../common/lib';
import { createRule } from './helpers/alerting_api_helper';
import { createDataView, deleteDataView } from './helpers/data_view';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);
  const esClient = getService('es');
  const logger = getService('log');

  describe('Custom Threshold rule data view >', () => {
    const DATA_VIEW_ID = 'data-view-id';

    let ruleId: string;

    const searchRule = () =>
      esClient.search<{ references: unknown; alert: { params: any } }>({
        index: '.kibana*',
        query: {
          bool: {
            filter: [
              {
                term: {
                  _id: `alert:${ruleId}`,
                },
              },
            ],
          },
        },
        fields: ['alert.params', 'references'],
      });

    before(async () => {
      await createDataView({
        supertest,
        name: 'test-data-view',
        id: DATA_VIEW_ID,
        title: 'random-index*',
        logger,
      });
    });

    after(async () => {
      await objectRemover.removeAll();
      await deleteDataView({
        supertest,
        id: DATA_VIEW_ID,
        logger,
      });
    });

    describe('save data view in rule correctly', () => {
      it('create a threshold rule', async () => {
        const createdRule = await createRule({
          supertest,
          logger,
          esClient,
          tags: ['observability'],
          consumer: 'logs',
          name: 'Threshold rule',
          ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
          params: {
            criteria: [
              {
                comparator: COMPARATORS.GREATER_THAN,
                threshold: [7500000],
                timeSize: 5,
                timeUnit: 'm',
                metrics: [
                  { name: 'A', field: 'span.self_time.sum.us', aggType: Aggregators.AVERAGE },
                ],
              },
            ],
            alertOnNoData: true,
            alertOnGroupDisappear: true,
            searchConfiguration: {
              query: {
                query: '',
                language: 'kuery',
              },
              index: DATA_VIEW_ID,
            },
          },
          actions: [],
        });
        ruleId = createdRule.id;
        expect(ruleId).not.to.be(undefined);
      });

      it('should have correct data view reference before and after edit', async () => {
        const {
          hits: { hits: alertHitsV1 },
        } = await searchRule();

        await supertest
          .post(`${getUrlPrefix('default')}/internal/alerting/rules/_bulk_edit`)
          .set('kbn-xsrf', 'foo')
          .send({
            ids: [ruleId],
            operations: [{ operation: 'set', field: 'apiKey' }],
          })
          .expect(200);
        objectRemover.add('default', ruleId, 'rule', 'alerting');

        const {
          hits: { hits: alertHitsV2 },
        } = await searchRule();

        expect(alertHitsV1[0]?._source?.references).to.eql([
          {
            name: 'param:kibanaSavedObjectMeta.searchSourceJSON.index',
            type: 'index-pattern',
            id: 'data-view-id',
          },
        ]);
        expect(alertHitsV1[0]?._source?.alert?.params?.searchConfiguration).to.eql({
          query: { query: '', language: 'kuery' },
          indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        });
        expect(alertHitsV1[0].fields).to.eql(alertHitsV2[0].fields);
        expect(alertHitsV1[0]?._source?.references ?? true).to.eql(
          alertHitsV2[0]?._source?.references ?? false
        );
      });
    });
  });
}
