/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import expect from '@kbn/expect';

import {
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
  DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL,
} from '../../../../../plugins/security_solution/common/constants';
import { createSignalsIndex } from '../../../utils';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { ThreatEcs } from '../../../../../plugins/security_solution/common/ecs/threat';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('Alerts Compatibility', function () {
    describe('CTI', () => {
      before(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/legacy_cti_signals'
        );
        await createSignalsIndex(supertest);
        // wait for indexes to be loaded
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/legacy_cti_signals'
        );
      });

      it('allows querying of legacy enriched signals by threat.indicator', async () => {
        const expectedMatch = {
          atomic: 'rylastic2.local',
          field: 'host.name',
          id: '_tdUD3sBcVT20cvWAkpd',
          index: 'filebeat-7.14.0-2021.08.04-000001',
          type: 'indicator_match_rule',
        };

        const {
          body: {
            hits: { hits },
          },
        }: { body: estypes.SearchResponse<{ threat: ThreatEcs }> } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send({
            query: {
              nested: {
                path: 'threat.indicator',
                query: {
                  bool: {
                    should: [
                      {
                        exists: {
                          field: 'threat.indicator.domain',
                        },
                      },
                    ],
                  },
                },
              },
            },
          })
          .expect(200);
        expect(hits.length).to.eql(2);
        const indicatorMatches = hits.map(
          (hit) => hit._source?.threat.indicator && hit._source?.threat.indicator[0].matched
        );
        expect(indicatorMatches).to.eql([expectedMatch, expectedMatch]);
      });

      it('migrates legacy enriched signals to be queried by threat.enrichments', async () => {});
    });
  });
};
