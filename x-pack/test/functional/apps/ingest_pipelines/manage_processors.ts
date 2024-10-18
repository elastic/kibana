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
  const maxMindDatabaseName = 'GeoIP2-Anonymous-IP';
  const ipInfoDatabaseName = 'Free IP to ASN';

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

    it('Create a MaxMind database', async () => {
      await pageObjects.ingestPipelines.openCreateDatabaseModal();
      await pageObjects.ingestPipelines.fillAddDatabaseForm(
        'maxmind',
        maxMindDatabaseName,
        '123456'
      );
      await pageObjects.ingestPipelines.clickAddDatabaseButton();

      // Wait for new row to gets displayed
      await pageObjects.common.sleep(1000);

      const databasesList = await pageObjects.ingestPipelines.getGeoipDatabases();
      const databaseExists = Boolean(
        databasesList.find((databaseRow) => databaseRow.includes(maxMindDatabaseName))
      );

      expect(databaseExists).to.be(true);
    });

    it('Create an IPinfo database', async () => {
      await pageObjects.ingestPipelines.openCreateDatabaseModal();
      await pageObjects.ingestPipelines.fillAddDatabaseForm('ipinfo', 'asn');
      await pageObjects.ingestPipelines.clickAddDatabaseButton();

      // Wait for new row to gets displayed
      await pageObjects.common.sleep(1000);

      const databasesList = await pageObjects.ingestPipelines.getGeoipDatabases();
      const databaseExists = Boolean(
        databasesList.find((databaseRow) => databaseRow.includes(ipInfoDatabaseName))
      );

      expect(databaseExists).to.be(true);
    });

    it('Table contains database name and maxmind type', async () => {
      const databasesList = await pageObjects.ingestPipelines.getGeoipDatabases();
      const maxMindDatabaseRow = databasesList.find((database) =>
        database.includes(maxMindDatabaseName)
      );
      expect(maxMindDatabaseRow).to.contain(maxMindDatabaseName);
      expect(maxMindDatabaseRow).to.contain('MaxMind');

      const ipInfoDatabaseRow = databasesList.find((database) =>
        database.includes(ipInfoDatabaseName)
      );
      expect(ipInfoDatabaseRow).to.contain(ipInfoDatabaseName);
      expect(ipInfoDatabaseRow).to.contain('IPinfo');
    });

    it('Modal to delete a database', async () => {
      // Delete both databases
      await pageObjects.ingestPipelines.deleteDatabase(0);
      await pageObjects.ingestPipelines.deleteDatabase(0);
      const promptExists = await pageObjects.ingestPipelines.geoipEmptyListPromptExists();
      expect(promptExists).to.be(true);
    });
  });
};
