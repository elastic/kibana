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
import {
  createSignalsIndex,
  deleteSignalsIndex,
  finalizeSignalsMigration,
  startSignalsMigration,
  waitFor,
} from '../../../utils';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { ThreatEcs } from '../../../../../plugins/security_solution/common/ecs/threat';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('Alerts Compatibility', function () {
    describe('CTI', () => {
      const expectedDomain = 'elastic.local';
      const expectedProvider = 'provider1';
      const expectedEnrichmentMatch = {
        atomic: expectedDomain,
        field: 'host.name',
        id: '_tdUD3sBcVT20cvWAkpd',
        index: 'filebeat-7.14.0-2021.08.04-000001',
        type: 'indicator_match_rule',
      };

      beforeEach(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/legacy_cti_signals'
        );
        await createSignalsIndex(supertest);
      });

      afterEach(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/legacy_cti_signals'
        );
        await deleteSignalsIndex(supertest);
      });

      it('allows querying of legacy enriched signals by threat.indicator', async () => {
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
                          field: 'threat.indicator.first_seen',
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
        const indicators = hits.flatMap((hit) => hit._source?.threat.indicator);
        const indicatorMatches = indicators.map((indicator) => indicator?.matched);
        expect(indicatorMatches).to.eql([expectedEnrichmentMatch, expectedEnrichmentMatch]);
        const indicatorDomains = indicators.map((indicator) => indicator?.domain);
        expect(indicatorDomains).to.eql([expectedDomain, expectedDomain]);
        const indicatorProviders = indicators.map((indicator) => indicator?.provider);
        expect(indicatorProviders).to.eql([expectedProvider, expectedProvider]);
      });

      it('migrates legacy enriched signals to be queried by threat.enrichments', async () => {
        const {
          body: { indices },
        }: {
          body: { indices: Array<{ index: string; is_outdated: boolean; version: number }> };
        } = await supertest
          .get(DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL)
          .set('kbn-xsrf', 'true')
          .query({ from: '2021-08-01' })
          .expect(200);
        expect(indices.length).to.eql(1);
        expect(indices[0].is_outdated).to.eql(true);

        const [migration] = await startSignalsMigration({ indices: [indices[0].index], supertest });
        await waitFor(async () => {
          const [{ completed }] = await finalizeSignalsMigration({
            migrationIds: [migration.migration_id],
            supertest,
          });

          return completed === true;
        }, `polling finalize_migration until complete`);

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
                path: 'threat.enrichments',
                query: {
                  bool: {
                    should: [
                      {
                        exists: {
                          field: 'threat.enrichments.indicator.first_seen',
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
        const enrichments = hits.flatMap((hit) => hit._source?.threat.enrichments);
        const enrichmentMatches = enrichments.map((enrichment) => enrichment?.matched);
        expect(enrichmentMatches).to.eql([expectedEnrichmentMatch, expectedEnrichmentMatch]);
        const enrichmentDomains = enrichments.map(
          (enrichment) => enrichment?.indicator?.url?.domain
        );
        expect(enrichmentDomains).to.eql([expectedDomain, expectedDomain]);
        const enrichmentProviders = enrichments.map(
          (enrichment) => enrichment?.indicator?.provider
        );
        expect(enrichmentProviders).to.eql([expectedProvider, expectedProvider]);
      });
    });
  });
};
