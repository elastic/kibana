/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { Spaces } from '../../../../scenarios';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { ESTestIndexTool, ES_TEST_INDEX_NAME, getUrlPrefix } from '../../../../../common/lib';
import { TimeSeriesQuery } from '../../../../../../../plugins/alerting_builtins/server/alert_types/index_threshold/lib/time_series_query';

import { createEsDocuments } from './create_test_data';

const INDEX_THRESHOLD_TIME_SERIES_QUERY_URL =
  'api/alerting_builtins/index_threshold/_time_series_query';

const START_DATE_MM_DD_HH_MM_SS_MS = '01-01T00:00:00.000Z';
const START_DATE = `2020-${START_DATE_MM_DD_HH_MM_SS_MS}`;
const INTERVALS = 3;

// time length of a window
const INTERVAL_MINUTES = 1;
const INTERVAL_DURATION = `${INTERVAL_MINUTES}m`;
const INTERVAL_MILLIS = INTERVAL_MINUTES * 60 * 1000;

const WINDOW_DURATION_SIZE = 5;
const WINDOW_DURATION_UNITS = 'm';

// interesting dates pertaining to docs and intervals
const START_DATE_PLUS_YEAR = `2021-${START_DATE_MM_DD_HH_MM_SS_MS}`;
const START_DATE_MINUS_YEAR = `2019-${START_DATE_MM_DD_HH_MM_SS_MS}`;
const START_DATE_MINUS_0INTERVALS = START_DATE;
const START_DATE_MINUS_1INTERVALS = getStartDate(-1 * INTERVAL_MILLIS);
const START_DATE_MINUS_2INTERVALS = getStartDate(-2 * INTERVAL_MILLIS);

/* creates the following documents to run queries over; the documents
   are offset from the top of the minute by 30 seconds, the queries always
   run from the top of the hour.

  { "date":"2019-12-31T23:59:30.000Z", "testedValue":1, "group":"group-0" }
  { "date":"2019-12-31T23:59:30.000Z", "testedValue":2, "group":"group-1" }
  { "date":"2019-12-31T23:58:30.000Z", "testedValue":2, "group":"group-0" }
  { "date":"2019-12-31T23:58:30.000Z", "testedValue":3, "group":"group-1" }
  { "date":"2019-12-31T23:57:30.000Z", "testedValue":4, "group":"group-0" }
  { "date":"2019-12-31T23:57:30.000Z", "testedValue":5, "group":"group-1" }
*/

