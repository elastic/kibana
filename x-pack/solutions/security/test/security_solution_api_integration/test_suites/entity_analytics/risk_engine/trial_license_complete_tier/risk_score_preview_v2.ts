/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ALERT_RISK_SCORE } from '@kbn/rule-data-utils';
import { v4 as uuidv4 } from 'uuid';
import {
  createAlertsIndex,
  deleteAllAlerts,
  deleteAllRules,
} from '@kbn/detections-response-ftr-services';
import { dataGeneratorFactory } from '../../../detections_response/utils';
import {
  assetCriticalityRouteHelpersFactory,
  buildDocument,
  cleanAssetCriticality,
  createAndSyncRuleAndAlertsFactory,
  deleteAllRiskScores,
  enableEntityStoreV2,
  disableEntityStoreV2,
  riskScorePreviewFactory,
  sanitizeScores,
  waitForAssetCriticalityToBePresent,
} from '../../utils';

import type { FtrProviderContext } from '../../../../ftr_provider_context';

const SINGLE_ALERT_RISK21_HOST1 = {
  calculated_level: 'Unknown',
  calculated_score: 21,
  calculated_score_norm: 8.100601759,
  category_1_count: 1,
  category_1_score: 8.100601759,
  euid_fields: { 'host.name': 'host-1' },
  id_field: 'entity.id',
  id_value: 'host:host-1',
  modifiers: [],
} as const;

const buildExpectedScore = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  ...SINGLE_ALERT_RISK21_HOST1,
  ...overrides,
});

