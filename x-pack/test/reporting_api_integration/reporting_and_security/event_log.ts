/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterMeta } from '@kbn/es-query';
import expect from '@kbn/expect';
import { omit } from 'lodash';
import { SortDirection } from 'src/plugins/data/public';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const reportingAPI = getService('reportingAPI');
  const es = getService('es');

  describe('Report generation event logging', () => {
    before(async () => {
      await reportingAPI.initEcommerce();
    });

    after(async () => {
      await reportingAPI.teardownEcommerce();
    });

    it('creates a completed action for a PDF report', async () => {
      const res = await reportingAPI.generateCsv({
        browserTimezone: 'UTC',
        columns: [
          'order_date',
          'email',
          'geoip.city_name',
          'order_id',
          'sku',
          'user',
          'products._id',
        ],
        objectType: 'search',
        searchSource: {
          fields: [{ field: '*', include_unmapped: 'true' }],
          filter: [
            {
              meta: {
                field: 'order_date',
                index: '5193f870-d861-11e9-a311-0fa548c5f953',
                params: {},
              } as FilterMeta,
              query: {
                range: {
                  order_date: {
                    format: 'strict_date_optional_time',
                    gte: '2019-06-07T22:01:10.159Z',
                    lte: '2019-07-17T09:31:53.450Z',
                  },
                },
              },
            },
            {
              meta: {
                field: 'order_date',
                index: '5193f870-d861-11e9-a311-0fa548c5f953',
                params: {},
              } as FilterMeta,
              query: {
                range: {
                  order_date: {
                    format: 'strict_date_optional_time',
                    gte: '2019-06-07T22:01:10.159Z',
                    lte: '2019-07-17T09:31:53.450Z',
                  },
                },
              },
            },
          ],
          index: '5193f870-d861-11e9-a311-0fa548c5f953',
          parent: {
            filter: [],
            index: '5193f870-d861-11e9-a311-0fa548c5f953',
            query: { language: 'kuery', query: '' },
          },
          sort: [{ order_date: 'desc' as SortDirection }],
          trackTotalHits: true,
        },
        title: 'Untitled discover search',
        version: '8.2.0',
      });
      expect(res.status).to.eql(200);
      expect(res.body.path).to.match(/download/);

      const { path } = res.body;

      // wait for the the pending job to complete
      await reportingAPI.waitForJobToFinish(path);

      const csvFile = await reportingAPI.getCompletedJobOutput(path);
      expectSnapshot(csvFile).toMatch();

      // search for the raw event log data
      const events = await es.search<{ event: any; kibana: { reporting: any } }>({
        index: '.kibana-event-log*',
        filter_path: 'hits.hits._source.event,hits.hits._source.kibana',
        query: {
          bool: {
            filter: [
              {
                bool: {
                  must: [
                    { term: { 'event.provider': 'reporting' } },
                    { term: { 'event.action': 'execute-complete' } },
                  ],
                },
              },
            ],
          },
        },
        sort: [{ '@timestamp': { order: 'desc' } }] as unknown as string[],
        size: 1,
      });

      // validate the log has the expected fields with expected values
      const logSource = events.hits.hits[0]._source;
      expect(omit(logSource?.kibana.reporting, 'id')).to.eql({
        byteSize: 5973,
        jobType: 'csv_searchsource',
      });
      expect(omit(logSource?.event, ['duration', 'start', 'end'])).to.eql({
        action: 'execute-complete',
        kind: 'metrics',
        outcome: 'success',
        provider: 'reporting',
        timezone: 'UTC',
      });
    });
  });
}
