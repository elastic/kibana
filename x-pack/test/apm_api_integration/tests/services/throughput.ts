/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import qs from 'querystring';
import { first, last } from 'lodash';
import moment from 'moment';
import { Coordinate } from '../../../../plugins/apm/typings/timeseries';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/createCallApmApi';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

function removeInvalidYAxis({ y }: Coordinate) {
  return y !== null;
}

type ThroughputReturn = APIReturnType<'GET /api/apm/services/{serviceName}/throughput'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];

  registry.when('Throughput when data is not loaded', { config: 'basic', archives: [] }, () => {
    it('handles the empty state', async () => {
      const response = await supertest.get(
        `/api/apm/services/opbeans-java/throughput?${qs.stringify({
          start: metadata.start,
          end: metadata.end,
          uiFilters: encodeURIComponent('{}'),
          transactionType: 'request',
        })}`
      );
      expect(response.status).to.be(200);
      expect(response.body.currentPeriod.length).to.be(0);
      expect(response.body.previousPeriod.length).to.be(0);
    });
  });

  let throughputResponse: ThroughputReturn;
  registry.when(
    'Throughput when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      before(async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-java/throughput?${qs.stringify({
            start: metadata.start,
            end: metadata.end,
            uiFilters: encodeURIComponent('{}'),
            transactionType: 'request',
          })}`
        );
        throughputResponse = response.body;
      });

      it('returns some data', () => {
        expect(throughputResponse.currentPeriod.length).to.be.greaterThan(0);
        expect(throughputResponse.previousPeriod.length).not.to.be.greaterThan(0);

        const nonNullDataPoints = throughputResponse.currentPeriod.filter(removeInvalidYAxis);

        expect(nonNullDataPoints.length).to.be.greaterThan(0);
      });

      it('has the correct start date', () => {
        expectSnapshot(
          new Date(first(throughputResponse.currentPeriod)?.x ?? NaN).toISOString()
        ).toMatchInline(`"2020-12-08T13:57:30.000Z"`);
      });

      it('has the correct end date', () => {
        expectSnapshot(
          new Date(last(throughputResponse.currentPeriod)?.x ?? NaN).toISOString()
        ).toMatchInline(`"2020-12-08T14:27:30.000Z"`);
      });

      it('has the correct number of buckets', () => {
        expectSnapshot(throughputResponse.currentPeriod.length).toMatchInline(`61`);
      });

      it('has the correct throughput', () => {
        expectSnapshot(throughputResponse.currentPeriod).toMatch();
      });
    }
  );

  registry.when(
    'Throughput when data is loaded with time comparison',
    { config: 'basic', archives: [archiveName] },
    () => {
      before(async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-java/throughput?${qs.stringify({
            uiFilters: encodeURIComponent('{}'),
            transactionType: 'request',
            start: moment(metadata.end).subtract(15, 'minutes').toISOString(),
            end: metadata.end,
            comparisonStart: metadata.start,
            comparisonEnd: moment(metadata.start).add(15, 'minutes').toISOString(),
          })}`
        );
        throughputResponse = response.body;
      });

      it('returns some data', () => {
        expect(throughputResponse.currentPeriod.length).to.be.greaterThan(0);
        expect(throughputResponse.previousPeriod.length).to.be.greaterThan(0);

        const currentPeriodNonNullDataPoints = throughputResponse.currentPeriod.filter(
          removeInvalidYAxis
        );
        const previousPeriodNonNullDataPoints = throughputResponse.previousPeriod.filter(
          removeInvalidYAxis
        );

        expect(currentPeriodNonNullDataPoints.length).to.be.greaterThan(0);
        expect(previousPeriodNonNullDataPoints.length).to.be.greaterThan(0);
      });

      it('has the correct start date', () => {
        expectSnapshot(
          new Date(first(throughputResponse.currentPeriod)?.x ?? NaN).toISOString()
        ).toMatchInline(`"2020-12-08T14:12:50.000Z"`);

        expectSnapshot(
          new Date(first(throughputResponse.previousPeriod)?.x ?? NaN).toISOString()
        ).toMatchInline(`"2020-12-08T14:12:50.000Z"`);
      });

      it('has the correct end date', () => {
        expectSnapshot(
          new Date(last(throughputResponse.currentPeriod)?.x ?? NaN).toISOString()
        ).toMatchInline(`"2020-12-08T14:27:50.000Z"`);

        expectSnapshot(
          new Date(last(throughputResponse.previousPeriod)?.x ?? NaN).toISOString()
        ).toMatchInline(`"2020-12-08T14:27:50.000Z"`);
      });

      it('has the correct number of buckets', () => {
        expectSnapshot(throughputResponse.currentPeriod.length).toMatchInline(`91`);
        expectSnapshot(throughputResponse.previousPeriod.length).toMatchInline(`91`);
      });

      it('has the correct throughput', () => {
        expectSnapshot(throughputResponse).toMatch();
      });
    }
  );
}