// eslint-disable-next-line import/no-default-export
export default function timeSeriesQueryEndpointTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('legacyEs');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  describe('time_series_query endpoint', () => {
    before(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
      // To browse the documents created, comment out esTestIndexTool.destroy() in below, then:
      //   curl http://localhost:9220/.kibaka-alerting-test-data/_search?size=100 | json
      await createEsDocuments(es, esTestIndexTool, START_DATE, INTERVALS, INTERVAL_MILLIS);
    });

    after(async () => {
      await esTestIndexTool.destroy();
    });

    it('should handle queries before any data available', async () => {
      const query = getQueryBody({
        dateStart: undefined,
        dateEnd: START_DATE_PLUS_YEAR,
      });

      const expected = {
        results: [{ group: 'all documents', metrics: [[START_DATE_PLUS_YEAR, 0]] }],
      };

      expect(await runQueryExpect(query, 200)).eql(expected);
    });

    it('should handle queries after any data available', async () => {
      const query = getQueryBody({
        dateStart: undefined,
        dateEnd: START_DATE_MINUS_YEAR,
      });

      const expected = {
        results: [{ group: 'all documents', metrics: [[START_DATE_MINUS_YEAR, 0]] }],
      };

      expect(await runQueryExpect(query, 200)).eql(expected);
    });

    it('should return the current count for 1 interval, not grouped', async () => {
      const query = getQueryBody({
        dateStart: START_DATE,
        dateEnd: START_DATE,
      });

      const expected = {
        results: [{ group: 'all documents', metrics: [[START_DATE, 6]] }],
      };

      expect(await runQueryExpect(query, 200)).eql(expected);
    });

    it('should return correct count for all intervals, not grouped', async () => {
      const query = getQueryBody({
        dateStart: START_DATE_MINUS_2INTERVALS,
        dateEnd: START_DATE_MINUS_0INTERVALS,
      });

      const expected = {
        results: [
          {
            group: 'all documents',
            metrics: [
              [START_DATE_MINUS_2INTERVALS, 2],
              [START_DATE_MINUS_1INTERVALS, 4],
              [START_DATE_MINUS_0INTERVALS, 6],
            ],
          },
        ],
      };

      expect(await runQueryExpect(query, 200)).eql(expected);
    });

    it('should return correct min for all intervals, not grouped', async () => {
      const query = getQueryBody({
        aggType: 'min',
        aggField: 'testedValue',
        dateStart: START_DATE_MINUS_2INTERVALS,
        dateEnd: START_DATE_MINUS_0INTERVALS,
      });

      const expected = {
        results: [
          {
            group: 'all documents',
            metrics: [
              [START_DATE_MINUS_2INTERVALS, 4],
              [START_DATE_MINUS_1INTERVALS, 2],
              [START_DATE_MINUS_0INTERVALS, 1],
            ],
          },
        ],
      };

      expect(await runQueryExpect(query, 200)).eql(expected);
    });

    it('should return correct count for all intervals, grouped', async () => {
      const query = getQueryBody({
        termField: 'group',
        dateStart: START_DATE_MINUS_2INTERVALS,
        dateEnd: START_DATE_MINUS_0INTERVALS,
      });

      const expected = {
        results: [
          {
            group: 'group-0',
            metrics: [
              [START_DATE_MINUS_2INTERVALS, 1],
              [START_DATE_MINUS_1INTERVALS, 2],
              [START_DATE_MINUS_0INTERVALS, 3],
            ],
          },
          {
            group: 'group-1',
            metrics: [
              [START_DATE_MINUS_2INTERVALS, 1],
              [START_DATE_MINUS_1INTERVALS, 2],
              [START_DATE_MINUS_0INTERVALS, 3],
            ],
          },
        ],
      };

      expect(await runQueryExpect(query, 200)).eql(expected);
    });

    it('should return correct average for all intervals, grouped', async () => {
      const query = getQueryBody({
        aggType: 'avg',
        aggField: 'testedValue',
        groupBy: 'top',
        termField: 'group',
        termSize: 100,
        dateStart: START_DATE_MINUS_2INTERVALS,
        dateEnd: START_DATE_MINUS_0INTERVALS,
      });

      const expected = {
        results: [
          {
            group: 'group-1',
            metrics: [
              [START_DATE_MINUS_2INTERVALS, 5 / 1],
              [START_DATE_MINUS_1INTERVALS, (5 + 3) / 2],
              [START_DATE_MINUS_0INTERVALS, (5 + 3 + 2) / 3],
            ],
          },
          {
            group: 'group-0',
            metrics: [
              [START_DATE_MINUS_2INTERVALS, 4 / 1],
              [START_DATE_MINUS_1INTERVALS, (4 + 2) / 2],
              [START_DATE_MINUS_0INTERVALS, (4 + 2 + 1) / 3],
            ],
          },
        ],
      };

      expect(await runQueryExpect(query, 200)).eql(expected);
    });

    it('should return correct sorted group for average', async () => {
      const query = getQueryBody({
        aggType: 'avg',
        aggField: 'testedValue',
        groupBy: 'top',
        termField: 'group',
        termSize: 1,
        dateStart: START_DATE_MINUS_2INTERVALS,
        dateEnd: START_DATE_MINUS_0INTERVALS,
      });
      const result = await runQueryExpect(query, 200);
      expect(result.results.length).to.be(1);
      expect(result.results[0].group).to.be('group-1');
    });

    it('should return correct sorted group for min', async () => {
      const query = getQueryBody({
        aggType: 'min',
        aggField: 'testedValue',
        groupBy: 'top',
        termField: 'group',
        termSize: 1,
        dateStart: START_DATE_MINUS_2INTERVALS,
        dateEnd: START_DATE_MINUS_0INTERVALS,
      });
      const result = await runQueryExpect(query, 200);
      expect(result.results.length).to.be(1);
      expect(result.results[0].group).to.be('group-0');
    });

    it('should return an error when passed invalid input', async () => {
      const query = { ...getQueryBody(), aggType: 'invalid-agg-type' };
      const expected = {
        error: 'Bad Request',
        message: '[request body.aggType]: invalid aggType: "invalid-agg-type"',
        statusCode: 400,
      };
      expect(await runQueryExpect(query, 400)).eql(expected);
    });

    it('should return an error when too many intervals calculated', async () => {
      const query = {
        ...getQueryBody(),
        dateStart: '2000-01-01T00:00:00.000Z',
        dateEnd: '2020-01-01T00:00:00.000Z',
        interval: '1s',
      };
      const expected = {
        error: 'Bad Request',
        message:
          '[request body]: calculated number of intervals 631152000 is greater than maximum 1000',
        statusCode: 400,
      };
      expect(await runQueryExpect(query, 400)).eql(expected);
    });

    it('should handle epoch_millis time field', async () => {
      const query = getQueryBody({
        dateStart: START_DATE,
        dateEnd: START_DATE,
        timeField: 'date_epoch_millis',
      });
      const expected = {
        results: [{ group: 'all documents', metrics: [[START_DATE, 6]] }],
      };
      expect(await runQueryExpect(query, 200)).eql(expected);
    });

    it('should handle ES errors', async () => {
      const query = getQueryBody({
        dateStart: START_DATE,
        dateEnd: START_DATE,
        timeField: 'source', // bad field for time
        aggType: 'avg',
        aggField: 'source', // bad field for agg
      });
      const expected = {
        results: [],
      };
      expect(await runQueryExpect(query, 200)).eql(expected);
    });
  });

  async function runQueryExpect(requestBody: TimeSeriesQuery, status: number): Promise<any> {
    const url = `${getUrlPrefix(Spaces.space1.id)}/${INDEX_THRESHOLD_TIME_SERIES_QUERY_URL}`;
    const res = await supertest.post(url).set('kbn-xsrf', 'foo').send(requestBody);

    if (res.status !== status) {
      // good place to put a console log for debugging unexpected results
      // console.log(res.body)
      throw new Error(`expected status ${status}, but got ${res.status}`);
    }

    return res.body;
  }
}

function getQueryBody(body: Partial<TimeSeriesQuery> = {}): TimeSeriesQuery {
  const defaults: TimeSeriesQuery = {
    index: ES_TEST_INDEX_NAME,
    timeField: 'date',
    aggType: 'count',
    aggField: undefined,
    groupBy: 'all',
    termField: undefined,
    termSize: undefined,
    dateStart: START_DATE_MINUS_0INTERVALS,
    dateEnd: undefined,
    timeWindowSize: WINDOW_DURATION_SIZE,
    timeWindowUnit: WINDOW_DURATION_UNITS,
    interval: INTERVAL_DURATION,
  };
  return Object.assign({}, defaults, body);
}

function getStartDate(deltaMillis: number) {
  const startDateMillis = Date.parse(START_DATE);
  const returnedDateMillis = startDateMillis + deltaMillis;
  return new Date(returnedDateMillis).toISOString();
}
