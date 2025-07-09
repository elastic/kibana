/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanup, generate } from '@kbn/data-forge';
import expect from '@kbn/expect';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { DEFAULT_SLO } from './fixtures/slo';
import { DATA_FORGE_CONFIG } from './helpers/dataforge';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const sloApi = getService('sloApi');
  const logger = getService('log');
  const samlAuth = getService('samlAuth');
  const dataViewApi = getService('dataViewApi');

  const DATA_VIEW = 'kbn-data-forge-fake_hosts.fake_hosts-*';
  const DATA_VIEW_ID = 'data-view-id';

  let adminRoleAuthc: RoleCredentials;

  describe('Find SLOs by outdated status and tags', function () {
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');

      await generate({ client: esClient, config: DATA_FORGE_CONFIG, logger });

      await dataViewApi.create({
        roleAuthc: adminRoleAuthc,
        name: DATA_VIEW,
        id: DATA_VIEW_ID,
        title: DATA_VIEW,
      });

      await sloApi.deleteAllSLOs(adminRoleAuthc);
    });

    after(async () => {
      await dataViewApi.delete({ roleAuthc: adminRoleAuthc, id: DATA_VIEW_ID });
      await cleanup({ client: esClient, config: DATA_FORGE_CONFIG, logger });
      await sloApi.deleteAllSLOs(adminRoleAuthc);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    it('finds SLOs by different tags', async () => {
      const tags = ['test1', 'test2'];
      const slo1 = {
        ...DEFAULT_SLO,
        tags: [tags[0]],
        name: 'Test SLO for api integration 1',
      };

      const slo2 = {
        ...DEFAULT_SLO,
        tags: [tags[1]],
        name: 'Test SLO for api integration 2',
      };

      await Promise.allSettled([
        sloApi.create(slo1, adminRoleAuthc),
        sloApi.create(slo2, adminRoleAuthc),
      ]);

      const definitions = await sloApi.findDefinitions(adminRoleAuthc, {
        tags: tags.join(','),
      });

      expect(definitions.total).eql(2);

      const definitionsWithoutTag2 = await sloApi.findDefinitions(adminRoleAuthc, {
        tags: tags[0],
      });

      expect(definitionsWithoutTag2.total).eql(1);
      expect(definitionsWithoutTag2.results.find((def) => def.tags.includes('tag2'))).eql(
        undefined
      );
    });

    it('finds outdated SLOs', async () => {
      const outdatedSLO = {
        ...DEFAULT_SLO,
        name: 'outdated slo',
      };
      const recentSLO = {
        ...DEFAULT_SLO,
        name: 'recent slo',
      };
      const outdatedResponse = await sloApi.create(outdatedSLO, adminRoleAuthc);
      const recentResponse = await sloApi.create(recentSLO, adminRoleAuthc);
      const { id: outdatedSloId } = outdatedResponse;
      const SOResponse = await sloApi.getSavedObject(adminRoleAuthc, outdatedSloId);
      const savedObject = SOResponse.saved_objects[0];

      await sloApi.updateSavedObject(
        adminRoleAuthc,
        { ...savedObject.attributes, version: 1 },
        savedObject.id
      );

      const allDefinitions = await sloApi.findDefinitions(adminRoleAuthc, {
        includeOutdatedOnly: 'false',
      });
      expect(allDefinitions.results.find((slo) => slo.id === recentResponse.id)?.id).to.be(
        recentResponse.id
      );

      const definitions = await sloApi.findDefinitions(adminRoleAuthc, {
        includeOutdatedOnly: 'true',
      });

      expect(definitions.results.find((slo) => slo.id === recentResponse.id)).to.be(undefined);
      expect(definitions.results.find((slo) => slo.id === outdatedResponse.id)?.id).to.be(
        outdatedSloId
      );
    });
  });
}
