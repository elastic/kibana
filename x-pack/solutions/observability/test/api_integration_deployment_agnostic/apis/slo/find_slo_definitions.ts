/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanup, generate } from '@kbn/data-forge';
import expect from '@kbn/expect';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { DEFAULT_SLO } from './fixtures/slo';
import { DATA_FORGE_CONFIG } from './helpers/dataforge';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const sloApi = getService('sloApi');
  const logger = getService('log');
  const retry = getService('retry');
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

    it('finds SLOs with health data when includeHealth is true', async () => {
      const slo = {
        ...DEFAULT_SLO,
        name: 'Test SLO with health',
      };

      const createResponse = await sloApi.create(slo, adminRoleAuthc);

      // Wait for transforms & health to become available — transforms run asynchronously
      await retry.tryForTime(180 * 1000, async () => {
        const definitions = await sloApi.findDefinitions(adminRoleAuthc, {
          includeHealth: 'true',
        });

        expect(definitions.total).to.be.greaterThan(0);

        const createdSlo = definitions.results.find((def) => def.id === createResponse.id);
        expect(createdSlo).to.not.be(undefined);
        expect(createdSlo?.health).to.not.be(undefined);

        expect(createdSlo?.health?.isProblematic).eql(false);

        expect(createdSlo?.health?.rollup.isProblematic).eql(false);
        expect(createdSlo?.health?.rollup.missing).eql(false);
        expect(createdSlo?.health?.rollup.status).eql('healthy');
        expect(['started', 'indexing']).to.contain(createdSlo?.health?.rollup.state);

        expect(createdSlo?.health?.summary.isProblematic).eql(false);
        expect(createdSlo?.health?.summary.missing).eql(false);
        expect(createdSlo?.health?.summary.status).eql('healthy');
        expect(['started', 'indexing']).to.contain(createdSlo?.health?.summary.state);
      });
    });
  });
}
