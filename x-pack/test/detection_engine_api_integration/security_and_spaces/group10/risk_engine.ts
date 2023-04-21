/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { RISK_SCORES_URL } from '@kbn/security-solution-plugin/common/constants';
import { v4 as uuidv4 } from 'uuid';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllRules,
  deleteAllSignals,
  createRule,
  waitForSignalsToBePresent,
  waitForRuleSuccess,
  getRuleForSignalTesting,
} from '../../utils';
import { dataGeneratorFactory } from '../../utils/data_generator';

const removeFields = (scores: any[]) =>
  scores.map((item: any) => {
    delete item['@timestamp'];
    delete item.riskiestInputs;
    delete item.notes;
    return item;
  });

const buildDocument = (body: any, id?: string) => {
  const firstTimestamp = Date.now();
  const doc = {
    id: id || uuidv4(),
    '@timestamp': firstTimestamp,
    agent: {
      name: 'agent-12345',
    },
    ...body,
  };
  return doc;
};

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  const createAndSyncRuleAndAlerts = async ({
    alerts = 1,
    riskScore = 21,
    maxSignals = 100,
    query,
    riskScoreOverride,
  }: {
    alerts?: number;
    riskScore?: number;
    maxSignals?: number;
    query: string;
    riskScoreOverride?: string;
  }): Promise<void> => {
    const rule = getRuleForSignalTesting(['ecs_compliant']);
    const { id } = await createRule(supertest, log, {
      ...rule,
      risk_score: riskScore,
      query,
      max_signals: maxSignals,
      ...(riskScoreOverride
        ? {
            risk_score_mapping: [
              { field: riskScoreOverride, operator: 'equals', value: '', risk_score: undefined },
            ],
          }
        : {}),
    });
    await waitForRuleSuccess({ supertest, log, id });
    await waitForSignalsToBePresent(supertest, log, alerts, [id]);
  };

  const getRiskScores = async ({ body }: { body: object }): Promise<{ scores: unknown[] }> => {
    const { body: result } = await supertest
      .post(RISK_SCORES_URL)
      .set('kbn-xsrf', 'true')
      .send(body)
      .expect(200);
    return result;
  };

  const getRiskScoreAfterRuleCreationAndExecution = async (
    documentId: string,
    {
      alerts = 1,
      riskScore = 21,
      maxSignals = 100,
    }: { alerts?: number; riskScore?: number; maxSignals?: number } = {}
  ) => {
    await createAndSyncRuleAndAlerts({ query: `id: ${documentId}`, alerts, riskScore, maxSignals });

    return await getRiskScores({ body: { debug: true } });
  };

  describe('Risk engine', () => {
    context('with auditbeat data', () => {
      const { indexListOfDocuments } = dataGeneratorFactory({
        es,
        index: 'ecs_compliant',
        log,
      });

      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/ecs_compliant'
        );
      });

      beforeEach(async () => {
        await deleteAllSignals(es);

        await deleteAllRules(supertest, log);
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllSignals(es);
        await deleteAllRules(supertest, log);
      });

      context('with a rule generating alerts with risk_score of 21', () => {
        it('calculates risk from a single alert', async () => {
          const documentId = uuidv4();
          await indexListOfDocuments([buildDocument({ host: { name: 'host-1' } }, documentId)]);

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId);

          expect(removeFields(body.scores)).to.eql([
            {
              level: 'Unknown',
              totalScore: 21,
              totalScoreNormalized: 8.039816232771823,
              identifierField: 'host.name',
              identifierValue: 'host-1',
            },
          ]);
        });

        it('calculates risk from two alerts, each representing a unique host', async () => {
          const documentId = uuidv4();
          await indexListOfDocuments([
            buildDocument({ host: { name: 'host-1' } }, documentId),
            buildDocument({ host: { name: 'host-2' } }, documentId),
          ]);

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, {
            alerts: 2,
          });

          expect(removeFields(body.scores)).to.eql([
            {
              level: 'Unknown',
              totalScore: 21,
              totalScoreNormalized: 8.039816232771823,
              identifierField: 'host.name',
              identifierValue: 'host-1',
            },
            {
              level: 'Unknown',
              totalScore: 21,
              totalScoreNormalized: 8.039816232771823,
              identifierField: 'host.name',
              identifierValue: 'host-2',
            },
          ]);
        });

        it('calculates risk from two alerts, both for the same host', async () => {
          const documentId = uuidv4();
          await indexListOfDocuments([
            buildDocument({ host: { name: 'host-1' } }, documentId),
            buildDocument({ host: { name: 'host-1' } }, documentId),
          ]);

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, {
            alerts: 2,
          });

          expect(removeFields(body.scores)).to.eql([
            {
              level: 'Unknown',
              totalScore: 28.42462120245875,
              totalScoreNormalized: 10.88232052161514,
              identifierField: 'host.name',
              identifierValue: 'host-1',
            },
          ]);
        });

        it('calculates risk from 30 alerts, all for the same host', async () => {
          const documentId = uuidv4();
          const doc = buildDocument({ host: { name: 'host-1' } }, documentId);
          await indexListOfDocuments(Array(30).fill(doc));

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, {
            alerts: 30,
          });

          expect(removeFields(body.scores)).to.eql([
            {
              level: 'Unknown',
              totalScore: 47.25513506055279,
              totalScoreNormalized: 18.091552473412246,
              identifierField: 'host.name',
              identifierValue: 'host-1',
            },
          ]);
        });

        it('calculates risk from 31 alerts, 30 from the same host', async () => {
          const documentId = uuidv4();
          const doc = buildDocument({ host: { name: 'host-1' } }, documentId);
          await indexListOfDocuments([
            ...Array(30).fill(doc),
            buildDocument({ host: { name: 'host-2' } }, documentId),
          ]);

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, {
            alerts: 31,
          });

          expect(removeFields(body.scores)).to.eql([
            {
              level: 'Unknown',
              totalScore: 47.25513506055279,
              totalScoreNormalized: 18.091552473412246,
              identifierField: 'host.name',
              identifierValue: 'host-1',
            },
            {
              level: 'Unknown',
              totalScore: 21,
              totalScoreNormalized: 8.039816232771823,
              identifierField: 'host.name',
              identifierValue: 'host-2',
            },
          ]);
        });

        it('calculates risk from 100 alerts, all for the same host', async () => {
          const documentId = uuidv4();
          const doc = buildDocument({ host: { name: 'host-1' } }, documentId);
          await indexListOfDocuments(Array(100).fill(doc));

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, {
            alerts: 100,
          });

          expect(removeFields(body.scores)).to.eql([
            {
              level: 'Unknown',
              totalScore: 50.67035607277805,
              totalScoreNormalized: 19.399064346392823,
              identifierField: 'host.name',
              identifierValue: 'host-1',
            },
          ]);
        });
      });

      context('with a rule generating alerts with risk_score of 100', () => {
        it('calculates risk from 100 alerts, all for the same host', async () => {
          const documentId = uuidv4();
          const doc = buildDocument({ host: { name: 'host-1' } }, documentId);
          await indexListOfDocuments(Array(100).fill(doc));

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, {
            riskScore: 100,
            alerts: 100,
          });

          expect(removeFields(body.scores)).to.eql([
            {
              level: 'Critical',
              totalScore: 241.2874098703716,
              totalScoreNormalized: 92.37649688758484,
              identifierField: 'host.name',
              identifierValue: 'host-1',
            },
          ]);
        });

        it('calculates risk from 10,000 alerts, all for the same host', async () => {
          const documentId = uuidv4();
          const doc = buildDocument({ host: { name: 'host-1' } }, documentId);
          await indexListOfDocuments(
            Array(10000)
              .fill(doc)
              .map((item, index) => ({
                ...item,
                ['@timestamp']: item['@timestamp'] - index,
              }))
          );

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, {
            riskScore: 100,
            alerts: 10000,
            maxSignals: 10000,
          });

          expect(removeFields(body.scores)).to.eql([
            {
              level: 'Critical',
              totalScore: 259.237584867298,
              totalScoreNormalized: 99.24869252193645,
              identifierField: 'host.name',
              identifierValue: 'host-1',
            },
          ]);
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
          const { scores } = await getRiskScores({ body: {} });

          expect(removeFields(scores)).to.eql([
            {
              level: 'High',
              totalScore: 225.1106801442913,
              totalScoreNormalized: 86.18326192354185,
              identifierField: 'host.name',
              identifierValue: 'host-1',
            },
          ]);
        });
      });

      context('with global risk weights', () => {
        it('weights host scores differently when host risk weight is configured', async () => {
          const documentId = uuidv4();
          const doc = buildDocument({ host: { name: 'host-1' } }, documentId);
          await indexListOfDocuments(Array(100).fill(doc));

          await createAndSyncRuleAndAlerts({
            query: `id: ${documentId}`,
            alerts: 100,
            riskScore: 100,
          });
          const { scores } = await getRiskScores({
            body: { weights: [{ type: 'global_identifier', host: 0.5 }] },
          });

          expect(removeFields(scores)).to.eql([
            {
              level: 'Moderate',
              totalScore: 120.6437049351858,
              totalScoreNormalized: 46.18824844379242,
              identifierField: 'host.name',
              identifierValue: 'host-1',
            },
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
          const { scores } = await getRiskScores({
            body: { weights: [{ type: 'global_identifier', user: 0.7 }] },
          });

          expect(removeFields(scores)).to.eql([
            {
              level: 'Moderate',
              totalScore: 168.9011869092601,
              totalScoreNormalized: 64.66354782130938,
              identifierField: 'user.name',
              identifierValue: 'user-1',
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
          const { scores } = await getRiskScores({
            body: { weights: [{ type: 'global_identifier', host: 0.4, user: 0.8 }] },
          });

          expect(removeFields(scores)).to.eql([
            {
              level: 'High',
              totalScore: 186.47518232942502,
              totalScoreNormalized: 71.39172370958079,
              identifierField: 'user.name',
              identifierValue: 'user-1',
            },
            {
              level: 'Low',
              totalScore: 93.23759116471251,
              totalScoreNormalized: 35.695861854790394,
              identifierField: 'host.name',
              identifierValue: 'host-1',
            },
          ]);
        });
      });

      context.skip('with category weights', () => {
        it('weights risk inputs from different categories according to the category weight', async () => {
          const documentId = uuidv4();
          const signal = buildDocument(
            { 'event.kind': 'signal', 'user.name': 'user-1' },
            documentId
          );
          const finding = buildDocument(
            { 'event.kind': 'finding', 'user.name': 'user-1' },
            documentId
          );
          await indexListOfDocuments(Array(50).fill(signal).concat(Array(50).fill(finding)));

          await createAndSyncRuleAndAlerts({
            query: `id: ${documentId}`,
            alerts: 100,
            riskScore: 100,
          });
          const { scores } = await getRiskScores({
            body: {
              weights: [
                { type: 'risk_category', value: 'alerts', host: 0.4, user: 0.8 },
                { type: 'risk_category', value: 'findings', host: 0.8, user: 0.3 },
              ],
            },
          });

          expect(removeFields(scores)).to.eql([
            {
              level: 'High',
              totalScore: 186.47518232942502,
              totalScoreNormalized: 71.39172370958079,
              identifierField: 'user.name',
              identifierValue: 'user-1',
            },
            {
              level: 'Low',
              totalScore: 93.23759116471251,
              totalScoreNormalized: 35.695861854790394,
              identifierField: 'user.name',
              identifierValue: 'host-1',
            },
          ]);
        });
      });
    });
  });
};
