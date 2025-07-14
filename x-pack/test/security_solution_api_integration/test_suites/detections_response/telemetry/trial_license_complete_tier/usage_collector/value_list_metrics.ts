/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { LIST_ITEM_URL, LIST_URL } from '@kbn/securitysolution-list-constants';
import {
  getCreateMinimalListSchemaMock,
  getCreateMinimalListSchemaMockWithoutId,
} from '@kbn/lists-plugin/common/schemas/request/create_list_schema.mock';
import { ValueListMetricsSchema } from '@kbn/security-solution-plugin/server/usage/value_lists/types';
import { getImportListItemAsBuffer } from '@kbn/lists-plugin/common/schemas/request/import_list_item_schema.mock';
import { getCreateMinimalListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_list_item_schema.mock';
import { deleteAllEventLogExecutionEvents } from '../../../utils';
import { createListsIndex, deleteListsIndex } from '../../../../lists_and_exception_lists/utils';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { getValueListStats } from '../../../utils/get_value_list_metrics_stats';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  describe('@ess @serverless Value list telemetry', () => {
    beforeEach(async () => {
      await createListsIndex(supertest, log);
      await deleteAllEventLogExecutionEvents(es, log);
    });

    afterEach(async () => {
      await deleteListsIndex(supertest, log);
      await deleteAllEventLogExecutionEvents(es, log);
    });

    it('should display list counts', async () => {
      await supertest
        .post(LIST_URL)
        .set('kbn-xsrf', 'true')
        .send(getCreateMinimalListSchemaMockWithoutId())
        .expect(200);

      await supertest
        .post(LIST_URL)
        .set('kbn-xsrf', 'true')
        .send({ ...getCreateMinimalListSchemaMockWithoutId(), type: 'keyword' })
        .expect(200);

      await supertest
        .post(LIST_URL)
        .set('kbn-xsrf', 'true')
        .send({ ...getCreateMinimalListSchemaMockWithoutId(), type: 'binary' })
        .expect(200);

      await supertest
        .post(LIST_URL)
        .set('kbn-xsrf', 'true')
        .send({ ...getCreateMinimalListSchemaMockWithoutId(), type: 'text' })
        .expect(200);

      await supertest
        .post(LIST_URL)
        .set('kbn-xsrf', 'true')
        .send({ ...getCreateMinimalListSchemaMockWithoutId(), type: 'ip_range' })
        .expect(200);

      const stats = await getValueListStats(supertest, log);
      const expected: ValueListMetricsSchema = {
        items_overview: {
          total: 0,
          max_items_per_list: 0,
          min_items_per_list: 0,
          median_items_per_list: 0,
        },
        lists_overview: {
          total: 5,
          binary: 1,
          boolean: 0,
          byte: 0,
          date: 0,
          date_nanos: 0,
          date_range: 0,
          double: 0,
          double_range: 0,
          float: 0,
          float_range: 0,
          geo_point: 0,
          geo_shape: 0,
          half_float: 0,
          integer: 0,
          integer_range: 0,
          ip: 1,
          ip_range: 1,
          keyword: 1,
          long: 0,
          long_range: 0,
          shape: 0,
          short: 0,
          text: 1,
        },
      };
      expect(stats).to.eql(expected);
    });

    it('should display item counts', async () => {
      await supertest
        .post(`${LIST_ITEM_URL}/_import?type=ip`)
        .set('kbn-xsrf', 'true')
        .attach(
          'file',
          getImportListItemAsBuffer([
            '127.0.0.1',
            '127.0.0.2',
            '127.0.0.3',
            '127.0.0.4',
            '127.0.0.5',
            '127.0.0.6',
          ]),
          'list_items.txt'
        )
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(200);

      await supertest
        .post(LIST_URL)
        .set('kbn-xsrf', 'true')
        .send(getCreateMinimalListSchemaMock())
        .expect(200);

      await supertest
        .post(LIST_ITEM_URL)
        .set('kbn-xsrf', 'true')
        .send(getCreateMinimalListItemSchemaMock())
        .expect(200);

      const stats = await getValueListStats(supertest, log);
      const expected: ValueListMetricsSchema = {
        items_overview: {
          total: 7,
          max_items_per_list: 6,
          min_items_per_list: 1,
          median_items_per_list: 6,
        },
        lists_overview: {
          total: 2,
          binary: 0,
          boolean: 0,
          byte: 0,
          date: 0,
          date_nanos: 0,
          date_range: 0,
          double: 0,
          double_range: 0,
          float: 0,
          float_range: 0,
          geo_point: 0,
          geo_shape: 0,
          half_float: 0,
          integer: 0,
          integer_range: 0,
          ip: 2,
          ip_range: 0,
          keyword: 0,
          long: 0,
          long_range: 0,
          shape: 0,
          short: 0,
          text: 0,
        },
      };
      expect(stats).to.eql(expected);
    });
  });
};
