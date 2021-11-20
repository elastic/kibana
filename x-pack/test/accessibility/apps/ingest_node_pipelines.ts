/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Client } from '@elastic/elasticsearch';
import { deleteAllPipelines, putSamplePipeline } from './helpers';
export default function ({ getService, getPageObjects }: any) {
  const { common } = getPageObjects(['common']);
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const esClient: Client = getService('es');
  const log = getService('log');
  const a11y = getService('a11y'); /* this is the wrapping service around axe */

  describe('Ingest Pipelines', async () => {
    before(async () => {
      await putSamplePipeline(esClient);
      await common.navigateToApp('ingestPipelines');
    });

    it('List View', async () => {
      await retry.waitFor('Ingest Pipelines page to be visible', async () => {
        await common.navigateToApp('ingestPipelines');
        return testSubjects.exists('pipelineDetailsLink') ? true : false;
      });
      await a11y.testAppSnapshot();
    });

    it('List View', async () => {
      await testSubjects.click('pipelineDetailsLink');
      await retry.waitFor('testPipeline detail panel to be visible', async () => {
        if (!testSubjects.isDisplayed('pipelineDetails')) {
          await testSubjects.click('pipelineDetailsLink');
        }
        return testSubjects.isDisplayed('pipelineDetails') ? true : false;
      });
      await a11y.testAppSnapshot();
    });

    it('Empty State Home View', async () => {
      await deleteAllPipelines(esClient, log);
      await common.navigateToApp('ingestPipelines');
      await retry.waitFor('Create New Pipeline Title to be visible', async () => {
        return testSubjects.exists('title') ? true : false;
      }); /* confirm you're on the correct page and that it's loaded */
      await a11y.testAppSnapshot(); /* this expects that there are no failures found by axe */
    });

    it('Create Pipeline Wizard', async () => {
      await testSubjects.click('emptyStateCreatePipelineDropdown');
      await testSubjects.click('emptyStateCreatePipelineButton');
      await retry.waitFor('Create pipeline page one to be visible', async () => {
        return testSubjects.isDisplayed('pageTitle') ? true : false;
      });
      await a11y.testAppSnapshot();
      await testSubjects.click('addProcessorButton');
      await retry.waitFor('Configure Pipeline flyout to be visible', async () => {
        return testSubjects.isDisplayed('configurePipelineHeader') ? true : false;
      });
      await a11y.testAppSnapshot();
    });
  });
}
