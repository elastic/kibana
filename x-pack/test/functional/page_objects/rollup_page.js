/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { map as mapAsync } from 'bluebird';

export function RollUpPageProvider({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const PageObjects = getPageObjects(['header', 'common']);


  class RollupJobPage {
    async createNewRollUpJob() {
      await testSubjects.click('createRollupJobButton');
    }

    async verifyStepIsActive(stepNumber) {
      await testSubjects.exists(`createRollupStep${stepNumber}--active`);
    }

    async addRoleNameandIndexPattern(name, indexPattern) {
      log.debug(`Adding name ${name} to form`);
      await testSubjects.setValue('rollUpJobName', name);
      await testSubjects.setValue('rollUpIndexPattern', indexPattern);
    }

    async verifyIndexPatternAccepted() {
      const span = await testSubjects.find('fieldIndexPatternSuccessMessage');
      const message = await span.findByCssSelector('p');
      const text = await message.getVisibleText();
      expect(text).to.be.equal('Success! Index pattern has matching indices.');
    }

    async setIndexName(name) {
      await testSubjects.setValue('rollUpIndexName', name);
    }

    async moveToNextStep() {
      await testSubjects.click('rollUpJobNextButton');
    }

    async setJobInterval(time) {
      await testSubjects.setValue('rollupJobInterval', time);
    }

    async saveJob() {
      await testSubjects.click('rollUpJobSaveButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getJobList() {
      const jobs = await testSubjects.findAll('jobTableRow');
      return mapAsync(jobs, async job => {
        const jobNameElement = await job.findByCssSelector('[data-test-subj="jobTableCell-ID"]');
        const jobStatusElement = await job.findByCssSelector('[data-test-subj="jobTableCell-Status"]');
        const jobIndexPatternElement = await job.findByCssSelector('[data-test-subj="jobTableCell-Indexpattern"]');
        const jobRollUpIndexPatternElement = await job.findByCssSelector('[data-test-subj="jobTableCell-Rollupindex"]');
        const jobDelayElement = await job.findByCssSelector('[data-test-subj="jobTableCell-Delay"]');
        const jobIntervalElement = await job.findByCssSelector('[data-test-subj="jobTableCell-Interval"]');
        const jobGroupElement = await job.findByCssSelector('[data-test-subj="jobTableCell-Groups"]');
        const jobMetricsElement = await job.findByCssSelector('[data-test-subj="jobTableCell-Metrics"]');

        return {
          jobName: await jobNameElement.getVisibleText(),
          jobStatus: await jobStatusElement.getVisibleText(),
          jobIndexPattern: await jobIndexPatternElement.getVisibleText(),
          jobRollUpIndexPattern: await jobRollUpIndexPatternElement.getVisibleText(),
          jobDelayElement: await jobDelayElement.getVisibleText(),
          jobInterval: await jobIntervalElement.getVisibleText(),
          jobGroup: await jobGroupElement.getVisibleText(),
          jobMetrics: await jobMetricsElement.getVisibleText()
        };
      });
    }

  }
  return new RollupJobPage();
}
