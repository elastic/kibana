/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { deleteAllAlerts, deleteAllRules } from '@kbn/detections-response-ftr-services';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/common';
import {
  createAndSyncRuleAndAlertsFactory,
  readRiskScores,
  normalizeScores,
  buildDocument,
  EntityStoreUtils,
  entityMaintainerRouteHelpersFactory,
  cleanUpRiskScoreMaintainer,
  indexListOfDocumentsFactory,
  setupMaintainerLogsDataStream,
  cleanupMaintainerLogsDataStream,
} from '../../utils';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const testLogsIndex = 'logs-testlogs-createmissing-default';
  const testLogsTemplate = 'logs-testlogs-createmissing-default-template';

  const createAndSyncRuleAndAlerts = createAndSyncRuleAndAlertsFactory({
    supertest,
    log,
    indices: [testLogsIndex],
  });
  const entityStoreUtils = EntityStoreUtils(getService);
  const maintainerRoutes = entityMaintainerRouteHelpersFactory(supertest);
  const indexListOfDocuments = indexListOfDocumentsFactory({ es, log, index: testLogsIndex });

  describe('@ess @serverless @serverlessQA Risk Score Maintainer create-if-missing entities', function () {
    this.tags(['esGate']);

    before(async () => {
      await setupMaintainerLogsDataStream({
        es,
        index: testLogsIndex,
        template: testLogsTemplate,
      });
    });

    after(async () => {
      await cleanupMaintainerLogsDataStream({
        es,
        index: testLogsIndex,
        template: testLogsTemplate,
      });
    });

    beforeEach(async () => {
      await es.deleteByQuery({
        index: testLogsIndex,
        query: { match_all: {} },
        refresh: true,
        ignore_unavailable: true,
      });
      await entityStoreUtils.cleanEngines();
      await cleanUpRiskScoreMaintainer({ log, es });
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    afterEach(async () => {
      await entityStoreUtils.cleanEngines();
      await cleanUpRiskScoreMaintainer({ log, es });
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    it('creates the missing host entity from a representative alert and writes its score', async () => {
      const documentId = uuidv4();
      // `host.id` is required by the creation policy (`getEntityCreationCandidate`), and takes
      // priority over `host.name` in the identity ranking, so the EUID is derived from it.
      const hostId = `host-id-${uuidv4()}`;
      const hostName = `host-name-${uuidv4()}`;
      const expectedEuid = `host:${hostId}`;

      await indexListOfDocuments([
        buildDocument({ host: { id: hostId, name: hostName } }, documentId),
      ]);
      await createAndSyncRuleAndAlerts({
        query: `id: ${documentId}`,
        alerts: 1,
        riskScore: 42,
      });

      // Install only user extraction so the host stays absent; the shared index still accepts
      // host creation.
      await entityStoreUtils.installEntityStoreV2({
        entityTypes: ['user'],
        dataViewPattern: testLogsIndex,
        waitForEntities: false,
      });

      await maintainerRoutes.runMaintainerSync('risk-score');

      const entityResponse = await es.search({
        index: getEntitiesAlias(ENTITY_LATEST, 'default'),
        size: 1,
        query: { term: { 'entity.id': expectedEuid } },
      });
      const entityDoc = entityResponse.hits.hits[0]?._source as
        | {
            entity?: {
              id?: string;
              created_by?: string;
              type?: string;
              lifecycle?: { first_seen?: string; last_seen?: string };
              risk?: Record<string, unknown>;
            };
          }
        | undefined;

      const scores = normalizeScores(await readRiskScores(es));
      const score = scores.find((s) => s.id_value === expectedEuid);

      expect(entityDoc).to.not.be(undefined);
      expect(entityDoc?.entity?.id).to.eql(expectedEuid);
      expect(entityDoc?.entity?.created_by).to.eql('risk_score_maintainer');
      expect(entityDoc?.entity?.type).to.eql('Host');
      expect(entityDoc?.entity?.lifecycle?.first_seen).to.be.a('string');
      expect(entityDoc?.entity?.risk).to.be.an('object');
      expect(entityDoc?.entity?.risk?.calculated_score_norm).to.be.a('number');

      expect(score).to.not.be(undefined);
      expect(score?.id_value).to.eql(expectedEuid);
    });
  });
};
