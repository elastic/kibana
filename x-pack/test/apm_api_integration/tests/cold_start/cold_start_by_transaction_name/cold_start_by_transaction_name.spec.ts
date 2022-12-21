/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { first, last } from 'lodash';
import moment from 'moment';
import {
  APIReturnType,
  APIClientRequestParamsOf,
} from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { RecursivePartial } from '@kbn/apm-plugin/typings/common';
import { isFiniteNumber } from '@kbn/apm-plugin/common/utils/is_finite_number';
import { dataConfig, generateData } from './generate_data';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

type ColdStartRate =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate_by_transaction_name'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const { serviceName, transactionName } = dataConfig;
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi(
    overrides?: RecursivePartial<
      APIClientRequestParamsOf<'GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate'>['params']
    >
  ) {
    return await apmApiClient.readUser({
      endpoint:
        'GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate_by_transaction_name',
      params: {
        path: { serviceName },
        query: {
          transactionType: 'request',
          transactionName,
          environment: 'ENVIRONMENT_ALL',
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          kuery: '',
          ...overrides?.query,
        },
      },
    });
  }

  registry.when(
    'Cold start rate by transaction name when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const { status, body } = await callApi();

        expect(status).to.be(200);
        expect(body.currentPeriod.transactionColdstartRate).to.empty();
        expect(body.currentPeriod.average).to.be(null);

        expect(body.previousPeriod.transactionColdstartRate).to.empty();
        expect(body.previousPeriod.average).to.be(null);
      });
    }
  );

  registry.when(
    'Cold start rate by transaction name when data is generated',
    { config: 'basic', archives: [] },
    () => {
      describe('without comparison', () => {
        let body: ColdStartRate;
        let status: number;

        before(async () => {
          await generateData({
            synthtraceEsClient,
            start,
            end,
            coldStartRate: 10,
            warmStartRate: 30,
          });
          const response = await callApi();
          body = response.body;
          status = response.status;
        });

        after(() => synthtraceEsClient.clean());

        it('returns correct HTTP status', () => {
          expect(status).to.be(200);
        });

        it('returns an array of transaction cold start rates', () => {
          expect(body).to.have.property('currentPeriod');
          expect(body.currentPeriod.transactionColdstartRate).to.have.length(15);
          expect(body.currentPeriod.transactionColdstartRate.every(({ y }) => y === 0.25)).to.be(
            true
          );
        });

        it('returns correct average rate', () => {
          expect(body.currentPeriod.average).to.be(0.25);
        });

        it("doesn't have data for the previous period", () => {
          expect(body).to.have.property('previousPeriod');
          expect(body.previousPeriod.transactionColdstartRate).to.have.length(0);
          expect(body.previousPeriod.average).to.be(null);
        });
      });

      describe('with comparison', () => {
        let body: ColdStartRate;
        let status: number;

        before(async () => {
          const startDate = moment(start).add(6, 'minutes');
          const endDate = moment(start).add(9, 'minutes');
          const comparisonStartDate = new Date(start);
          const comparisonEndDate = moment(start).add(3, 'minutes');

          await generateData({
            synthtraceEsClient,
            start: startDate.valueOf(),
            end: endDate.valueOf(),
            coldStartRate: 10,
            warmStartRate: 30,
          });
          await generateData({
            synthtraceEsClient,
            start: comparisonStartDate.getTime(),
            end: comparisonEndDate.valueOf(),
            coldStartRate: 20,
            warmStartRate: 20,
          });

          const response = await callApi({
            query: {
              start: startDate.toISOString(),
              end: endDate.subtract(1, 'seconds').toISOString(),
              offset: '6m',
            },
          });
          body = response.body;
          status = response.status;
        });

        after(() => synthtraceEsClient.clean());

        it('returns correct HTTP status', () => {
          expect(status).to.be(200);
        });

        it('returns some data', () => {
          expect(body.currentPeriod.average).not.to.be(null);
          expect(body.currentPeriod.transactionColdstartRate.length).to.be.greaterThan(0);
          const hasCurrentPeriodData = body.currentPeriod.transactionColdstartRate.some(({ y }) =>
            isFiniteNumber(y)
          );
          expect(hasCurrentPeriodData).to.equal(true);

          expect(body.previousPeriod.average).not.to.be(null);
          expect(body.previousPeriod.transactionColdstartRate.length).to.be.greaterThan(0);
          const hasPreviousPeriodData = body.previousPeriod.transactionColdstartRate.some(({ y }) =>
            isFiniteNumber(y)
          );
          expect(hasPreviousPeriodData).to.equal(true);
        });

        it('has same start time for both periods', () => {
          expect(first(body.currentPeriod.transactionColdstartRate)?.x).to.equal(
            first(body.previousPeriod.transactionColdstartRate)?.x
          );
        });

        it('has same end time for both periods', () => {
          expect(last(body.currentPeriod.transactionColdstartRate)?.x).to.equal(
            last(body.previousPeriod.transactionColdstartRate)?.x
          );
        });

        it('returns an array of transaction cold start rates', () => {
          expect(body.currentPeriod.transactionColdstartRate).to.have.length(3);
          expect(body.currentPeriod.transactionColdstartRate.every(({ y }) => y === 0.25)).to.be(
            true
          );

          expect(body.previousPeriod.transactionColdstartRate).to.have.length(3);
          expect(body.previousPeriod.transactionColdstartRate.every(({ y }) => y === 0.5)).to.be(
            true
          );
        });

        it('has same average value for both periods', () => {
          expect(body.currentPeriod.average).to.be(0.25);
          expect(body.previousPeriod.average).to.be(0.5);
        });
      });
    }
  );
}
