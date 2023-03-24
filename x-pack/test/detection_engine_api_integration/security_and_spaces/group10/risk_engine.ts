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
  deleteSignalsIndex,
  deleteAllRules,
  createRule,
  waitForSignalsToBePresent,
  waitForRuleSuccessOrStatus,
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

const createDocument = (body: any, id?: string) => {
  const documentId = uuidv4();
  const firstTimestamp = Date.now();
  const doc = {
    id: id || documentId,
    '@timestamp': firstTimestamp,
    agent: {
      name: 'agent-12345',
    },
    ...body,
  };
  return doc;
};

const host = (name: string) => ({ host: { name } });

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  const getRiskScoreAfterRuleCreationAndExecution = async (
    documentId: string,
    {
      alerts = 1,
      riskScore = 21,
      maxSignals = 100,
    }: { alerts?: number; riskScore?: number; maxSignals?: number } = {}
  ) => {
    const rule = getRuleForSignalTesting(['ecs_compliant']);
    const { id } = await createRule(supertest, log, {
      ...rule,
      risk_score: riskScore,
      query: `id: ${documentId}`,
      max_signals: maxSignals,
    });
    await waitForRuleSuccessOrStatus(supertest, log, id);
    await waitForSignalsToBePresent(supertest, log, alerts, [id]);

    const { body } = await supertest
      .post(RISK_SCORES_URL)
      .set('kbn-xsrf', 'true')
      .send({})
      .expect(200);

    return body;
  };

  describe('Risk engine', () => {
    describe('tests with auditbeat data', () => {
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
        await deleteSignalsIndex(supertest, log);

        await deleteAllRules(supertest, log);
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllRules(supertest, log);
      });

      describe('rule risk score 21', () => {
        it('risk scores calculated for 1 alert', async () => {
          const documentId = uuidv4();
          await indexListOfDocuments([createDocument(host('host-1'), documentId)]);

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId);

          expect(removeFields(body.scores)).to.eql([
            {
              calculatedLevel: 'Unknown',
              calculatedScore: 21,
              calculatedScoreNorm: 8.039816232771823,
              identifierField: 'host.name',
              identifierValue: 'host-1',
            },
          ]);
        });

        it('risk scores calculated for 2 alert with different host names', async () => {
          const documentId = uuidv4();
          await indexListOfDocuments([
            createDocument(host('host-1'), documentId),
            createDocument(host('host-2'), documentId),
          ]);

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, {
            alerts: 2,
          });

          expect(removeFields(body.scores)).to.eql([
            {
              calculatedLevel: 'Unknown',
              calculatedScore: 21,
              calculatedScoreNorm: 8.039816232771823,
              identifierField: 'host.name',
              identifierValue: 'host-1',
            },
            {
              calculatedLevel: 'Unknown',
              calculatedScore: 21,
              calculatedScoreNorm: 8.039816232771823,
              identifierField: 'host.name',
              identifierValue: 'host-2',
            },
          ]);
        });
        it('risk scores calculated for 2 alert with different host names', async () => {
          const documentId = uuidv4();
          await indexListOfDocuments([
            createDocument(host('host-1'), documentId),
            createDocument(host('host-1'), documentId),
          ]);

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, {
            alerts: 2,
          });

          expect(removeFields(body.scores)).to.eql([
            {
              calculatedLevel: 'Unknown',
              calculatedScore: 28.42462120245875,
              calculatedScoreNorm: 10.88232052161514,
              identifierField: 'host.name',
              identifierValue: 'host-1',
            },
          ]);
        });

        it('risk scores calculated for 30 alert with different host names', async () => {
          const documentId = uuidv4();
          const doc = createDocument(host('host-1'), documentId);
          await indexListOfDocuments(Array(30).fill(doc));

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, {
            alerts: 30,
          });

          expect(removeFields(body.scores)).to.eql([
            {
              calculatedLevel: 'Unknown',
              calculatedScore: 47.25513506055279,
              calculatedScoreNorm: 18.091552473412246,
              identifierField: 'host.name',
              identifierValue: 'host-1',
            },
          ]);
        });

        it('risk scores calculated for 30 alert with same host names and 1 different', async () => {
          const documentId = uuidv4();
          const doc = createDocument(host('host-1'), documentId);
          await indexListOfDocuments([
            ...Array(30).fill(doc),
            createDocument(host('host-2'), documentId),
          ]);

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, {
            alerts: 31,
          });

          expect(removeFields(body.scores)).to.eql([
            {
              calculatedLevel: 'Unknown',
              calculatedScore: 47.25513506055279,
              calculatedScoreNorm: 18.091552473412246,
              identifierField: 'host.name',
              identifierValue: 'host-1',
            },
            {
              calculatedLevel: 'Unknown',
              calculatedScore: 21,
              calculatedScoreNorm: 8.039816232771823,
              identifierField: 'host.name',
              identifierValue: 'host-2',
            },
          ]);
        });

        it('risk scores calculated for 100 alert with the same host names', async () => {
          const documentId = uuidv4();
          const doc = createDocument(host('host-1'), documentId);
          await indexListOfDocuments(Array(100).fill(doc));

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, {
            alerts: 100,
          });

          expect(removeFields(body.scores)).to.eql([
            {
              calculatedLevel: 'Unknown',
              calculatedScore: 50.67035607277805,
              calculatedScoreNorm: 19.399064346392823,
              identifierField: 'host.name',
              identifierValue: 'host-1',
            },
          ]);
        });
      });

      describe('rule risk score 100', () => {
        it('risk scores calculated for 100 alert', async () => {
          const documentId = uuidv4();
          const doc = createDocument(host('host-1'), documentId);
          await indexListOfDocuments(Array(100).fill(doc));

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, {
            riskScore: 100,
            alerts: 100,
          });

          expect(removeFields(body.scores)).to.eql([
            {
              calculatedLevel: 'Critical',
              calculatedScore: 241.2874098703716,
              calculatedScoreNorm: 92.37649688758484,
              identifierField: 'host.name',
              identifierValue: 'host-1',
            },
          ]);
        });

        it('risk scores calculated for 10.000 alert', async () => {
          const documentId = uuidv4();
          const doc = createDocument(host('host-1'), documentId);
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
              calculatedLevel: 'Critical',
              calculatedScore: 259.237584867298,
              calculatedScoreNorm: 99.24869252193645,
              identifierField: 'host.name',
              identifierValue: 'host-1',
            },
          ]);
        });
      });
    });
  });
};
