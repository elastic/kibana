/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'settings', 'header', 'rollup']);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('Stack management- rollup a11y tests', () => {
    const rollupJobName = `rollup${Date.now().toString()}`;
    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.update({
        defaultIndex: 'logstash-*',
      });
      await PageObjects.settings.navigateTo();
      await PageObjects.rollup.clickRollupJobsTab();
    });

    it('empty state', async () => {
      await a11y.testAppSnapshot();
    });

    describe('create a rollup job wizard', async () => {
      it('step 1 - logistics', async () => {
        await testSubjects.click('createRollupJobButton');
        await PageObjects.rollup.verifyStepIsActive(1);
        await a11y.testAppSnapshot();
      });

      it('step 2 - date histogram', async () => {
        await PageObjects.rollup.addRollupNameandIndexPattern(rollupJobName, 'logstash*');
        await PageObjects.rollup.verifyIndexPatternAccepted();
        await PageObjects.rollup.setIndexName('rollupindex');
        await PageObjects.rollup.moveToNextStep(2);
        await PageObjects.rollup.verifyStepIsActive(2);
        await a11y.testAppSnapshot();
      });

      it('step 3 - terms', async () => {
        await PageObjects.rollup.setJobInterval('24h');
        await PageObjects.rollup.moveToNextStep(3);
        await PageObjects.rollup.verifyStepIsActive(3);
        await a11y.testAppSnapshot();
      });

      it('step 4 - histogram', async () => {
        await PageObjects.rollup.moveToNextStep(4);
        await PageObjects.rollup.verifyStepIsActive(4);
        await a11y.testAppSnapshot();
      });

      it('step 5 - metrics', async () => {
        await PageObjects.rollup.moveToNextStep(5);
        await PageObjects.rollup.verifyStepIsActive(5);
        await a11y.testAppSnapshot();
      });

      it('step 6 - review and save', async () => {
        await PageObjects.rollup.moveToNextStep(6);
        await PageObjects.rollup.verifyStepIsActive(6);
        await a11y.testAppSnapshot();
      });

      it('submit form and snapshot rollup flyout', async () => {
        await PageObjects.rollup.saveJob(false);
        await a11y.testAppSnapshot();
      });

      it('rollup table', async () => {
        await PageObjects.rollup.closeFlyout();
        await a11y.testAppSnapshot();
      });
    });

    after(async () => {
      await es.transport.request({
        path: `/_rollup/job/${rollupJobName}`,
        method: 'DELETE',
      });
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });
  });
}
