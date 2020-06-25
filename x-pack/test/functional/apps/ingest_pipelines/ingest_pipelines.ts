/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const PIPELINE = {
  name: 'test_pipeline',
  description: 'My pipeline description.',
  version: 1,
};

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'ingestPipelines']);
  const log = getService('log');
  const es = getService('legacyEs');

  describe('Ingest Pipelines', function () {
    this.tags('smoke');
    before(async () => {
      await pageObjects.common.navigateToApp('ingestPipelines');
    });

    it('Loads the app', async () => {
      log.debug('Checking for section heading to say Ingest Node Pipelines.');

      const headingText = await pageObjects.ingestPipelines.sectionHeadingText();
      expect(headingText).to.be('Ingest Node Pipelines');
    });

    it('Creates a pipeline', async () => {
      await pageObjects.ingestPipelines.createNewPipeline(PIPELINE);

      const pipelinesList = await pageObjects.ingestPipelines.getPipelinesList();
      const newPipelineExists = Boolean(
        pipelinesList.find((pipelineName) => pipelineName === PIPELINE.name)
      );

      expect(newPipelineExists).to.be(true);
    });

    after(async () => {
      // Delete the pipeline that was created
      await es.ingest.deletePipeline({ id: PIPELINE.name });
    });
  });
};