const sortByIdValue = <T extends { id_value?: string }>(scores: T[]): T[] =>
  [...scores].sort((a, b) => String(a.id_value).localeCompare(String(b.id_value)));

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');

  const createAndSyncRuleAndAlerts = createAndSyncRuleAndAlertsFactory({ supertest, log });
  const riskScorePreview = riskScorePreviewFactory(supertest);

  /**
   * Raw preview helper used in tests that need the full response body
   * (e.g. asset criticality tests that index multiple distinct hosts).
   */
  async function previewHostRiskScoresRaw(
    documentId: string,
    {
      alerts = 1,
      riskScore = 21,
      maxSignals = 100,
    }: { alerts?: number; riskScore?: number; maxSignals?: number } = {}
  ) {
    await createAndSyncRuleAndAlerts({
      query: `id: ${documentId}`,
      alerts,
      riskScore,
      maxSignals,
    });
    return await riskScorePreview.preview({ body: {} });
  }

  /**
   * Indexes documents for a single host, creates a rule that generates alerts,
   * and returns sanitized host risk scores from the preview API.
   */
  const previewHostRiskScores = async ({
    hostName = 'host-1',
    docCount = 1,
    alerts,
    riskScore = 21,
    maxSignals = 100,
    docOverrides = {},
    previewBody = {},
  }: {
    hostName?: string;
    docCount?: number;
    alerts?: number;
    riskScore?: number;
    maxSignals?: number;
    docOverrides?: Record<string, unknown>;
    previewBody?: object;
  } = {}) => {
    const documentId = uuidv4();
    const doc = buildDocument({ host: { name: hostName }, ...docOverrides }, documentId);
    await indexListOfDocuments(docCount === 1 ? [doc] : Array(docCount).fill(doc));

    await createAndSyncRuleAndAlerts({
      query: `id: ${documentId}`,
      alerts: alerts ?? docCount,
      riskScore,
      maxSignals,
    });

    const body = await riskScorePreview.preview({ body: previewBody });
    return { body, documentId, sanitized: sanitizeScores(body.scores.host!) };
  };

  let indexListOfDocuments: ReturnType<typeof dataGeneratorFactory>['indexListOfDocuments'];

  describe('@ess @serverless Risk Scoring Preview API - V2 (id-based)', () => {
    before(async () => {
      await enableEntityStoreV2(kibanaServer);
    });

    after(async () => {
      await disableEntityStoreV2(kibanaServer);
    });

    context('with auditbeat data', () => {
      before(async () => {
        ({ indexListOfDocuments } = dataGeneratorFactory({
          es,
          index: 'ecs_compliant',
          log,
        }));
        await esArchiver.load(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
        );
      });

      beforeEach(async () => {
        await Promise.all([deleteAllAlerts(supertest, log, es), deleteAllRules(supertest, log)]);
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await Promise.all([
          deleteAllRiskScores(log, es),
          deleteAllAlerts(supertest, log, es),
          deleteAllRules(supertest, log),
        ]);
      });

      context('with a rule generating alerts with risk_score of 21', () => {
        it('calculates risk from a single alert', async () => {
          const { body, sanitized } = await previewHostRiskScores();
          const [score] = sanitized;
          const [rawScore] = body.scores.host!;

          expect(score).to.eql(SINGLE_ALERT_RISK21_HOST1);

          expect(rawScore.category_1_score! + rawScore.category_2_score!).to.be.within(
            score.calculated_score_norm! - 0.000000000000001,
            score.calculated_score_norm! + 0.000000000000001
          );
        });

        it('calculates risk from two alerts, each representing a unique host', async () => {
          const documentId = uuidv4();
          await indexListOfDocuments([
            buildDocument({ host: { name: 'host-1' } }, documentId),
            buildDocument({ host: { name: 'host-2' } }, documentId),
          ]);

          await createAndSyncRuleAndAlerts({
            query: `id: ${documentId}`,
            alerts: 2,
            riskScore: 21,
          });

          const { scores } = await riskScorePreview.preview({ body: {} });

          expect(sortByIdValue(sanitizeScores(scores.host!))).to.eql([
            SINGLE_ALERT_RISK21_HOST1,
            buildExpectedScore({
              euid_fields: { 'host.name': 'host-2' },
              id_value: 'host:host-2',
            }),
          ]);
        });

        it('calculates risk from two alerts, both for the same host', async () => {
          const { sanitized } = await previewHostRiskScores({ docCount: 2 });

          expect(sanitized).to.eql([
            buildExpectedScore({
              calculated_score: 28.4246212025,
              calculated_score_norm: 10.9645969767,
              category_1_count: 2,
              category_1_score: 10.9645969767,
            }),
          ]);
        });

        it('calculates risk from 30 alerts, all for the same host', async () => {
          const { sanitized } = await previewHostRiskScores({ docCount: 30 });

          expect(sanitized).to.eql([
            buildExpectedScore({
              calculated_score: 47.2551350606,
              calculated_score_norm: 18.2283347711,
              category_1_count: 30,
              category_1_score: 18.2283347711,
            }),
          ]);
        });

        it('calculates risk from 31 alerts, 30 from the same host', async () => {
          const documentId = uuidv4();
          const doc = buildDocument({ host: { name: 'host-1' } }, documentId);
          await indexListOfDocuments([
            ...Array(30).fill(doc),
            buildDocument({ host: { name: 'host-2' } }, documentId),
          ]);

          await createAndSyncRuleAndAlerts({
            query: `id: ${documentId}`,
            alerts: 31,
            riskScore: 21,
          });

          const { scores } = await riskScorePreview.preview({ body: {} });

          expect(sanitizeScores(scores.host!)).to.eql([
            buildExpectedScore({
              calculated_score: 47.2551350606,
              calculated_score_norm: 18.2283347711,
              category_1_count: 30,
              category_1_score: 18.2283347711,
            }),
            buildExpectedScore({
              euid_fields: { 'host.name': 'host-2' },
              id_value: 'host:host-2',
            }),
          ]);
        });

        it('calculates risk from 100 alerts, all for the same host', async () => {
          const { sanitized } = await previewHostRiskScores({ docCount: 100 });

          expect(sanitized).to.eql([
            buildExpectedScore({
              calculated_score: 50.6703560728,
              calculated_score_norm: 19.5457321682,
              category_1_count: 100,
              category_1_score: 19.5457321682,
            }),
          ]);
        });

        it('calculates risk from closed alerts for the same host', async () => {
          const { sanitized } = await previewHostRiskScores({
            docCount: 10,
            alerts: 5,
            docOverrides: { kibana: { alert: { workflow_status: 'closed' } } },
          });

          expect(sanitized).to.eql([
            buildExpectedScore({
              calculated_score: 41.9020663603,
              calculated_score_norm: 16.1634263078,
              category_1_count: 10,
              category_1_score: 16.1634263078,
            }),
          ]);
        });

        it('calculates risk from mixed open and closed alerts for the same host', async () => {
          const documentId = uuidv4();
          const closedDoc = buildDocument(
            { host: { name: 'host-1' }, kibana: { alert: { workflow_status: 'closed' } } },
            documentId
          );
          const openDoc = buildDocument(
            { host: { name: 'host-1' }, kibana: { alert: { workflow_status: 'open' } } },
            documentId
          );
          await indexListOfDocuments([...Array(5).fill(closedDoc), ...Array(5).fill(openDoc)]);

          await createAndSyncRuleAndAlerts({
            query: `id: ${documentId}`,
            alerts: 10,
            riskScore: 21,
          });

          const { scores } = await riskScorePreview.preview({ body: {} });

          expect(sanitizeScores(scores.host!)).to.eql([
            buildExpectedScore({
              calculated_score: 41.9020663603,
              calculated_score_norm: 16.1634263078,
              category_1_count: 10,
              category_1_score: 16.1634263078,
            }),
          ]);
        });
      });

      context('with a rule generating alerts with risk_score of 100', () => {
        it('calculates risk from 100 alerts, all for the same host', async () => {
          const { sanitized } = await previewHostRiskScores({
            docCount: 100,
            riskScore: 100,
          });

          expect(sanitized).to.eql([
            buildExpectedScore({
              calculated_level: 'Critical',
              calculated_score: 241.2874098704,
              calculated_score_norm: 93.0749150865,
              category_1_count: 100,
              category_1_score: 93.0749150865,
            }),
          ]);
        });

        it('calculates risk from 1,000 alerts, all for the same host', async () => {
          const documentId = uuidv4();
          const doc = buildDocument({ host: { name: 'host-1' } }, documentId);
          await indexListOfDocuments(
            Array(1000)
              .fill(doc)
              .map((item, index) => ({
                ...item,
                ['@timestamp']: item['@timestamp'] - index,
              }))
          );

          await createAndSyncRuleAndAlerts({
            query: `id: ${documentId}`,
            alerts: 1000,
            riskScore: 100,
            maxSignals: 1000,
          });

          const { scores } = await riskScorePreview.preview({ body: {} });

          expect(sanitizeScores(scores.host!)).to.eql([
            buildExpectedScore({
              calculated_level: 'Critical',
              calculated_score: 254.9145602918,
              calculated_score_norm: 98.3314921662,
              category_1_count: 1000,
              category_1_score: 98.3314921662,
            }),
          ]);
        });

        it('calculates risk from a single service alert', async () => {
          const documentId = uuidv4();
          await indexListOfDocuments([
            buildDocument({ service: { name: 'service-1' } }, documentId),
          ]);

          await createAndSyncRuleAndAlerts({
            query: `id: ${documentId}`,
            alerts: 1,
            riskScore: 21,
          });

          const { scores } = await riskScorePreview.preview({ body: {} });

          expect(sanitizeScores(scores.service!)).to.eql([
            {
              calculated_level: 'Unknown',
              calculated_score: 21,
              calculated_score_norm: 8.100601759,
              category_1_count: 1,
              category_1_score: 8.100601759,
              euid_fields: { 'service.name': 'service-1' },
              id_field: 'entity.id',
              id_value: 'service:service-1',
              modifiers: [],
            },
          ]);
        });
      });

      describe('risk score pagination', () => {
        it('respects the specified after_keys', async () => {
          const aaaId = uuidv4();
          const zzzId = uuidv4();
          const aaaDoc = buildDocument({ 'user.name': 'aaa' }, aaaId);
          const zzzDoc = buildDocument({ 'user.name': 'zzz' }, zzzId);
          await indexListOfDocuments(Array(50).fill(aaaDoc).concat(Array(50).fill(zzzDoc)));

          await createAndSyncRuleAndAlerts({
            query: `id: ${aaaId} OR ${zzzId}`,
            alerts: 100,
            riskScore: 100,
          });

          const { scores } = await riskScorePreview.preview({
            body: {
              after_keys: { user: { user_id: 'user:aaa' } },
            },
          });

          expect(scores.user).to.have.length(1);
          expect(scores.user?.[0].id_value).to.equal('user:zzz');
        });

        it('respects after_keys when entity IDs contain escaped characters', async () => {
          const specialLowerId = uuidv4();
          const specialUpperId = uuidv4();
          const lowerUserName = 'a"user';
          const upperUserName = 'z\\user';

          const lowerDoc = buildDocument({ 'user.name': lowerUserName }, specialLowerId);
          const upperDoc = buildDocument({ 'user.name': upperUserName }, specialUpperId);
          await indexListOfDocuments(Array(50).fill(lowerDoc).concat(Array(50).fill(upperDoc)));

          await createAndSyncRuleAndAlerts({
            query: `id: ${specialLowerId} OR ${specialUpperId}`,
            alerts: 100,
            riskScore: 100,
          });

          const { scores } = await riskScorePreview.preview({
            body: {
              after_keys: { user: { user_id: `user:${lowerUserName}` } },
            },
          });

          expect(scores.user).to.have.length(1);
          expect(scores.user?.[0].id_value).to.equal(`user:${upperUserName}`);
        });
      });

      describe('risk score filtering', () => {
        it('restricts the range of risk inputs used for scoring', async () => {
          const documentId = uuidv4();
          const doc = buildDocument({ host: { name: 'host-1' } }, documentId);
          await indexListOfDocuments(
            Array(100)
              .fill(doc)
              .map((_doc, i) => ({ ...doc, 'event.risk_score': i === 99 ? 1 : 100 }))
          );

          await createAndSyncRuleAndAlerts({
            query: `id: ${documentId}`,
            alerts: 100,
            riskScore: 100,
            riskScoreOverride: 'event.risk_score',
          });

          const { scores } = await riskScorePreview.preview({
            body: {
              filter: {
                bool: {
                  filter: [{ range: { [ALERT_RISK_SCORE]: { lte: 1 } } }],
                },
              },
            },
          });

          expect(scores.host).to.have.length(1);
          expect(scores.host?.[0].inputs).to.have.length(1);
        });
      });

      describe('risk score ordering', () => {
        it('aggregates multiple scores such that the highest-risk scores contribute the majority of the score', async () => {
          const documentId = uuidv4();
          const doc = buildDocument({ host: { name: 'host-1' } }, documentId);
          await indexListOfDocuments(
            Array(100)
              .fill(doc)
              .map((_doc, i) => ({ ...doc, 'event.risk_score': 100 - i }))
          );

          await createAndSyncRuleAndAlerts({
            query: `id: ${documentId}`,
            alerts: 100,
            riskScore: 100,
            riskScoreOverride: 'event.risk_score',
          });

          const { scores } = await riskScorePreview.preview({ body: {} });

          expect(sanitizeScores(scores.host!)).to.eql([
            buildExpectedScore({
              calculated_level: 'High',
              calculated_score: 225.1106801443,
              calculated_score_norm: 86.8348557878,
              category_1_count: 100,
              category_1_score: 86.8348557878,
            }),
          ]);
        });
      });

      context('with global risk weights', () => {
        it('weights host scores differently when host risk weight is configured', async () => {
          const { sanitized } = await previewHostRiskScores({
            docCount: 100,
            riskScore: 100,
            previewBody: { weights: [{ type: 'global_identifier', host: 0.5 }] },
          });

          expect(sanitized).to.eql([
            buildExpectedScore({
              calculated_level: 'Moderate',
              calculated_score: 120.6437049352,
              calculated_score_norm: 46.5374575433,
              category_1_count: 100,
              category_1_score: 93.0749150865,
            }),
          ]);
        });

        it('weights user scores differently if user risk weight is configured', async () => {
          const documentId = uuidv4();
          const doc = buildDocument({ user: { name: 'user-1' } }, documentId);
          await indexListOfDocuments(Array(100).fill(doc));

          await createAndSyncRuleAndAlerts({
            query: `id: ${documentId}`,
            alerts: 100,
            riskScore: 100,
          });

          const { scores } = await riskScorePreview.preview({
            body: { weights: [{ type: 'global_identifier', user: 0.7 }] },
          });

          expect(sanitizeScores(scores.user!)).to.eql([
            {
              calculated_level: 'Moderate',
              calculated_score: 168.9011869093,
              calculated_score_norm: 65.1524405606,
              category_1_count: 100,
              category_1_score: 93.0749150865,
              euid_fields: { 'user.name': 'user-1' },
              id_field: 'entity.id',
              id_value: 'user:user-1',
              modifiers: [],
            },
          ]);
        });

        it('weights entity scores differently when host and user risk weights are configured', async () => {
          const usersId = uuidv4();
          const hostsId = uuidv4();
          const userDocs = buildDocument({ 'user.name': 'user-1' }, usersId);
          const hostDocs = buildDocument({ 'host.name': 'host-1' }, usersId);
          await indexListOfDocuments(Array(50).fill(userDocs).concat(Array(50).fill(hostDocs)));

          await createAndSyncRuleAndAlerts({
            query: `id: ${hostsId} OR ${usersId}`,
            alerts: 100,
            riskScore: 100,
          });

          const { scores } = await riskScorePreview.preview({
            body: { weights: [{ type: 'global_identifier', host: 0.4, user: 0.8 }] },
          });

          expect(sanitizeScores(scores.host!)).to.eql([
            buildExpectedScore({
              calculated_level: 'Low',
              calculated_score: 93.2375911647,
              calculated_score_norm: 35.9657426187,
              category_1_count: 50,
              category_1_score: 89.9143565467,
            }),
          ]);

          expect(sanitizeScores(scores.user!)).to.eql([
            {
              calculated_level: 'High',
              calculated_score: 186.4751823294,
              calculated_score_norm: 71.9314852374,
              category_1_count: 50,
              category_1_score: 89.9143565467,
              euid_fields: { 'user.name': 'user-1' },
              id_field: 'entity.id',
              id_value: 'user:user-1',
              modifiers: [],
            },
          ]);
        });
      });

      // TODO: asset criticality currently does not work with entity store v2 unskip as part of https://github.com/elastic/security-team/issues/15904
      describe.skip('@skipInServerless with asset criticality data', () => {
        const assetCriticalityRoutes = assetCriticalityRouteHelpersFactory(supertest);

        beforeEach(async () => {
          await assetCriticalityRoutes.upsert({
            id_field: 'host.name',
            id_value: 'host-1',
            criticality_level: 'extreme_impact',
          });
        });

        afterEach(async () => {
          await cleanAssetCriticality({ log, es });
        });

        it('calculates and persists risk scores with additional criticality metadata and modifiers', async () => {
          const documentId = uuidv4();
          await indexListOfDocuments([
            buildDocument({ host: { name: 'host-1' } }, documentId),
            buildDocument({ host: { name: 'host-2' } }, documentId),
          ]);
          await waitForAssetCriticalityToBePresent({ es, log });

          const documentBody = await previewHostRiskScoresRaw(documentId, { alerts: 2 });

          expect(sortByIdValue(sanitizeScores(documentBody.scores.host!))).to.eql([
            buildExpectedScore({
              criticality_level: 'extreme_impact',
              criticality_modifier: 2.0,
              calculated_score_norm: 14.9871538681,
              modifiers: [
                {
                  contribution: 6.8865521091,
                  metadata: { criticality_level: 'extreme_impact' },
                  modifier_value: 2,
                  type: 'asset_criticality',
                },
              ],
            }),
            buildExpectedScore({
              euid_fields: { 'host.name': 'host-2' },
              id_value: 'host:host-2',
            }),
          ]);
        });
      });
    });

    it('does not return a 404 when the data_view_id is a non-existent index', async () => {
      const { scores } = await riskScorePreview.preview({
        body: { data_view_id: 'invalid-index' },
      });

      expect(scores).to.eql({
        host: [],
        service: [],
        user: [],
      });
    });
  });
};
