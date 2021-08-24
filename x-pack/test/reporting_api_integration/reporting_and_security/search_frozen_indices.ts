/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter, FilterMeta } from '@kbn/es-query';
import { SortDirectionFormat } from 'src/plugins/data/common';
import { JobParamsDownloadCSV } from '../../../plugins/reporting/server/export_types/csv_searchsource_immediate/types';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const supertestSvc = getService('supertest');
  const esSupertest = getService('esSupertest');
  const log = getService('log');

  const generateAPI = {
    getCSVFromSearchSource: async (job: JobParamsDownloadCSV) => {
      return await supertestSvc
        .post(`/api/reporting/v1/generate/immediate/csv_searchsource`)
        .set('kbn-xsrf', 'xxx')
        .send(job);
    },
  };

  describe('Frozen indices search', () => {
    before(async () => {
      await kibanaServer.uiSettings.update({
        'csv:quoteValues': true,
        'search:includeFrozen': false,
      });
    });

    after(async () => {
      await kibanaServer.uiSettings.update({ 'search:includeFrozen': false });
    });

    it('Search includes frozen indices based on Advanced Setting', async () => {
      // setup: settings and clear data from previous testing
      await kibanaServer.uiSettings.update({ 'csv:quoteValues': true });
      await esSupertest.delete('/test2,test2,test3');

      // setup: add mwhdflaksjefhultiple indices of test data
      await Promise.all([
        esSupertest
          .post('/test1/_doc?refresh=true')
          .send({ '@timestamp': '2021-08-24T21:36:40Z', ip: '43.98.8.183', utilization: 18725 }),
        esSupertest
          .post('/test2/_doc?refresh=true')
          .send({ '@timestamp': '2021-08-21T09:36:40Z', ip: '63.91.103.79', utilization: 8480 }),
        esSupertest
          .post('/test3/_doc?refresh=true')
          .send({ '@timestamp': '2021-08-17T21:36:40Z', ip: '139.108.162.171', utilization: 3078 }),
      ]);

      // setup: create index pattern
      const indexPatternId = 'cool-test-index-pattern';
      const indexPatternCreateResponse = await kibanaServer.savedObjects.create({
        type: 'index-pattern',
        id: indexPatternId,
        overwrite: true,
        attributes: { title: 'test*', timeFieldName: '@timestamp' },
      });

      log.info(`index pattern create response: ${JSON.stringify(indexPatternCreateResponse)}`);

      const callExportApi = async () => {
        return await generateAPI.getCSVFromSearchSource({
          browserTimezone: 'UTC',
          columns: ['@timestamp', 'ip', 'utilization'],
          searchSource: {
            fields: [{ field: '*', include_unmapped: 'true' }],
            filter: [
              {
                meta: {
                  field: '@timestamp',
                  index: indexPatternId,
                  params: {},
                } as FilterMeta,
                range: {
                  '@timestamp': {
                    format: 'strict_date_optional_time',
                    gte: '2020-08-24T00:00:00.000Z',
                    lte: '2022-08-24T21:40:48.346Z',
                  },
                },
              } as Filter,
            ],
            // @ts-expect-error Type 'string' is not assignable to type 'IndexPattern | undefined'.
            index: indexPatternId,
            parent: {
              filter: [],
              // @ts-expect-error Type 'string' is not assignable to type 'IndexPattern | undefined'.
              index: indexPatternId,
              query: { language: 'kuery', query: '' },
            },
            sort: ([{ '@timestamp': 'desc' }] as unknown) as Record<string, SortDirectionFormat>,
            trackTotalHits: true,
          },
          title: 'Test search',
        });
      };

      // testing: call the API to export the search data as CSV
      try {
        // check the initial data with a CSV export
        const initialResult = await callExportApi();
        expectSnapshot(initialResult.text).toMatchInline(`
          "\\"@timestamp\\",ip,utilization
          \\"Aug 24, 2021 @ 21:36:40.000\\",\\"43.98.8.183\\",\\"18,725\\"
          \\"Aug 21, 2021 @ 09:36:40.000\\",\\"63.91.103.79\\",\\"8,480\\"
          \\"Aug 17, 2021 @ 21:36:40.000\\",\\"139.108.162.171\\",\\"3,078\\"
          "
        `);

        // freeze an index in the pattern
        // recheck the search results
        const freezeResult = await esSupertest.post('/test3/_freeze');
        log.info(`freeze index response: ${JSON.stringify(freezeResult)}`);
        const afterFreezeResult = await callExportApi();
        expectSnapshot(afterFreezeResult.text).toMatchInline(`
          "\\"@timestamp\\",ip,utilization
          \\"Aug 24, 2021 @ 21:36:40.000\\",\\"43.98.8.183\\",\\"18,725\\"
          \\"Aug 21, 2021 @ 09:36:40.000\\",\\"63.91.103.79\\",\\"8,480\\"
          "
        `);

        // allow searching frozen data
        // recheck the search results
        await kibanaServer.uiSettings.update({ 'search:includeFrozen': true });
        const afterAllowSearchResult = await callExportApi();
        expectSnapshot(afterAllowSearchResult.text).toMatchInline(`
          "\\"@timestamp\\",ip,utilization
          \\"Aug 24, 2021 @ 21:36:40.000\\",\\"43.98.8.183\\",\\"18,725\\"
          \\"Aug 21, 2021 @ 09:36:40.000\\",\\"63.91.103.79\\",\\"8,480\\"
          \\"Aug 17, 2021 @ 21:36:40.000\\",\\"139.108.162.171\\",\\"3,078\\"
          "
        `);
      } finally {
        // cleanup
        await esSupertest.delete('/test1,test2,test3');
        await kibanaServer.savedObjects.delete({ type: 'index-pattern', id: indexPatternId });
      }
    });
  });
}
