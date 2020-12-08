/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { deleteAllPipelines, putSamplePipeline } from './helpers';
export default function ({ getService, getPageObjects }: any) {
  const { common } = getPageObjects(['common']);
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const esClient = getService('es');
  const log = getService('log');
  const a11y = getService('a11y'); /* this is the wrapping service around axe */

  describe('Ingest Node Pipelines', async () => {
    before(async () => {
      await deleteAllPipelines(esClient, log);
      /* navigates to the page we want to test */
    });

    it('Empty State Home View', async () => {
      await common.navigateToApp('ingestPipelines');
      await retry.waitFor('Create New Pipeline Title to be visible', async () => {
        return testSubjects.exists('title') ? true : false;
      }); /* confirm you're on the correct page and that it's loaded */
      await a11y.testAppSnapshot(); /* this expects that there are no failures found by axe */
    });

    it('List View', async () => {
      await putSamplePipeline(esClient);
      await retry.waitFor('Ingest Node Pipelines page to be visible', async () => {
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
    /**
     * If these tests were added by our QA team, tests that fail that require significant app code
     * changes to be fixed will be skipped with a corresponding issue label with more info
     */
    // Skipped due to https://github.com/elastic/kibana/issues/99999
    it.skip('all plugins view page meets a11y requirements', async () => {
      // await home.clickAllKibanaPlugins();
      await a11y.testAppSnapshot();
    });

    /**
     * Testing all the versions and different views of of a page is important to get good
     * coverage. Things like empty states, different license levels, different permissions, and
     * loaded data can all significantly change the UI which necessitates their own test.
     */
    it.skip('Add Kibana sample data page', async () => {
      await a11y.testAppSnapshot();
    });
  });
}
