/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import expect from '@kbn/expect';

import { getDailyEvents } from '@kbn/lens-plugin/server/usage/task';
import { getVisualizationCounts } from '@kbn/lens-plugin/server/usage/visualization_counts';
import { FtrProviderContext } from '../../ftr_provider_context';

const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');

  async function assertExpectedSavedObjects(num: number) {
    // Make sure that new/deleted docs are available to search
    await es.indices.refresh({
      index: '.kibana',
    });

    const { count } = await es.count({
      index: '.kibana',
      q: 'type:lens-ui-telemetry',
    });

    expect(count).to.be(num);
  }

  describe('lens telemetry', () => {
    beforeEach(async () => {
      await es.deleteByQuery({
        index: '.kibana',
        q: 'type:lens-ui-telemetry',
        wait_for_completion: true,
        refresh: true,
        body: {},
      });
    });

    afterEach(async () => {
      await es.deleteByQuery({
        index: '.kibana',
        q: 'type:lens-ui-telemetry',
        wait_for_completion: true,
        refresh: true,
        body: {},
      });
    });

    it('should do nothing on empty post', async () => {
      await supertest
        .post('/api/lens/stats')
        .set(COMMON_HEADERS)
        .send({
          events: {},
          suggestionEvents: {},
        })
        .expect(200);

      await assertExpectedSavedObjects(0);
    });

    it('should write a document per results', async () => {
      await supertest
        .post('/api/lens/stats')
        .set(COMMON_HEADERS)
        .send({
          events: {
            '2019-10-13': { loaded: 5, dragged: 2 },
            '2019-10-14': { loaded: 1 },
          },
          suggestionEvents: {
            '2019-10-13': { switched: 2 },
          },
        })
        .expect(200);

      await assertExpectedSavedObjects(4);
    });

    it('should delete older telemetry documents while running', async () => {
      const olderDate = moment().subtract(100, 'days').valueOf();

      // @ts-ignore optional type: string
      await es.index({
        index: '.kibana',
        body: {
          type: 'lens-ui-telemetry',
          'lens-ui-telemetry': {
            date: olderDate,
            name: 'load',
            type: 'regular',
            count: 5,
          },
        },
        refresh: 'wait_for',
      });

      const result = await getDailyEvents('.kibana', () => Promise.resolve(es));

      expect(result).to.eql({
        byDate: {},
        suggestionsByDate: {},
      });

      await assertExpectedSavedObjects(0);
    });

    it('should aggregate the individual events into daily totals by type', async () => {
      // Dates are set to midnight in the aggregation, so let's make this easier for the test
      const date1 = moment().utc().subtract(10, 'days').startOf('day').valueOf();
      const date2 = moment().utc().subtract(20, 'days').startOf('day').valueOf();

      function getEvent(name: string, date: number, type = 'regular') {
        return {
          type: 'lens-ui-telemetry',
          'lens-ui-telemetry': {
            date,
            name,
            type,
            count: 5,
          },
        };
      }

      await es.bulk({
        refresh: 'wait_for',
        body: [
          { index: { _index: '.kibana' } },
          getEvent('load', date1),
          { index: { _index: '.kibana' } },
          getEvent('load', date1),
          { index: { _index: '.kibana' } },
          getEvent('load', date1),
          { index: { _index: '.kibana' } },
          getEvent('load', date2),
          { index: { _index: '.kibana' } },
          getEvent('revert', date1, 'suggestion'),
        ],
      });
      const result = await getDailyEvents('.kibana', () => Promise.resolve(es));

      expect(result).to.eql({
        byDate: {
          [date1]: {
            load: 15,
          },
          [date2]: {
            load: 5,
          },
        },
        suggestionsByDate: {
          [date1]: {
            revert: 5,
          },
          [date2]: {},
        },
      });

      await assertExpectedSavedObjects(5);
    });

    it('should collect telemetry on saved visualization types with a painless script', async () => {
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );

      const results = await getVisualizationCounts(() => Promise.resolve(es), '.kibana');

      expect(results).to.have.keys([
        'saved_overall',
        'saved_30_days',
        'saved_90_days',
        'saved_overall_total',
        'saved_30_days_total',
        'saved_90_days_total',
      ]);

      expect(results.saved_overall).to.eql({
        lnsMetric: 1,
        bar_stacked: 1,
        lnsPie: 1,
      });
      expect(results.saved_overall_total).to.eql(3);

      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
    });
  });
};
