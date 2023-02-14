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
    // Failing ES 8.X forward compatibility: https://github.com/elastic/kibana/issues/151229
    this.onlyEsVersion('<=7');
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
        objectType: 'search',
        version: '7.15.0',
        searchSource: {
          version: true,
          query: { query: '', language: 'kuery' },
          index: '5193f870-d861-11e9-a311-0fa548c5f953',
          sort: [{ order_date: 'desc' }],
          fields: ['*'],
          filter: [],
          parent: {
            query: { language: 'kuery', query: '' },
            filter: [],
            parent: {
              filter: [
                {
                  meta: { index: '5193f870-d861-11e9-a311-0fa548c5f953', params: {} },
                  range: {
                    order_date: {
                      gte: fromTime,
                      lte: toTime,
                      format: 'strict_date_optional_time',
                    },
                  },
                },
              ],
            },
          },
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
