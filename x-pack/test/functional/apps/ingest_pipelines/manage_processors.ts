/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'ingestPipelines', 'savedObjects']);
  const security = getService('security');
  const databaseName = 'GeoIP2-Anonymous-IP';

  describe('Ingest Pipelines: Manage Processors', function () {
    this.tags('smoke');
    before(async () => {
      await security.testUser.setRoles(['manage_processors_user']);
    });
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('ingestPipelines');
      await pageObjects.ingestPipelines.navigateToManageProcessorsPage();
    });
    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('Empty list prompt', async () => {
      const promptExists = await pageObjects.ingestPipelines.geoipEmptyListPromptExists();
      expect(promptExists).to.be(true);
    });

    it('Modal to create a database', async () => {
      await pageObjects.ingestPipelines.openCreateDatabaseModal();
      await pageObjects.ingestPipelines.fillAddDatabaseForm('123456', databaseName);
      await pageObjects.ingestPipelines.clickAddDatabaseButton();

      const databasesList = await pageObjects.ingestPipelines.getGeoipDatabases();
      const databaseExists = Boolean(
        databasesList.find((databaseRow) => databaseRow.includes(databaseName))
      );

      expect(databaseExists).to.be(true);
    });

    it('Table contains database name and maxmind type', async () => {
      const databasesList = await pageObjects.ingestPipelines.getGeoipDatabases();
      const databaseRow = databasesList.find((database) => database.includes(databaseName));
      expect(databaseRow).to.contain(databaseName);
      expect(databaseRow).to.contain('MaxMind');
    });

    it('Modal to delete a database', async () => {
      await pageObjects.ingestPipelines.deleteDatabase(0);
      const promptExists = await pageObjects.ingestPipelines.geoipEmptyListPromptExists();
      expect(promptExists).to.be(true);
    });
  });
};
