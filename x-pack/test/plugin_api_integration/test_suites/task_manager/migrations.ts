/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ApiResponse, estypes } from '@elastic/elasticsearch';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import type { TaskInstanceWithDeprecatedFields } from '../../../../../plugins/task_management/server/saved_objects/tasks';

export default function createGetTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('migrations', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/task');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/task');
    });

    it('7.15.0 migrates security_solution alerts with exceptionLists to be saved object references', async () => {
      // NOTE: We hae to use elastic search directly against the ".kibana" index because alerts do not expose the references which we want to test exists
      const response = await es.get<{ references: [{}] }>({
        index: '.kibana',
        id: 'alert:38482620-ef1b-11eb-ad71-7de7959be71c',
      });
      expect(response.statusCode).to.eql(200);
      expect(response.body._source?.references).to.eql([
        {
          name: 'param:exceptionsList_0',
          id: 'endpoint_list',
          type: 'exception-list-agnostic',
        },
        {
          name: 'param:exceptionsList_1',
          id: '50e3bd70-ef1b-11eb-ad71-7de7959be71c',
          type: 'exception-list',
        },
      ]);
    });

    it('8.0.0 migrates actions tasks from legacy id to saved object ids', async () => {
      const searchResult: ApiResponse<
        estypes.SearchResponse<TaskInstanceWithDeprecatedFields>
      > = await es.search({
        index: '.kibana',
        body: {
          query: {
            term: {
              _id: 'alert:74f3e6d7-b7bb-477d-ac28-92ee22728e6e',
            },
          },
        },
      });
      expect(searchResult.statusCode).to.equal(200);
      expect((searchResult.body.hits.total as estypes.SearchTotalHits).value).to.equal(1);
      const hit = searchResult.body.hits.hits[0];
      expect((hit!._source!.alert! as TaskInstanceWithDeprecatedFields).legacyId).to.equal(
        '74f3e6d7-b7bb-477d-ac28-92ee22728e6e'
      );
    });
  });
}
