/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { expectSnapshot } from '../../../common/match_snapshot';
import { PromiseReturnType } from '../../../../../plugins/apm/typings/common';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import archives_metadata from '../../../common/archives_metadata';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
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

        it('some items have severity set', () => {
          // Under the assumption that the loaded archive has
          // at least one APM ML job, and the time range is longer
          // than 15m, at least one items should have severity set.
          // Note that we currently have a bug where healthy services
          // report as unknown (so without any severity status):
          // https://github.com/elastic/kibana/issues/77083

          const severityScores = response.body.items.map((item: any) => item.severity);

          expect(severityScores.filter(Boolean).length).to.be.greaterThan(0);

          expectSnapshot(severityScores).toMatchInline(`
            Array [
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              "warning",
              undefined,
            ]
          `);
        });
      });
    });
  });
}
