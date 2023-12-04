/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['svlCommonPage', 'common', 'ingestPipelines']);
  const security = getService('security');
  const log = getService('log');

  describe('Ingest pipelines', function () {
    before(async () => {
      await security.testUser.setRoles(['ingest_pipelines_user']);
      await pageObjects.svlCommonPage.login();
    });

    after(async () => {
      await pageObjects.svlCommonPage.forceLogout();
    });

    beforeEach(async () => {
      await pageObjects.common.navigateToApp('management/ingest/ingest_pipelines');
    });

    it('Loads the app', async () => {
      log.debug('Checking for section heading to say Ingest Pipelines.');

      const headingText = await pageObjects.ingestPipelines.sectionHeadingText();
      expect(headingText).to.be('Ingest Pipelines');
    });

    it('Opens the flyout', async () => {
      log.debug('Clicking the first pipeline in the list.');

      await pageObjects.ingestPipelines.clickPipelineLink(0);
      const flyoutExists = await pageObjects.ingestPipelines.detailsFlyoutExists();
      expect(flyoutExists).to.be(true);
    });

    it('Loads the create pipeline form', async () => {
      log.debug('Clicking the create pipeline button.');
      await pageObjects.ingestPipelines.navigateToCreateNewPipeline();
      const createPipelineFormExists = await pageObjects.ingestPipelines.createPipelineFormExists();
      expect(createPipelineFormExists).to.be(true);
    });

    it('Loads the create pipeline from CSV', async () => {
      log.debug('Clicking the create pipeline from CSV button.');
      await pageObjects.ingestPipelines.navigateToCreateFromCsv();
      const createPipelineCsvExists =
        await pageObjects.ingestPipelines.createPipelineFromCsvExists();
      expect(createPipelineCsvExists).to.be(true);
    });
  });
};
