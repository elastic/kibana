/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import expect from '@kbn/expect';
import moment from 'moment';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/createCallApmApi';

type ErrorGroupsDetailedStatistics = APIReturnType<'GET /api/apm/services/{serviceName}/error_groups/detailed_statistics'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];
  const { start, end } = metadata;
  const groupIds = [
    '051f95eabf120ebe2f8b0399fe3e54c5',
    '3bb34b98031a19c277bf59c3db82d3f3',
    'b1c3ff13ec52de11187facf9c6a82538',
    '9581687a53eac06aba50ba17cbd959c5',
    '97c2eef51fec10d177ade955670a2f15',
  ];

  registry.when(
    'Error groups detailed statistics when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/error_groups/detailed_statistics`,
            query: {
              start,
              end,
              numBuckets: 20,
              transactionType: 'request',
              groupIds: JSON.stringify(groupIds),
            },
          })
        );

        expect(response.status).to.be(200);
        expect(response.body).to.be.eql({ currentPeriod: {}, previousPeriod: {} });
      });
    }
  );

  registry.when(
    'Error groups detailed statistics when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('returns the correct data', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/error_groups/detailed_statistics`,
            query: {
              start,
              end,
              numBuckets: 20,
              transactionType: 'request',
              groupIds: JSON.stringify(groupIds),
            },
          })
        );

        expect(response.status).to.be(200);

        const errorGroupsComparisonStatistics = response.body as ErrorGroupsDetailedStatistics;
        expect(Object.keys(errorGroupsComparisonStatistics.currentPeriod).sort()).to.eql(
          groupIds.sort()
        );

        groupIds.forEach((groupId) => {
          expect(errorGroupsComparisonStatistics.currentPeriod[groupId]).not.to.be.empty();
        });

        const errorgroupsComparisonStatistics =
          errorGroupsComparisonStatistics.currentPeriod[groupIds[0]];
        expect(
          errorgroupsComparisonStatistics.timeseries.map(({ y }) => y && isFinite(y)).length
        ).to.be.greaterThan(0);
        expectSnapshot(errorgroupsComparisonStatistics).toMatch();
      });

      it('returns an empty state when requested groupIds are not available in the given time range', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/error_groups/detailed_statistics`,
            query: {
              start,
              end,
              numBuckets: 20,
              transactionType: 'request',
              groupIds: JSON.stringify(['foo']),
            },
          })
        );

        expect(response.status).to.be(200);
        expect(response.body).to.be.eql({ currentPeriod: {}, previousPeriod: {} });
      });
    }
  );

  registry.when(
    'Error groups detailed statistics when data is loaded with previous data',
    { config: 'basic', archives: [archiveName] },
    () => {
      describe('returns the correct data', async () => {
        let response: {
          status: number;
          body: ErrorGroupsDetailedStatistics;
        };
        before(async () => {
          response = await supertest.get(
            url.format({
              pathname: `/api/apm/services/opbeans-java/error_groups/detailed_statistics`,
              query: {
                numBuckets: 20,
                transactionType: 'request',
                groupIds: JSON.stringify(groupIds),
                start: moment(end).subtract(15, 'minutes').toISOString(),
                end,
                comparisonStart: start,
                comparisonEnd: moment(start).add(15, 'minutes').toISOString(),
              },
            })
          );

          expect(response.status).to.be(200);
        });

        it('returns correct timeseries', () => {
          const errorGroupsComparisonStatistics = response.body as ErrorGroupsDetailedStatistics;
          const errorgroupsComparisonStatistics =
            errorGroupsComparisonStatistics.currentPeriod[groupIds[0]];
          expect(
            errorgroupsComparisonStatistics.timeseries.map(({ y }) => y && isFinite(y)).length
          ).to.be.greaterThan(0);
          expectSnapshot(errorgroupsComparisonStatistics).toMatch();
        });

        it('matches x-axis on current period and previous period', () => {
          const errorGroupsComparisonStatistics = response.body as ErrorGroupsDetailedStatistics;

          const currentPeriodItems = Object.values(errorGroupsComparisonStatistics.currentPeriod);
          const previousPeriodItems = Object.values(errorGroupsComparisonStatistics.previousPeriod);

          const currentPeriodFirstItem = currentPeriodItems[0];
          const previousPeriodFirstItem = previousPeriodItems[0];

          expect(currentPeriodFirstItem.timeseries.map(({ x }) => x)).to.be.eql(
            previousPeriodFirstItem.timeseries.map(({ x }) => x)
          );
        });
      });

      it('returns an empty state when requested groupIds are not available in the given time range', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/error_groups/detailed_statistics`,
            query: {
              numBuckets: 20,
              transactionType: 'request',
              groupIds: JSON.stringify(['foo']),
              start: moment(end).subtract(15, 'minutes').toISOString(),
              end,
              comparisonStart: start,
              comparisonEnd: moment(start).add(15, 'minutes').toISOString(),
            },
          })
        );

        expect(response.status).to.be(200);
        expect(response.body).to.be.eql({ currentPeriod: {}, previousPeriod: {} });
      });
    }
  );
}
