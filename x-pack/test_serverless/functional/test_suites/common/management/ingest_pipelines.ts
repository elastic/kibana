/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import { FtrProviderContext } from '../../../ftr_provider_context';

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
  const pageObjects = getPageObjects(['svlCommonPage', 'common', 'ingestPipelines']);
  const es = getService('es');
  const log = getService('log');

  describe('Ingest Pipelines', function () {
    this.tags('smoke');
    before(async () => {
      await pageObjects.svlCommonPage.loginAsAdmin();
    });
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('ingestPipelines');
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

      it('Displays the test pipeline in the list of pipelines', async () => {
        log.debug('Checking that the test pipeline is in the pipelines list.');
        await pageObjects.ingestPipelines.increasePipelineListPageSize();
        const pipelines = await pageObjects.ingestPipelines.getPipelinesList({
          searchFor: TEST_PIPELINE_NAME,
        });
        expect(pipelines).to.contain(TEST_PIPELINE_NAME);
      });

      it('Opens the details flyout', async () => {
        log.debug('Clicking the first pipeline in the list.');

        await pageObjects.ingestPipelines.clickPipelineLink(0);
        const flyoutExists = await pageObjects.ingestPipelines.detailsFlyoutExists();
        expect(flyoutExists).to.be(true);
      });
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
        const pipelinesList = await pageObjects.ingestPipelines.getPipelinesList({
          searchFor: TEST_PIPELINE_NAME,
        });
        const newPipelineExists = Boolean(
          pipelinesList.find((pipelineName) => pipelineName === PIPELINE.name)
        );

        expect(newPipelineExists).to.be(true);
      });

      it('Creates a pipeline from CSV', async () => {
        await pageObjects.ingestPipelines.createPipelineFromCsv(PIPELINE_CSV);

        await pageObjects.ingestPipelines.closePipelineDetailsFlyout();
        await pageObjects.ingestPipelines.increasePipelineListPageSize();
        const pipelinesList = await pageObjects.ingestPipelines.getPipelinesList({
          searchFor: TEST_PIPELINE_NAME,
        });
        const newPipelineExists = Boolean(
          pipelinesList.find((pipelineName) => pipelineName === PIPELINE.name)
        );

        expect(newPipelineExists).to.be(true);
      });
    });
  });
};
