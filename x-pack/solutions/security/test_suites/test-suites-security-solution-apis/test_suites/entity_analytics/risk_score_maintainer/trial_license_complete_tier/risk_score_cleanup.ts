/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { ENTITY_LATEST, getEntitiesAlias } from '@kbn/entity-store/common';
import { hashEuid } from '@kbn/entity-store/common/domain/euid';
import { getLookupIndexName } from '@kbn/security-solution-plugin/server/lib/entity_analytics/risk_score/maintainer/lookup/lookup_index';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import {
  EntityStoreUtils,
  cleanUpRiskScoreMaintainer,
  entityMaintainerRouteHelpersFactory,
  setupMaintainerLogsDataStream,
  cleanupMaintainerLogsDataStream,
} from '../../utils';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const entityStoreUtils = EntityStoreUtils(getService);
  const maintainerRoutes = entityMaintainerRouteHelpersFactory(supertest);

  const testLogsIndex = 'logs-testlogs-default';
  const testLogsTemplate = 'logs-testlogs-default-template';
  const latestAlias = getEntitiesAlias(ENTITY_LATEST, 'default');
  const riskScoreDataStream = 'risk-score.risk-score-default';
  const lookupIndex = getLookupIndexName('default');

  describe('@ess @serverless @skipInServerlessMKI Risk score cleanup', () => {
    before(async () => {
      await setupMaintainerLogsDataStream({
        es,
        index: testLogsIndex,
        template: testLogsTemplate,
      });
    });

    after(async () => {
      await entityStoreUtils.cleanEngines();
      await cleanUpRiskScoreMaintainer({ es, log, supertest });
      await cleanupMaintainerLogsDataStream({
        es,
        index: testLogsIndex,
        template: testLogsTemplate,
      });
    });

    it('removes risk resources and clears risk fields on entity documents', async () => {
      const hostName = `cleanup-${uuidv4().slice(0, 8)}`;
      const entityId = `host:${hostName}`;

      await entityStoreUtils.installEntityStoreV2({
        entityTypes: ['host'],
        dataViewPattern: testLogsIndex,
        waitForEntities: false,
      });
      await maintainerRoutes.runMaintainerSync('risk-score');

      await es.index({
        index: latestAlias,
        id: hashEuid(entityId),
        refresh: true,
        document: {
          '@timestamp': new Date().toISOString(),
          entity: {
            id: entityId,
            EngineMetadata: { Type: 'host' },
            risk: {
              calculated_level: 'High',
              calculated_score: 80,
              calculated_score_norm: 80,
            },
            relationships: {
              resolution: {
                risk: {
                  calculated_level: 'Low',
                  calculated_score: 10,
                  calculated_score_norm: 10,
                },
              },
            },
          },
          host: { name: hostName },
        },
      });

      await cleanUpRiskScoreMaintainer({ es, log, supertest });

      expect(await es.indices.exists({ index: riskScoreDataStream })).to.eql(false);
      expect(await es.indices.exists({ index: lookupIndex })).to.eql(false);

      const tasks = await es.search({
        index: '.kibana_task_manager*',
        ignore_unavailable: true,
        query: { ids: { values: ['task:risk-score:default'] } },
      });
      expect(tasks.hits.hits).to.have.length(0);

      const entity = await es.get({ index: latestAlias, id: hashEuid(entityId) });
      const source = entity._source as {
        entity?: {
          risk?: unknown;
          relationships?: { resolution?: { risk?: unknown } };
        };
      };
      expect(source.entity?.risk).to.be(undefined);
      expect(source.entity?.relationships?.resolution?.risk).to.be(undefined);
    });
  });
};
