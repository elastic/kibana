/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import expect from '@kbn/expect';
import path from 'path';
import { FtrProviderContext } from '../../ftr_provider_context';

const TEST_PIPELINE_NAME = 'test';

const PIPELINE = {
  name: 'test_pipeline',
  description: 'My pipeline description.',
  version: 1,
};

const PIPELINE_CSV = {
  name: 'test_pipeline',
};

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'ingestPipelines', 'savedObjects']);
  const log = getService('log');
  const es = getService('es');
  const security = getService('security');

  describe('Ingest Pipelines', function () {
    this.tags('smoke');
    before(async () => {
      await security.testUser.setRoles(['ingest_pipelines_user']);
      // Create a test pipeline
      await es.ingest.putPipeline({
        id: TEST_PIPELINE_NAME,
        body: { processors: [] },
      } as IngestPutPipelineRequest);
      await pageObjects.common.navigateToApp('ingestPipelines');
    });

    it('Loads the app', async () => {
      log.debug('Checking for section heading to say Ingest Pipelines.');

      const headingText = await pageObjects.ingestPipelines.sectionHeadingText();
      expect(headingText).to.be('Ingest Pipelines');
    });

    it('Displays the test pipeline in the list of pipelines', async () => {
      const pipelines = await pageObjects.ingestPipelines.getPipelinesList();
      expect(pipelines).to.contain(TEST_PIPELINE_NAME);
    });

    describe('create pipeline', () => {
      it('Creates a pipeline', async () => {
        await pageObjects.ingestPipelines.createNewPipeline(PIPELINE);

        const pipelinesList = await pageObjects.ingestPipelines.getPipelinesList();
        const newPipelineExists = Boolean(
          pipelinesList.find((pipelineName) => pipelineName === PIPELINE.name)
        );

        expect(newPipelineExists).to.be(true);
      });

      it('Creates a pipeline from CSV', async () => {
        await pageObjects.ingestPipelines.navigateToCreateFromCsv();

        await pageObjects.common.setFileInputPath(
          path.join(__dirname, 'exports', 'example_mapping.csv')
        );

        await pageObjects.ingestPipelines.createPipelineFromCsv(PIPELINE_CSV);

        const pipelinesList = await pageObjects.ingestPipelines.getPipelinesList();
        const newPipelineExists = Boolean(
          pipelinesList.find((pipelineName) => pipelineName === PIPELINE.name)
        );

        expect(newPipelineExists).to.be(true);
      });

      afterEach(async () => {
        // Close details flyout
        await pageObjects.ingestPipelines.closePipelineDetailsFlyout();
        // Delete the pipeline that was created
        await es.ingest.deletePipeline({ id: PIPELINE.name });
        await security.testUser.restoreDefaults();
      });
    });

    after(async () => {
      // Delete the test pipeline
      await es.ingest.deletePipeline({ id: TEST_PIPELINE_NAME });
    });
  });
};
