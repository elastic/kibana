/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { ENDPOINT_LIST_URL } from '@kbn/securitysolution-list-constants';
import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { getCreateExceptionListDetectionSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import { getCreateExceptionListItemMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import { ExceptionMetricsSchema } from '@kbn/security-solution-plugin/server/usage/exceptions/types';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { deleteAllEventLogExecutionEvents } from '../../../utils';
import { createRule, deleteAllRules } from '../../../../../../common/utils/security_solution';
import { deleteAllExceptions } from '../../../../lists_and_exception_lists/utils';
import { getCustomQueryRuleParams } from '../../../utils';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { getExceptionsStats } from '../../../utils/get_exception_metrics_stats';

const matchEntry = () => ({
  field: 'host.name',
  operator: 'included',
  type: 'match',
  value: 'some value',
});

const matchAnyEntry = () => ({
  field: 'host.name',
  operator: 'excluded',
  type: 'match_any',
  value: ['foo', 'bar'],
});

const existsEntry = () => ({
  field: 'host.name',
  operator: 'included',
  type: 'exists',
});

const wildcardEntry = () => ({
  field: 'host.name',
  operator: 'included',
  type: 'wildcard',
  value: 'some*value',
});

const valueListEntry = () => ({
  field: 'host.name',
  operator: 'included',
  type: 'list',
  list: {
    id: 'value-list-id',
    type: 'keyword',
  },
});

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const es = getService('es');

  describe('@ess @serverless Exceptions telemetry', () => {
    before(async () => {
      // Just in case other tests do not clean up the event logs, let us clear them now and here only once.
      await deleteAllEventLogExecutionEvents(es, log);
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/telemetry');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/telemetry');
    });

    beforeEach(async () => {
      await deleteAllExceptions(supertest, log);
      await deleteAllRules(supertest, log);
      await deleteAllEventLogExecutionEvents(es, log);
    });

    afterEach(async () => {
      await deleteAllExceptions(supertest, log);
      await deleteAllRules(supertest, log);
      await deleteAllEventLogExecutionEvents(es, log);
    });

    it('should display item and item entry counts', async () => {
      // Create exception lists
      await supertest
        .post(EXCEPTION_LIST_URL)
        .set('kbn-xsrf', 'true')
        .send({ ...getCreateExceptionListDetectionSchemaMock(), list_id: 'detections-list-1' })
        .expect(200);

      // Add some items with different exception item types
      await supertest
        .post(EXCEPTION_LIST_ITEM_URL)
        .set('kbn-xsrf', 'true')
        .send({
          ...getCreateExceptionListItemMinimalSchemaMock(),
          item_id: 'item-1',
          list_id: 'detections-list-1',
          entries: [matchEntry(), matchAnyEntry(), existsEntry(), wildcardEntry()],
        })
        .expect(200);

      await supertest
        .post(EXCEPTION_LIST_ITEM_URL)
        .set('kbn-xsrf', 'true')
        .send({
          ...getCreateExceptionListItemMinimalSchemaMock(),
          item_id: 'item-2',
          list_id: 'detections-list-1',
          entries: [valueListEntry()],
        })
        .expect(200);

      await supertest
        .post(EXCEPTION_LIST_ITEM_URL)
        .set('kbn-xsrf', 'true')
        .send({
          ...getCreateExceptionListItemMinimalSchemaMock(),
          item_id: 'item-3',
          list_id: 'detections-list-1',
          entries: [valueListEntry()],
        })
        .expect(200);

      // One item has comments
      await supertest
        .post(EXCEPTION_LIST_ITEM_URL)
        .set('kbn-xsrf', 'true')
        .send({
          ...getCreateExceptionListItemMinimalSchemaMock(),
          list_id: 'detections-list-1',
          entries: [matchEntry(), matchAnyEntry(), existsEntry(), wildcardEntry()],
          comments: [{ comment: 'Comment by me' }],
          item_id: 'item-4',
        })
        .expect(200);

      const stats = await getExceptionsStats(supertest, log);
      const expected: ExceptionMetricsSchema = {
        items_overview: {
          total: 4,
          has_expire_time: 0,
          are_expired: 0,
          has_comments: 1,
          entries: {
            exists: 2,
            list: 2,
            match: 2,
            match_any: 2,
            nested: 0,
            wildcard: 2,
          },
        },
        lists_overview: {
          endpoint: {
            lists: 0,
            total_items: 0,
            max_items_per_list: 0,
            min_items_per_list: 0,
            median_items_per_list: 0,
          },
          rule_default: {
            lists: 0,
            total_items: 0,
            max_items_per_list: 0,
            min_items_per_list: 0,
            median_items_per_list: 0,
          },
          detection: {
            lists: 1,
            max_items_per_list: 4,
            median_items_per_list: 4,
            min_items_per_list: 4,
            total_items: 4,
          },
        },
      };
      expect(stats).to.eql(expected);
    });

    it('should display list counts', async () => {
      // Create "detection" exception lists
      await supertest
        .post(EXCEPTION_LIST_URL)
        .set('kbn-xsrf', 'true')
        .send({ ...getCreateExceptionListDetectionSchemaMock(), list_id: 'detections-list-1' })
        .expect(200);

      await supertest
        .post(EXCEPTION_LIST_URL)
        .set('kbn-xsrf', 'true')
        .send({ ...getCreateExceptionListDetectionSchemaMock(), list_id: 'detections-list-2' })
        .expect(200);

      // Create "rule default" exception lists
      const rule = await createRule(supertest, log, getCustomQueryRuleParams());
      await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/${rule.id}/exceptions`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .send({
          items: [
            {
              description: 'My item description',
              entries: [matchEntry()],
              name: 'My item name',
              type: 'simple',
            },
          ],
        })
        .expect(200);

      // Create "endpoint" exception lists
      await supertest.post(ENDPOINT_LIST_URL).set('kbn-xsrf', 'true').send().expect(200);

      const stats = await getExceptionsStats(supertest, log);
      const expected: ExceptionMetricsSchema = {
        items_overview: {
          total: 1,
          has_expire_time: 0,
          are_expired: 0,
          has_comments: 0,
          entries: {
            exists: 0,
            list: 0,
            match: 1,
            match_any: 0,
            nested: 0,
            wildcard: 0,
          },
        },
        lists_overview: {
          endpoint: {
            lists: 1,
            total_items: 0,
            max_items_per_list: 0,
            min_items_per_list: 0,
            median_items_per_list: 0,
          },
          rule_default: {
            lists: 1,
            total_items: 1,
            max_items_per_list: 1,
            min_items_per_list: 1,
            median_items_per_list: 1,
          },
          detection: {
            lists: 2,
            max_items_per_list: 0,
            median_items_per_list: 0,
            min_items_per_list: 0,
            total_items: 0,
          },
        },
      };
      expect(stats).to.eql(expected);
    });
  });
};
