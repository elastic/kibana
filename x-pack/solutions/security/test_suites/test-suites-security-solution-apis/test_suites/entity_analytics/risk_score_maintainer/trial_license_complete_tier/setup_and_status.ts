/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { riskEngineConfigurationTypeName } from '@kbn/security-solution-plugin/server/lib/entity_analytics/risk_engine/saved_object';
import {
  getDefaultRiskEngineConfiguration,
  getRiskEngineConfigurationSavedObjectId,
} from '@kbn/security-solution-plugin/server/lib/entity_analytics/risk_engine/utils/saved_object_configuration';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import {
  EntityStoreUtils,
  riskEngineRouteHelpersFactory,
  entityMaintainerRouteHelpersFactory,
  cleanUpRiskScoreMaintainer,
} from '../../utils';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const spaces = getService('spaces');
  const es = getService('es');
  const log = getService('log');
  const customSpaceName = 'ea-customspace-it';
  const riskEngineRoutes = riskEngineRouteHelpersFactory(supertest);
  const maintainerRoutes = entityMaintainerRouteHelpersFactory(supertest);
  const maintainerRoutesCustomSpace = entityMaintainerRouteHelpersFactory(
    supertest,
    customSpaceName
  );
  const kibanaServer = getService('kibanaServer');

  const entityStoreUtils = EntityStoreUtils(getService);
  const entityStoreUtilsCustomSpace = EntityStoreUtils(getService, customSpaceName);

  const listRiskEngineConfigs = async (spaceId?: string) => {
    const soResponse = await kibanaServer.savedObjects.find({
      type: riskEngineConfigurationTypeName,
      ...(spaceId ? { space: spaceId } : {}),
    });
    return soResponse.saved_objects;
  };

  const deleteRiskEngineConfigs = async (spaceId?: string) => {
    const savedObjects = await listRiskEngineConfigs(spaceId);
    for (const savedObject of savedObjects) {
      await kibanaServer.savedObjects.delete({
        type: riskEngineConfigurationTypeName,
        id: savedObject.id,
        ...(spaceId ? { space: spaceId } : {}),
      });
    }
  };

  const createLegacyRiskEngineConfig = async ({
    id,
    spaceId,
    attributes,
  }: {
    id: string;
    spaceId?: string;
    attributes?: Record<string, unknown>;
  }) => {
    await kibanaServer.savedObjects.create({
      id,
      type: riskEngineConfigurationTypeName,
      overwrite: false,
      ...(spaceId ? { space: spaceId } : {}),
      attributes: {
        ...getDefaultRiskEngineConfiguration({ namespace: spaceId ?? 'default' }),
        ...attributes,
      },
    });
  };

  const enableEntityStoreV2Setting = async (namespace: string = 'default') => {
    let settingsUrl = '/internal/kibana/settings';
    if (namespace !== 'default') {
      settingsUrl = `/s/${namespace}${settingsUrl}`;
    }

    await supertest
      .post(settingsUrl)
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .send({ changes: { 'securitySolution:entityStoreEnableV2': true } })
      .expect(200);
  };
  const checkAssets = async (
    spaceId: string,
    maintainerRoutesHelper: ReturnType<typeof entityMaintainerRouteHelpersFactory>
  ) => {
    const savedObjects = await listRiskEngineConfigs(spaceId === 'default' ? undefined : spaceId);
    expect(savedObjects.length).to.eql(1);
    expect(savedObjects[0].id).to.eql(
      getRiskEngineConfigurationSavedObjectId({ namespace: spaceId })
    );

    const componentTemplateName = `.risk-score-mappings-${spaceId}`;
    const indexTemplateName = `.risk-score.risk-score-${spaceId}-index-template`;
    const dataStreamName = `risk-score.risk-score-${spaceId}`;
    const defaultPipeline = `entity_analytics_create_eventIngest_from_timestamp-pipeline-${spaceId}`;

    const { component_templates: componentTemplates } = await es.cluster.getComponentTemplate({
      name: componentTemplateName,
    });
    expect(componentTemplates.length).to.eql(1);

    const { index_templates: indexTemplates } = await es.indices.getIndexTemplate({
      name: indexTemplateName,
    });
    expect(indexTemplates.length).to.eql(1);

    const { data_streams: dataStreams } = await es.indices.getDataStream({
      name: dataStreamName,
    });
    expect(dataStreams.length).to.eql(1);

    const { _nodes, cluster_name, ...pipelines } = await es.ingest.getPipeline({
      id: defaultPipeline,
    });
    expect(Object.keys(pipelines).length).to.eql(1);

    const maintainer = await maintainerRoutesHelper.getRiskScoreMaintainer();
    expect(maintainer).to.not.be(null);
    // installEntityStoreV2 stops the maintainer after install so tests control
    // when scoring runs. The run_now route runs it directly without re-enabling
    // the Task Manager schedule, so the task remains stopped (or never_started
    // if stop arrived before the first poll).
    expect(['stopped', 'never_started']).to.contain(maintainer!.taskStatus);
  };

  describe('@ess @serverless @serverlessQA setup_and_status', () => {
    before(async () => {
      await spaces.create({
        id: customSpaceName,
        name: customSpaceName,
        description: `Space for ${customSpaceName}`,
        disabledFeatures: [],
      });

      await entityStoreUtils.cleanEngines();
      await entityStoreUtilsCustomSpace.cleanEngines();
      await cleanUpRiskScoreMaintainer({ es, log });
      await cleanUpRiskScoreMaintainer({ es, log, namespace: customSpaceName });
      await deleteRiskEngineConfigs();
      await deleteRiskEngineConfigs(customSpaceName);
    });

    afterEach(async () => {
      await entityStoreUtils.cleanEngines();
      await entityStoreUtilsCustomSpace.cleanEngines();
      await cleanUpRiskScoreMaintainer({ es, log });
      await cleanUpRiskScoreMaintainer({ es, log, namespace: customSpaceName });
      await deleteRiskEngineConfigs();
      await deleteRiskEngineConfigs(customSpaceName);
    });

    after(async () => {
      await spaces.delete(customSpaceName);
    });

    describe('when entityAnalyticsEntityStoreV2 is true', () => {
      beforeEach(async () => {
        await enableEntityStoreV2Setting();
        await enableEntityStoreV2Setting(customSpaceName);
      });

      it('should return 400 for legacy risk engine init api', async () => {
        await riskEngineRoutes.init(400);
      });

      it('should return 400 for legacy risk engine status api', async () => {
        await riskEngineRoutes.getStatus(400);
      });

      it('adopts a legacy risk score config into the fixed saved object id', async () => {
        const legacyId = 'legacy-risk-engine-configuration';
        await createLegacyRiskEngineConfig({
          id: legacyId,
          attributes: {
            pageSize: 1234,
            enableResetToZero: false,
            excludeAlertStatuses: ['open'],
            filters: [{ entity_types: ['host'], filter: 'host.name:*' }],
          },
        });

        await entityStoreUtils.installEntityStoreV2({
          entityTypes: ['host'],
          waitForEntities: false,
        });
        await maintainerRoutes.runMaintainerSync('risk-score');

        const savedObjects = await listRiskEngineConfigs();
        expect(savedObjects.length).to.eql(1);
        expect(savedObjects[0].id).to.eql(
          getRiskEngineConfigurationSavedObjectId({ namespace: 'default' })
        );
        expect(savedObjects[0].attributes.pageSize).to.eql(10_000);
        expect(savedObjects[0].attributes.enableResetToZero).to.eql(false);
        expect(savedObjects[0].attributes.excludeAlertStatuses).to.eql(['open']);
        expect(savedObjects[0].attributes.filters).to.eql([
          { entity_types: ['host'], filter: 'host.name:*' },
        ]);
        expect(savedObjects.some(({ id }) => id === legacyId)).to.be(false);
      });

      it('should setup risk score assets and configuration when entity store is enabled', async () => {
        await entityStoreUtils.installEntityStoreV2({
          entityTypes: ['host'],
          waitForEntities: false,
        });
        await maintainerRoutes.runMaintainerSync('risk-score');

        await checkAssets('default', maintainerRoutes);
      });

      it('should setup risk score assets and configuration in custom namespace', async () => {
        await entityStoreUtilsCustomSpace.installEntityStoreV2({
          entityTypes: ['host'],
          waitForEntities: false,
        });
        await maintainerRoutesCustomSpace.runMaintainerSync('risk-score');

        await checkAssets(customSpaceName, maintainerRoutesCustomSpace);
      });
    });
  });
};
