/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { riskEngineConfigurationTypeName } from '@kbn/security-solution-plugin/server/lib/entity_analytics/risk_engine/saved_object';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import {
  EntityStoreUtils,
  riskEngineRouteHelpersFactory,
  entityMaintainerRouteHelpersFactory,
} from '../../utils';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const spaces = getService('spaces');
  const retry = getService('retry');
  const customSpaceName = 'ea-customspace-it';
  const riskEngineRoutes = riskEngineRouteHelpersFactory(supertest);
  const maintainerRoutes = entityMaintainerRouteHelpersFactory(supertest);
  const maintainerRoutesCustomSpace = entityMaintainerRouteHelpersFactory(
    supertest,
    customSpaceName
  );
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');

  const entityStoreUtils = EntityStoreUtils(getService);
  const entityStoreUtilsCustomSpace = EntityStoreUtils(getService, customSpaceName);

  const waitForMaintainerRun = async (
    routes: ReturnType<typeof entityMaintainerRouteHelpersFactory>,
    maintainerId: string = 'risk-score'
  ) => {
    await retry.waitForWithTimeout(
      `Entity maintainer "${maintainerId}" to complete at least one run`,
      60_000,
      async () => {
        const response = await routes.getMaintainers();
        const maintainer = response.body.maintainers.find(
          (m: { id: string; runs: number }) => m.id === maintainerId
        );
        return maintainer !== undefined && maintainer.runs >= 1;
      }
    );
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
    const isDefaultSpace = spaceId === 'default';
    const soResponse = await kibanaServer.savedObjects.find({
      type: riskEngineConfigurationTypeName,
      ...(isDefaultSpace ? {} : { namespace: spaceId }),
    });

    expect(soResponse.saved_objects.length).to.eql(1);

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
    expect(maintainer!.taskStatus).to.eql('started');
    expect(maintainer!.runs).to.be.greaterThan(0);
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
    });

    afterEach(async () => {
      await entityStoreUtils.cleanEngines();
      await entityStoreUtilsCustomSpace.cleanEngines();
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

      it('should setup risk score assets and configuration when entity store is enabled', async () => {
        await entityStoreUtils.installEntityStoreV2();
        await waitForMaintainerRun(maintainerRoutes);

        await checkAssets('default', maintainerRoutes);
      });

      it('should setup risk score assets and configuration in custom namespace', async () => {
        await entityStoreUtilsCustomSpace.installEntityStoreV2();
        await waitForMaintainerRun(maintainerRoutesCustomSpace);

        await checkAssets(customSpaceName, maintainerRoutesCustomSpace);
      });
    });
  });
};
