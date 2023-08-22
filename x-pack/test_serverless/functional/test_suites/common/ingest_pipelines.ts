/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import { FtrProviderContext } from '../../ftr_provider_context';

const TEST_PIPELINE_ID = 'test_pipeline';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'ingestPipelines', 'header']);
  const security = getService('security');
  const es = getService('es');
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  describe('Ingest Pipelines', function () {
    before(async () => {
      await security.testUser.setRoles(['ingest_pipelines_user']);

      try {
        // Create a test pipeline to verify list view
        const test = await es.ingest.putPipeline({
          id: TEST_PIPELINE_ID,
          body: { processors: [] },
        } as IngestPutPipelineRequest);
      } catch (error) {
        log.debug(`Error creating test pipeline: ${error}`);
      }

      await pageObjects.common.navigateToApp('ingestPipelines');
    });

    after(async () => {
      try {
        // Delete the test pipeline
        await es.ingest.deletePipeline({ id: TEST_PIPELINE_ID });
      } catch (error) {
        log.debug(`Error deleting test pipeline: ${error}`);
      }
    });

    it('renders the index pipelines list view', async () => {
      const headingText = await pageObjects.ingestPipelines.sectionHeadingText();
      expect(headingText).to.be('Ingest Pipelines');

      await retry.waitFor('ingest pipelines list to be visible', async () => {
        return await testSubjects.exists('pipelinesTable');
      });
    });
  });
};
