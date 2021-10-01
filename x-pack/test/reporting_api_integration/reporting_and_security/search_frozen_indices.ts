/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const supertestSvc = getService('supertest');
  const esSupertest = getService('esSupertest');
  const indexPatternId = 'cool-test-index-pattern';

  async function callExportAPI() {
    const job = {
      browserTimezone: 'UTC',
      columns: ['@timestamp', 'ip', 'utilization'],
      searchSource: {
        fields: [{ field: '*', include_unmapped: 'true' }],
        filter: [
          {
            meta: { field: '@timestamp', index: indexPatternId, params: {} },
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gte: '2020-08-24T00:00:00.000Z',
                lte: '2022-08-24T21:40:48.346Z',
              },
            },
          },
        ],
        index: indexPatternId,
        parent: { filter: [], index: indexPatternId, query: { language: 'kuery', query: '' } },
        sort: [{ '@timestamp': 'desc' }],
        trackTotalHits: true,
      },
      title: 'Test search',
    };

    return await supertestSvc
      .post(`/api/reporting/v1/generate/immediate/csv_searchsource`)
      .set('kbn-xsrf', 'xxx')
      .send(job);
  }

  describe('Frozen indices search', () => {
    const reset = async () => {
      await kibanaServer.uiSettings.replace({ 'search:includeFrozen': false });
      try {
        await esSupertest.delete('/test1,test2,test3');
        await kibanaServer.savedObjects.delete({ type: 'index-pattern', id: indexPatternId });
      } catch (err) {
        // ignore 404 error
      }
    };

    before(reset);
    after(reset);

    it('Search includes frozen indices based on Advanced Setting', async () => {
      await kibanaServer.uiSettings.update({ 'csv:quoteValues': true });

      // setup: add multiple indices of test data
      await Promise.all([
        esSupertest
          .post('/test1/_doc')
          .send({ '@timestamp': '2021-08-24T21:36:40Z', ip: '43.98.8.183', utilization: 18725 }),
        esSupertest
          .post('/test2/_doc')
          .send({ '@timestamp': '2021-08-21T09:36:40Z', ip: '63.91.103.79', utilization: 8480 }),
        esSupertest
          .post('/test3/_doc')
          .send({ '@timestamp': '2021-08-17T21:36:40Z', ip: '139.108.162.171', utilization: 3078 }),
      ]);
      await esSupertest.post('/test*/_refresh');

      // setup: create index pattern
      const indexPatternCreateResponse = await kibanaServer.savedObjects.create({
        type: 'index-pattern',
        id: indexPatternId,
        overwrite: true,
        attributes: { title: 'test*', timeFieldName: '@timestamp' },
      });
      expect(indexPatternCreateResponse.id).to.be(indexPatternId);

      // 1. check the initial data with a CSV export
      const initialSearch = await callExportAPI();
      expectSnapshot(initialSearch.text).toMatchInline(`
        "\\"@timestamp\\",ip,utilization
        \\"Aug 24, 2021 @ 21:36:40.000\\",\\"43.98.8.183\\",\\"18,725\\"
        \\"Aug 21, 2021 @ 09:36:40.000\\",\\"63.91.103.79\\",\\"8,480\\"
        \\"Aug 17, 2021 @ 21:36:40.000\\",\\"139.108.162.171\\",\\"3,078\\"
        "
      `);

      // 2. freeze an index in the pattern
      await esSupertest.post('/test3/_freeze').expect(200);
      await esSupertest.post('/test*/_refresh').expect(200);

      // 3. recheck the search results
      const afterFreezeSearch = await callExportAPI();
      expectSnapshot(afterFreezeSearch.text).toMatchInline(`
        "\\"@timestamp\\",ip,utilization
        \\"Aug 24, 2021 @ 21:36:40.000\\",\\"43.98.8.183\\",\\"18,725\\"
        \\"Aug 21, 2021 @ 09:36:40.000\\",\\"63.91.103.79\\",\\"8,480\\"
        "
      `);

      // 4. update setting to allow searching frozen data
      await kibanaServer.uiSettings.update({ 'search:includeFrozen': true });

      // 5. recheck the search results
      const afterAllowSearch = await callExportAPI();
      expectSnapshot(afterAllowSearch.text).toMatchInline(`
        "\\"@timestamp\\",ip,utilization
        \\"Aug 24, 2021 @ 21:36:40.000\\",\\"43.98.8.183\\",\\"18,725\\"
        \\"Aug 21, 2021 @ 09:36:40.000\\",\\"63.91.103.79\\",\\"8,480\\"
        \\"Aug 17, 2021 @ 21:36:40.000\\",\\"139.108.162.171\\",\\"3,078\\"
        "
      `);
    });
  });
}
