/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { RISK_SCORE_PREVIEW_URL } from '@kbn/security-solution-plugin/common/constants';
import { deleteAllAlerts, deleteAllRules } from '@kbn/detections-response-ftr-services';
import type { EntityRiskScoreRecord } from '@kbn/security-solution-plugin/common/api/entity_analytics/common';
import {
  EntityStoreUtils,
  createAndSyncRuleAndAlertsFactory,
  riskScoreMaintainerEntityBuilders,
  riskScoreMaintainerScenarioFactory,
  indexListOfDocumentsFactory,
  setupMaintainerLogsDataStream,
  cleanupMaintainerLogsDataStream,
  cleanUpRiskScoreMaintainer,
  sanitizeScores,
} from '../../utils';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const retry = getService('retry');
  const testLogsIndex = 'logs-testlogs-default';
  const testLogsTemplate = 'logs-testlogs-default-template';

  const createAndSyncRuleAndAlerts = createAndSyncRuleAndAlertsFactory({
    supertest,
    log,
    indices: [testLogsIndex],
  });
  const entityStoreUtils = EntityStoreUtils(getService);
  const indexListOfDocuments = indexListOfDocumentsFactory({ es, log, index: testLogsIndex });
  const maintainerScenario = riskScoreMaintainerScenarioFactory({
    indexListOfDocuments,
    createAndSyncRuleAndAlerts,
    entityStoreUtils,
    retry,
    routes: {
      getMaintainers: async () => {
        throw new Error('Preview API tests do not use maintainer route getMaintainers');
      },
      runMaintainer: async () => {
        throw new Error('Preview API tests do not use maintainer route runMaintainer');
      },
    },
  });
  const setEntityStoreV2Setting = async (enabled: boolean) => {
    await supertest
      .post('/internal/kibana/settings')
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .send({ changes: { 'securitySolution:entityStoreEnableV2': enabled } })
      .expect(200);
  };

  const previewRiskScores = async ({
    body,
  }: {
    body: object;
  }): Promise<{
    after_keys: Record<string, Record<string, string>>;
    scores: { host?: EntityRiskScoreRecord[]; user?: EntityRiskScoreRecord[] };
  }> => {
    const defaultBody = { data_view_id: '.alerts-security.alerts-default' };
    const { body: result } = await supertest
      .post(RISK_SCORE_PREVIEW_URL)
      .set('elastic-api-version', '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .set('kbn-xsrf', 'true')
      .send({ ...defaultBody, ...body })
      .expect(200);
    return result;
  };

  describe('@ess @serverless @serverlessQA V2 Risk Score Preview API', function () {
    this.tags(['esGate']);

    before(async () => {
      await setEntityStoreV2Setting(true);
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
      await setEntityStoreV2Setting(true);
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

    it('returns base scores only and skips resolution preview output', async () => {
      const targetUser = `target-${uuidv4().slice(0, 8)}`;
      const aliasUser = `alias-${uuidv4().slice(0, 8)}`;
      const { documentIds, testEntities } = await maintainerScenario.seedEntities([
        riskScoreMaintainerEntityBuilders.idpUser({ userName: targetUser }),
        riskScoreMaintainerEntityBuilders.idpUser({ userName: aliasUser }),
      ]);
      await entityStoreUtils.installEntityStoreV2({
        entityTypes: ['user'],
        dataViewPattern: testLogsIndex,
      });

      await maintainerScenario.setEntityResolutionTarget({
        testEntity: testEntities[1],
        resolvedToEntityId: testEntities[0].expectedEuid,
      });

      await maintainerScenario.createAlertsForDocumentIds({
        documentIds,
        alerts: 2,
        riskScore: 60,
      });

      const { scores } = await previewRiskScores({ body: { identifier_type: 'user' } });
      expect(scores.user).to.have.length(2);
      scores.user?.forEach((score) => {
        expect(score.score_type).to.be('base');
        expect(score.related_entities).to.be(undefined);
        expect(score.id_field).to.be('entity.id');
        expect(score.id_value.startsWith('user:')).to.be(true);
      });
    });

    it('applies entity-store criticality modifiers in v2 preview mode', async () => {
      const hostName = `host-${uuidv4().slice(0, 8)}`;
      const { documentIds, testEntities } = await maintainerScenario.seedEntities([
        riskScoreMaintainerEntityBuilders.host({ hostName }),
      ]);
      await entityStoreUtils.installEntityStoreV2({
        entityTypes: ['host'],
        dataViewPattern: testLogsIndex,
      });
      await maintainerScenario.setEntityCriticality({
        testEntity: testEntities[0],
        criticalityLevel: 'extreme_impact',
      });

      await maintainerScenario.createAlertsForDocumentIds({
        documentIds,
        alerts: 1,
        riskScore: 21,
      });

      const { scores } = await previewRiskScores({ body: { identifier_type: 'host' } });
      const [score] = sanitizeScores(scores.host ?? []);

      expect(score.id_field).to.be('entity.id');
      expect(score.id_value).to.be(`host:${hostName}`);
      expect(score.modifiers).to.have.length(1);
      expect(score.modifiers?.[0].type).to.be('asset_criticality');
    });

    it('falls back to legacy preview path when entityStoreEnableV2 is disabled', async () => {
      const targetUser = `target-${uuidv4().slice(0, 8)}`;
      const aliasUser = `alias-${uuidv4().slice(0, 8)}`;
      const { documentIds, testEntities } = await maintainerScenario.seedEntities([
        riskScoreMaintainerEntityBuilders.idpUser({ userName: targetUser }),
        riskScoreMaintainerEntityBuilders.idpUser({ userName: aliasUser }),
      ]);
      await entityStoreUtils.installEntityStoreV2({
        entityTypes: ['user'],
        dataViewPattern: testLogsIndex,
      });
      await maintainerScenario.setEntityResolutionTarget({
        testEntity: testEntities[1],
        resolvedToEntityId: testEntities[0].expectedEuid,
      });
      await maintainerScenario.createAlertsForDocumentIds({
        documentIds,
        alerts: 2,
        riskScore: 60,
      });

      await setEntityStoreV2Setting(false);

      const { scores } = await previewRiskScores({ body: { identifier_type: 'user' } });
      // Legacy preview records do not include the v2-only score_type field.
      expect(scores.user?.some((score) => score.score_type === undefined)).to.be(true);
    });
  });
};
