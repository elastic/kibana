/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import qs from 'querystring';
import { pick, uniqBy } from 'lodash';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import archives from '../../../common/archives_metadata';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  describe('Service overview error groups', () => {
    describe('when data is not loaded', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-java/error_groups?${qs.stringify({
            start,
            end,
            uiFilters: '{}',
            size: 5,
            numBuckets: 20,
            pageIndex: 0,
            sortDirection: 'desc',
            sortField: 'occurrences',
          })}`
        );

        expect(response.status).to.be(200);
        expect(response.body).to.eql({
          total_error_groups: 0,
          error_groups: [],
          is_aggregation_accurate: true,
        });
      });
    });

    describe('when data is loaded', () => {
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      it('returns the correct data', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-java/error_groups?${qs.stringify({
            start,
            end,
            uiFilters: '{}',
            size: 5,
            numBuckets: 20,
            pageIndex: 0,
            sortDirection: 'desc',
            sortField: 'occurrences',
          })}`
        );

        expect(response.status).to.be(200);

        expectSnapshot(response.body.total_error_groups).toMatchInline(`5`);

        expectSnapshot(response.body.error_groups.map((group: any) => group.name)).toMatchInline(`
          Array [
            "Could not write JSON: Null return value from advice does not match primitive return type for: public abstract double co.elastic.apm.opbeans.repositories.Numbers.getCost(); nested exception is com.fasterxml.jackson.databind.JsonMappingException: Null return value from advice does not match primitive return type for: public abstract double co.elastic.apm.opbeans.repositories.Numbers.getCost() (through reference chain: co.elastic.apm.opbeans.repositories.Stats[\\"numbers\\"]->com.sun.proxy.$Proxy133[\\"cost\\"])",
            "java.io.IOException: Connection reset by peer",
            "Connection reset by peer",
            "Could not write JSON: Unable to find co.elastic.apm.opbeans.model.Customer with id 6617; nested exception is com.fasterxml.jackson.databind.JsonMappingException: Unable to find co.elastic.apm.opbeans.model.Customer with id 6617 (through reference chain: co.elastic.apm.opbeans.model.Customer_$$_jvst369_3[\\"email\\"])",
            "Request method 'POST' not supported",
          ]
        `);

        expectSnapshot(response.body.error_groups.map((group: any) => group.occurrences.value))
          .toMatchInline(`
          Array [
            8,
            2,
            1,
            1,
            1,
          ]
        `);

        const firstItem = response.body.error_groups[0];

        expectSnapshot(pick(firstItem, 'group_id', 'last_seen', 'name', 'occurrences.value'))
          .toMatchInline(`
          Object {
            "group_id": "051f95eabf120ebe2f8b0399fe3e54c5",
            "last_seen": 1601391561523,
            "name": "Could not write JSON: Null return value from advice does not match primitive return type for: public abstract double co.elastic.apm.opbeans.repositories.Numbers.getCost(); nested exception is com.fasterxml.jackson.databind.JsonMappingException: Null return value from advice does not match primitive return type for: public abstract double co.elastic.apm.opbeans.repositories.Numbers.getCost() (through reference chain: co.elastic.apm.opbeans.repositories.Stats[\\"numbers\\"]->com.sun.proxy.$Proxy133[\\"cost\\"])",
            "occurrences": Object {
              "value": 8,
            },
          }
        `);

        expectSnapshot(
          firstItem.occurrences.timeseries.filter(({ y }: any) => y > 0).length
        ).toMatchInline(`7`);
      });

      it('sorts items in the correct order', async () => {
        const descendingResponse = await supertest.get(
          `/api/apm/services/opbeans-java/error_groups?${qs.stringify({
            start,
            end,
            uiFilters: '{}',
            size: 5,
            numBuckets: 20,
            pageIndex: 0,
            sortDirection: 'desc',
            sortField: 'occurrences',
          })}`
        );

        expect(descendingResponse.status).to.be(200);

        const descendingOccurrences = descendingResponse.body.error_groups.map(
          (item: any) => item.occurrences.value
        );

        expect(descendingOccurrences).to.eql(descendingOccurrences.concat().sort().reverse());

        const ascendingResponse = await supertest.get(
          `/api/apm/services/opbeans-java/error_groups?${qs.stringify({
            start,
            end,
            uiFilters: '{}',
            size: 5,
            numBuckets: 20,
            pageIndex: 0,
            sortDirection: 'desc',
            sortField: 'occurrences',
          })}`
        );

        const ascendingOccurrences = ascendingResponse.body.error_groups.map(
          (item: any) => item.occurrences.value
        );

        expect(ascendingOccurrences).to.eql(ascendingOccurrences.concat().sort().reverse());
      });

      it('sorts items by the correct field', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-java/error_groups?${qs.stringify({
            start,
            end,
            uiFilters: '{}',
            size: 5,
            numBuckets: 20,
            pageIndex: 0,
            sortDirection: 'desc',
            sortField: 'last_seen',
          })}`
        );

        expect(response.status).to.be(200);

        const dates = response.body.error_groups.map((group: any) => group.last_seen);

        expect(dates).to.eql(dates.concat().sort().reverse());
      });

      it('paginates through the items', async () => {
        const size = 1;

        const firstPage = await supertest.get(
          `/api/apm/services/opbeans-java/error_groups?${qs.stringify({
            start,
            end,
            uiFilters: '{}',
            size,
            numBuckets: 20,
            pageIndex: 0,
            sortDirection: 'desc',
            sortField: 'occurrences',
          })}`
        );

        expect(firstPage.status).to.eql(200);

        const totalItems = firstPage.body.total_error_groups;

        const pages = Math.floor(totalItems / size);

        const items = await new Array(pages)
          .fill(undefined)
          .reduce(async (prevItemsPromise, _, pageIndex) => {
            const prevItems = await prevItemsPromise;

            const thisPage = await supertest.get(
              `/api/apm/services/opbeans-java/error_groups?${qs.stringify({
                start,
                end,
                uiFilters: '{}',
                size,
                numBuckets: 20,
                pageIndex,
                sortDirection: 'desc',
                sortField: 'occurrences',
              })}`
            );

            return prevItems.concat(thisPage.body.error_groups);
          }, Promise.resolve([]));

        expect(items.length).to.eql(totalItems);

        expect(uniqBy(items, 'group_id').length).to.eql(totalItems);
      });
    });
  });
}
