/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { expectSnapshot } from '../../../common/match_snapshot';
import { PromiseReturnType } from '../../../../../plugins/observability/typings/common';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import archives_metadata from '../../../common/archives_metadata';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestAsApmReadUserWithoutMlAccess = getService('supertestAsApmReadUserWithoutMlAccess');
  const esArchiver = getService('esArchiver');

  const archiveName = 'apm_8.0.0';

  const range = archives_metadata[archiveName];

  // url parameters
  const start = encodeURIComponent(range.start);
  const end = encodeURIComponent(range.end);

  const uiFilters = encodeURIComponent(JSON.stringify({}));

  describe('APM Services Overview', () => {
    describe('when data is loaded', () => {
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      describe('with the default APM read user', () => {
        describe('and fetching a list of services', () => {
          let response: PromiseReturnType<typeof supertest.get>;
          before(async () => {
            response = await supertest.get(
              `/api/apm/services?start=${start}&end=${end}&uiFilters=${uiFilters}`
            );
          });

          it('the response is successful', () => {
            expect(response.status).to.eql(200);
          });

          it('there is at least one service', () => {
            expect(response.body.items.length).to.be.greaterThan(0);
          });

          it('some items have a health status set', () => {
            // Under the assumption that the loaded archive has
            // at least one APM ML job, and the time range is longer
            // than 15m, at least one items should have a health status
            // set. Note that we currently have a bug where healthy
            // services report as unknown (so without any health status):
            // https://github.com/elastic/kibana/issues/77083

            const healthStatuses = response.body.items.map((item: any) => item.healthStatus);

            expect(healthStatuses.filter(Boolean).length).to.be.greaterThan(0);

            expectSnapshot(healthStatuses).toMatchInline(`
            Array [
              "healthy",
              undefined,
              "healthy",
              undefined,
              "healthy",
              "healthy",
              "healthy",
              "healthy",
            ]
          `);
          });
        });
      });

      describe('with a user that does not have access to ML', () => {
        let response: PromiseReturnType<typeof supertest.get>;
        before(async () => {
          response = await supertestAsApmReadUserWithoutMlAccess.get(
            `/api/apm/services?start=${start}&end=${end}&uiFilters=${uiFilters}`
          );
        });

        it('the response is successful', () => {
          expect(response.status).to.eql(200);
        });

        it('there is at least one service', () => {
          expect(response.body.items.length).to.be.greaterThan(0);
        });

        it('contains no health statuses', () => {
          const definedHealthStatuses = response.body.items
            .map((item: any) => item.healthStatus)
            .filter(Boolean);

          expect(definedHealthStatuses.length).to.be(0);
        });
      });

      describe('and fetching a list of services with a filter', () => {
        let response: PromiseReturnType<typeof supertest.get>;
        before(async () => {
          response = await supertest.get(
            `/api/apm/services?start=${start}&end=${end}&uiFilters=${encodeURIComponent(
              `{"kuery":"service.name:opbeans-java","environment":"ENVIRONMENT_ALL"}`
            )}`
          );
        });

        it('does not return health statuses for services that are not found in APM data', () => {
          expect(response.status).to.be(200);

          expect(response.body.items.length).to.be(1);

          expect(response.body.items[0].serviceName).to.be('opbeans-java');
        });
      });
    });
  });
}
