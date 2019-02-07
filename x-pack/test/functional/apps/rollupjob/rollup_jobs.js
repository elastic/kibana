/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { indexBy } from 'lodash';
export default function ({ getService, getPageObjects }) {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const log = getService('log');
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

    after(async () => await esArchiver.unload('logstash_functional'));

    it('create and and save a new job', async () => {
      await PageObjects.rollup.createNewRollUpJob();
      await PageObjects.rollup.verifyStepIsActive(1);
      const jobName = 'Testjob1';
      await PageObjects.rollup.addRoleNameandIndexPattern(jobName, '.kibana*');
      await PageObjects.rollup.verifyIndexPatternAccepted();
      await PageObjects.rollup.setIndexName('rollup_index');
      await PageObjects.rollup.moveToNextStep();

      //now navigate to histogram
      await PageObjects.rollup.verifyStepIsActive(2);
      await PageObjects.rollup.setJobInterval('1000ms');
      await PageObjects.rollup.moveToNextStep();

      //Terms (optional)
      await PageObjects.rollup.verifyStepIsActive(3);
      await PageObjects.rollup.moveToNextStep();

      //Histogram(optional)
      await PageObjects.rollup.verifyStepIsActive(4);
      await PageObjects.rollup.moveToNextStep();

      //Metrics(optional)
      await PageObjects.rollup.verifyStepIsActive(5);
      await PageObjects.rollup.moveToNextStep();

      //saveJob and verify the name in the list
      await PageObjects.rollup.verifyStepIsActive(6);
      await PageObjects.rollup.saveJob();

      // verify jobListTitle
      const jobList = indexBy(await PageObjects.rollup.getJobList(), 'jobName');
      log.debug(JSON.stringify(jobList));
      log.debug(Object.keys(jobList));
      expect(Object.keys(jobList)).to.have.length(1);

    });
  });
}
