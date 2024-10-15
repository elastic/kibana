/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IngestDeletePipelineRequest } from '@elastic/elasticsearch/api/types';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const PIPELINE = {
  name: 'test_pipeline',
  description: 'My pipeline description.',
  version: 1,
  emptyState: true,
};

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'ingestPipelines']);
  const log = getService('log');
  const es = getService('es');
  const security = getService('security');
  const retry = getService('retry');

  describe('Ingest Pipelines', function () {
    this.onlyEsVersion('<=7');

    before(async () => {
      await security.testUser.setRoles(['ingest_pipelines_user']);
      // Delete all existing pipelines
      await es.ingest.deletePipeline({ id: '*' } as IngestDeletePipelineRequest);
      await pageObjects.common.navigateToApp('ingestPipelines');
    });

    it('Loads the app', async () => {
      log.debug('Checking for section heading to say Ingest Pipelines.');
      await retry.waitForWithTimeout('empty section heading to be visible', 15000, async () => {
        return (
          (await await pageObjects.ingestPipelines.emptyStateHeaderText()) ===
          'Start by creating a pipeline'
        );
      });
      // const headingText = await pageObjects.ingestPipelines.sectionHeadingText();
      // expect(headingText).to.be('Ingest Pipelines');
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
      await security.testUser.restoreDefaults();
    });
  });
};
