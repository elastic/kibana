/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { dataGeneratorFactory } from '../../../../detections_response/utils';
import {
  deleteAllRules,
  deleteAllAlerts,
} from '../../../../../config/services/detections_response';
import {
  buildDocument,
  createAndSyncRuleAndAlertsFactory,
  readRiskScores,
  waitForRiskScoresToBePresent,
  normalizeScores,
  riskEngineRouteHelpersFactory,
} from '../../../utils';
import type { FtrProviderContextWithSpaces } from '../../../../../ftr_provider_context_with_spaces';

export default ({ getService }: FtrProviderContextWithSpaces): void => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');

  const doTests = () => {
    describe('with alerts in a non-default space', () => {
      const { indexListOfDocuments } = dataGeneratorFactory({
        es,
        index: 'ecs_compliant',
        log,
      });
      const namespace = uuidv4();
      const documentId = uuidv4();
      const index = [`risk-score.risk-score-${namespace}`];
      const createAndSyncRuleAndAlertsForOtherSpace = createAndSyncRuleAndAlertsFactory({
        supertest,
        log,
        namespace,
      });
      const riskEngineRoutesForNamespace = riskEngineRouteHelpersFactory(supertest, namespace);

      before(async () => {
        await riskEngineRoutesForNamespace.cleanUp();
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
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);

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
        await riskEngineRoutesForNamespace.cleanUp();
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
        await getService('spaces').delete(namespace);
      });

      it('calculates and persists risk scores for alert documents', async () => {
        await waitForRiskScoresToBePresent({
          es,
          log,
          scoreCount: 10,
          index,
        });

        const scores = await readRiskScores(es, index);
        expect(
          normalizeScores(scores)
            .map(({ id_value: idValue }) => idValue)
            .sort()
        ).to.eql(
          Array(10)
            .fill(0)
            .map((_, _index) => `host-${_index}`)
            .sort()
        );
      });
    });
  };

  describe('@ess Risk Scoring Task in non-default space', () => {
    describe('ESQL', () => {
      doTests();
    });

    describe('Scripted metric', () => {
      before(async () => {
        await kibanaServer.uiSettings.update({
          ['securitySolution:enableEsqlRiskScoring']: false,
        });
      });

      after(async () => {
        await kibanaServer.uiSettings.update({
          ['securitySolution:enableEsqlRiskScoring']: true,
        });
      });
      doTests();
    });
  });
};
