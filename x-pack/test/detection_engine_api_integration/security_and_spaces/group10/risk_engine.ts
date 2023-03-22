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
  const firstTimestamp = new Date().toISOString();
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
    alertsNumber: number = 1
  ) => {
    const rule = getRuleForSignalTesting(['ecs_compliant']);
    const { id } = await createRule(supertest, log, {
      ...rule,
      query: `id: ${documentId}`,
    });
    await waitForRuleSuccessOrStatus(supertest, log, id);
    await waitForSignalsToBePresent(supertest, log, alertsNumber, [id]);

    const { body } = await supertest
      .post(RISK_SCORES_URL)
      .set('kbn-xsrf', 'true')
      .send({})
      .expect(200);

    return body;
  };

  describe.only('Risk engine', () => {
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
        await deleteAllRules(supertest, log);
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllRules(supertest, log);
      });

      it('risk scores calculated for 1 alert', async () => {
        const documentId = uuidv4();
        await indexListOfDocuments([createDocument(host('host-1'), documentId)]);

        const body = await getRiskScoreAfterRuleCreationAndExecution(documentId);

        expect(removeFields(body.scores)).to.eql([
          {
            calculatedLevel: 'Unknown',
            calculatedScore: 1,
            calculatedScoreNorm: 0.38284839203675347,
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

        const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, 2);

        expect(removeFields(body.scores)).to.eql([
          {
            calculatedLevel: 'Unknown',
            calculatedScore: 1,
            calculatedScoreNorm: 0.38284839203675347,
            identifierField: 'host.name',
            identifierValue: 'host-1',
          },
          {
            calculatedLevel: 'Unknown',
            calculatedScore: 1,
            calculatedScoreNorm: 0.38284839203675347,
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

        const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, 2);

        expect(removeFields(body.scores)).to.eql([
          {
            calculatedLevel: 'Unknown',
            calculatedScore: 1.3535533905932737,
            calculatedScoreNorm: 0.5182057391245306,
            identifierField: 'host.name',
            identifierValue: 'host-1',
          },
        ]);
      });

      it('risk scores calculated for 30 alert with different host names', async () => {
        const documentId = uuidv4();
        const doc = createDocument(host('host-1'), documentId);
        await indexListOfDocuments(Array(30).fill(doc));

        const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, 30);

        expect(removeFields(body.scores)).to.eql([
          {
            calculatedLevel: 'Unknown',
            calculatedScore: 2.2502445266929905,
            calculatedScoreNorm: 0.8615024987339168,
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

        const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, 31);

        expect(removeFields(body.scores)).to.eql([
          {
            calculatedLevel: 'Unknown',
            calculatedScore: 2.2502445266929905,
            calculatedScoreNorm: 0.8615024987339168,
            identifierField: 'host.name',
            identifierValue: 'host-1',
          },
          {
            calculatedLevel: 'Unknown',
            calculatedScore: 1,
            calculatedScoreNorm: 0.38284839203675347,
            identifierField: 'host.name',
            identifierValue: 'host-2',
          },
        ]);
      });

      it('risk scores calculated for 100 alert with different host names', async () => {
        const documentId = uuidv4();
        const doc = createDocument(host('host-1'), documentId);
        await indexListOfDocuments(Array(100).fill(doc));

        const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, 100);

        expect(removeFields(body.scores)).to.eql([
          {
            calculatedLevel: 'Unknown',
            calculatedScore: 2.412874098703719,
            calculatedScoreNorm: 0.9237649688758496,
            identifierField: 'host.name',
            identifierValue: 'host-1',
          },
        ]);
      });
    });
  });
};
