/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
export default function ({ getService, getPageObjects }) {
  const esArchiver = getService('esArchiver');
  //const testSubjects = getService('testSubjects');
  //const log = getService('log');
  const PageObjects = getPageObjects(['security', 'rollup', 'common', 'header']);


  describe('rollup_jobs', async () => {
    before(async () => {
      // init data
      await Promise.all([
        esArchiver.loadIfNeeded('logstash_functional'),
        esArchiver.load('canvas/default'),
      ]);
      await PageObjects.common.navigateToApp('rollupjob');
    });

    it('create and and save a new job', async () => {
      await PageObjects.rollup.createNewRollUpJob();
      await PageObjects.rollup.addRoleName('TestJob');
      await PageObjects.rollup.addIndexPattern('.kibana*');
      await PageObjects.rollup.rollupIndexName('Testjob');
      await PageObjects.rollup.rollUpJobNextButton();

      //now navigate to histogram
      await PageObjects.rollup.rollupJobInterval('1000ms');
      await PageObjects.rollup.rollUpJobNextButton();

      //Terms (optional)
      await PageObjects.rollup.rollUpJobNextButton();

      //Histogram(optional)
      await PageObjects.rollup.rollUpJobNextButton();

      //Metrics(optional)
      await PageObjects.rollup.rollUpJobNextButton();

      //saveJob
      await PageObjects.rollup.rollUpJobSaveButton();

      // //jobListTitle
      // expect(jobName).to.eql(['TestJob']);

    });
  });
}
