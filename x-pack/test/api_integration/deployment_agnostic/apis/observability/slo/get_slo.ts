/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanup, generate } from '@kbn/data-forge';
import expect from '@kbn/expect';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
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

  describe('Get SLOs', function () {
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

    it('get SLO by id', async () => {
      const createResponse1 = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);
      await sloApi.create(
        Object.assign({}, DEFAULT_SLO, { name: 'something irrelevant foo' }),
        adminRoleAuthc
      );

      expect(createResponse1).property('id');
      const sloId1 = createResponse1.id;

      // get the slo by ID
      const getSloResponse = await sloApi.get(sloId1, adminRoleAuthc);
      // We cannot assert on the summary values itself - it would make the test too flaky
      // But we can assert on the existence of these fields at least.
      // On top of whatever the SLO definition contains.
      expect(getSloResponse).property('summary');
      expect(getSloResponse).property('meta');
      expect(getSloResponse).property('instanceId');
      expect(getSloResponse.budgetingMethod).eql('occurrences');
      expect(getSloResponse.timeWindow).eql({ duration: '7d', type: 'rolling' });
    });
  });
}
