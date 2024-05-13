/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { dataGeneratorFactory } from '../../../../detections_response/utils';
import { deleteAllRules, deleteAllAlerts } from '../../../../../../common/utils/security_solution';
import {
  buildDocument,
  createAndSyncRuleAndAlertsFactory,
  readRiskScores,
  waitForRiskScoresToBePresent,
  normalizeScores,
  riskEngineRouteHelpersFactory,
  cleanRiskEngine,
  deleteRiskScoreIndices,
} from '../../../utils';

import type { FtrProviderContextWithSpaces } from '../../../../../ftr_provider_context_with_spaces';

export default ({ getService }: FtrProviderContextWithSpaces): void => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');

  describe('@ess Risk Scoring Task in non-default space', () => {
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
        await cleanRiskEngine({ kibanaServer, es, log });
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      afterEach(async () => {
        await cleanRiskEngine({ kibanaServer, es, log });
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });
      describe('with alerts in a non-default space', () => {
        let namespace: string;
        let index: string[];
        let documentId: string;
        let createAndSyncRuleAndAlertsForOtherSpace: ReturnType<
          typeof createAndSyncRuleAndAlertsFactory
        >;

        beforeEach(async () => {
          documentId = uuidv4();
          namespace = uuidv4();
          index = [`risk-score.risk-score-${namespace}`];

          createAndSyncRuleAndAlertsForOtherSpace = createAndSyncRuleAndAlertsFactory({
            supertest,
            log,
            namespace,
          });
          const riskEngineRoutesForNamespace = riskEngineRouteHelpersFactory(supertest, namespace);

          const spaces = getService('spaces');
          await spaces.create({
            id: namespace,
            name: namespace,
            disabledFeatures: [],
          });

          const baseEvent = buildDocument({ host: { name: 'host-1' } }, documentId);
          await indexListOfDocuments(
            Array(10)
              .fill(baseEvent)
              .map((_baseEvent, _index) => ({
                ..._baseEvent,
                'host.name': `host-${_index}`,
              }))
          );

          await createAndSyncRuleAndAlertsForOtherSpace({
            query: `id: ${documentId}`,
            alerts: 10,
            riskScore: 40,
          });

          await riskEngineRoutesForNamespace.init();
        });

        afterEach(async () => {
          await getService('spaces').delete(namespace);
          await deleteRiskScoreIndices({ log, es, namespace });
        });

        it('calculates and persists risk scores for alert documents', async () => {
          await waitForRiskScoresToBePresent({
            es,
            log,
            scoreCount: 10,
            index,
          });

          const scores = await readRiskScores(es, index);
          expect(normalizeScores(scores).map(({ id_value: idValue }) => idValue)).to.eql(
            Array(10)
              .fill(0)
              .map((_, _index) => `host-${_index}`)
          );
        });
      });
    });
  });
};
