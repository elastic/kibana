/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SearchSourceFields } from 'src/plugins/data/common';
import { ReportApiJSON } from '../../../plugins/reporting/common/types';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');
  const reportingAPI = getService('reportingAPI');
  const esVersion = getService('esVersion');

  describe('Generate CSV from SearchSource', function () {
    let csvFile: string;

    before(async () => {
      await reportingAPI.initEcommerce();

      log.info(`updating Advanced Settings`);
      await kibanaServer.uiSettings.update({
        'csv:quoteValues': true,
      });

      const fromTime = '2019-06-20T00:00:00.000Z';
      const toTime = '2019-06-24T00:00:00.000Z';

      const { text: reportApiJson, status } = await reportingAPI.generateCsv({
        title: 'CSV Report',
        browserTimezone: 'UTC',
        columns: [
          'order_date',
          'category',
          'currency',
          'customer_id',
          'order_id',
          'day_of_week_i',
          'products.created_on',
          'sku',
        ],
        objectType: 'search',
        version: '7.17.19',
        searchSource: {
          index: '5193f870-d861-11e9-a311-0fa548c5f953',
          sort: [{ order_date: 'desc' }],
          fields: [
            'order_date',
            'category',
            'currency',
            'customer_id',
            'order_id',
            'day_of_week_i',
            'products.created_on',
            'sku',
          ],
          filter: [
            {
              meta: {
                field: 'order_date',
                index: '5193f870-d861-11e9-a311-0fa548c5f953',
                params: {},
              },
              query: {
                range: {
                  order_date: {
                    format: 'strict_date_optional_time',
                    gte: fromTime,
                    lte: toTime,
                  },
                },
              },
            },
          ],
          parent: {
            filter: [],
            highlightAll: true,
            index: '5193f870-d861-11e9-a311-0fa548c5f953',
            query: { language: 'kuery', query: '' },
            version: true,
          },
          trackTotalHits: true,
        } as unknown as SearchSourceFields,
      });
      expect(status).to.be(200);

      const { job: report, path: downloadPath } = JSON.parse(reportApiJson) as {
        job: ReportApiJSON;
        path: string;
      };
      expect(report.created_by).to.be('elastic');
      expect(report.jobtype).to.be('csv_searchsource');

      // wait for the the pending job to complete
      await reportingAPI.waitForJobToFinish(downloadPath);

      csvFile = (await reportingAPI.getCompletedJobOutput(downloadPath)) as string;
    });

    after(async () => {
      await reportingAPI.teardownEcommerce();
      await reportingAPI.deleteAllReports();
    });

    const itIf7 = esVersion.matchRange('<8') ? it : it.skip;
    const itIf8 = esVersion.matchRange('>=8') ? it : it.skip;

    itIf7(`exported CSV file matches snapshot (7.17)`, async () => {
      expectSnapshot(csvFile).toMatch();
    });

    itIf8(`exported CSV file matches snapshot (8.0)`, async () => {
      expectSnapshot(csvFile).toMatch();
    });
  });
}
