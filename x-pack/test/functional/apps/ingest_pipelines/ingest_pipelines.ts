/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const TEST_PIPELINE_NAME = 'test_pipeline';

const PIPELINE = {
  name: TEST_PIPELINE_NAME,
  description: 'My pipeline description.',
  version: 1,
};

const PIPELINE_CSV = {
  name: TEST_PIPELINE_NAME,
};

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'ingestPipelines', 'savedObjects']);
  const log = getService('log');
  const es = getService('es');
  const security = getService('security');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');

  describe('Ingest Pipelines', function () {
    this.tags('smoke');
    before(async () => {
      await security.testUser.setRoles(['ingest_pipelines_user']);
    });
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('ingestPipelines');
    });
    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('Loads the app', async () => {
      log.debug('Checking for section heading to say Ingest Pipelines.');

      const headingText = await pageObjects.ingestPipelines.sectionHeadingText();
      expect(headingText).to.be('Ingest Pipelines');
    });

    describe('Pipelines list', () => {
      before(async () => {
        // Create a test pipeline
        await es.ingest.putPipeline({
          id: TEST_PIPELINE_NAME,
          body: { processors: [] },
        } as IngestPutPipelineRequest);
      });

      after(async () => {
        // Delete the test pipeline
        await es.ingest.deletePipeline({ id: TEST_PIPELINE_NAME });
      });

      it('adds pipeline query param when flyout is opened, and removes it when closed', async () => {
        // Open the flyout for the first pipeline
        await pageObjects.ingestPipelines.clickPipelineLink(0);

        let url = await browser.getCurrentUrl();
        const pipelinesList = await pageObjects.ingestPipelines.getPipelinesList();

        expect(url).to.contain(`pipeline=${pipelinesList[0]}`);

        await testSubjects.click('closeDetailsFlyout');

        url = await browser.getCurrentUrl();
        expect(url).not.to.contain(`pipeline=${pipelinesList[0]}`);
      });

      it('shows warning callout when deleting a managed pipeline', async () => {
        // Filter results by managed pipelines
        await testSubjects.click('filtersDropdown');
        await testSubjects.click('managedFilter');

        // Open the flyout for the first pipeline
        await pageObjects.ingestPipelines.clickPipelineLink(0);

        // Open the manage context menu
        await testSubjects.click('managePipelineButton');
        // Click the delete button
        await testSubjects.click('deletePipelineButton');

        // Check if the callout is displayed
        const calloutExists = await testSubjects.exists('deleteManagedAssetsCallout');
        expect(calloutExists).to.be(true);
      });

      it('sets query params for search and filters when changed', async () => {
        // Set the search input with a test search
        await testSubjects.setValue('pipelineTableSearch', 'test');

        // The url should now contain the queryText from the search input
        let url = await browser.getCurrentUrl();
        expect(url).to.contain('queryText=test');

        // Select a filter
        await testSubjects.click('filtersDropdown');
        await testSubjects.click('managedFilter');

        // Read the url again
        url = await browser.getCurrentUrl();

        // The managed filter should be in the url
        expect(url).to.contain('managed=on');
      });

      it('removes only pipeline query param and leaves other query params if any', async () => {
        // Set the search input with a test search
        await testSubjects.setValue('pipelineTableSearch', 'test');
        // Open the flyout for the first pipeline
        await pageObjects.ingestPipelines.clickPipelineLink(0);

        let url = await browser.getCurrentUrl();
        const pipelinesList = await pageObjects.ingestPipelines.getPipelinesList();

        // Url should contain both query params
        expect(url).to.contain(`pipeline=${pipelinesList[0]}`);
        expect(url).to.contain('queryText=test');

        // Close the flyout
        await testSubjects.click('closeDetailsFlyout');

        // Url should now only have the query param for the search input
        url = await browser.getCurrentUrl();
        expect(url).to.contain('queryText=test');
      });

      it('Displays the test pipeline in the list of pipelines', async () => {
        log.debug('Checking that the test pipeline is in the pipelines list.');
        await pageObjects.ingestPipelines.increasePipelineListPageSize();
        const pipelines = await pageObjects.ingestPipelines.getPipelinesList();
        expect(pipelines).to.contain(TEST_PIPELINE_NAME);
      });

      it('Opens the details flyout', async () => {
        log.debug('Clicking the first pipeline in the list.');

        await pageObjects.ingestPipelines.clickPipelineLink(0);
        const flyoutExists = await pageObjects.ingestPipelines.detailsFlyoutExists();
        expect(flyoutExists).to.be(true);
      });
    });

    it('Shows a prompt when trying to navigate away from the creation form when the form is dirty', async () => {
      // Navigate to creation flow
      await testSubjects.click('createPipelineDropdown');
      await testSubjects.click('createNewPipeline');

      // Fill in the form with some data
      await testSubjects.setValue('nameField > input', 'test_name');
      await testSubjects.setValue('descriptionField > input', 'test_description');

      // Try to navigate to another page
      await testSubjects.click('logo');

      // Since the form is now dirty it should trigger a confirmation prompt
      expect(await testSubjects.exists('navigationBlockConfirmModal')).to.be(true);
    });

    describe('Create pipeline', () => {
      afterEach(async () => {
        // Delete the pipeline that was created
        await es.ingest.deletePipeline({ id: TEST_PIPELINE_NAME });
      });

      it('Creates a pipeline', async () => {
        await pageObjects.ingestPipelines.createNewPipeline(PIPELINE);

        await pageObjects.ingestPipelines.closePipelineDetailsFlyout();
        await pageObjects.ingestPipelines.increasePipelineListPageSize();
        const pipelinesList = await pageObjects.ingestPipelines.getPipelinesList();
        const newPipelineExists = Boolean(
          pipelinesList.find((pipelineName) => pipelineName === PIPELINE.name)
        );

        expect(newPipelineExists).to.be(true);
      });

      it('Creates a pipeline from CSV', async () => {
        await pageObjects.ingestPipelines.createPipelineFromCsv(PIPELINE_CSV);

        await pageObjects.ingestPipelines.closePipelineDetailsFlyout();
        await pageObjects.ingestPipelines.increasePipelineListPageSize();
        const pipelinesList = await pageObjects.ingestPipelines.getPipelinesList();
        const newPipelineExists = Boolean(
          pipelinesList.find((pipelineName) => pipelineName === PIPELINE.name)
        );

        expect(newPipelineExists).to.be(true);
      });
    });
  });
};
