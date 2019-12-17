/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { map as mapAsync } from 'bluebird';

export function RollupPageProvider({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const find = getService('find');
  const PageObjects = getPageObjects(['header', 'common']);

  class RollupJobPage {
    async createNewRollUpJob(
      jobName,
      indexPattern,
      indexName,
      interval,
      delay = '1d',
      startImmediately = false,
      scheduledTime = { time: 'minute', cron: true }
    ) {
      let stepNum = 1;
      //Step 1
      await testSubjects.click('createRollupJobButton');
      await this.verifyStepIsActive(stepNum);
      await this.addRollupNameandIndexPattern(jobName, indexPattern);
      await this.verifyIndexPatternAccepted();
      await this.setIndexName(indexName);
      await this.setScheduleTime(scheduledTime.time, scheduledTime.cron);
      await this.setRollupDelay(delay);
      stepNum = await this.moveToNextStep(stepNum);

      //Step 2: Histogram
      await this.verifyStepIsActive(stepNum);
      await this.setJobInterval(interval);
      stepNum = await this.moveToNextStep(stepNum);

      //Step 3: Terms (optional)
      await this.verifyStepIsActive(stepNum);
      stepNum = await this.moveToNextStep();

      //Step 4: Histogram(optional)
      await this.verifyStepIsActive(stepNum);
      stepNum = await this.moveToNextStep();

      //Step 5: Metrics(optional)
      await this.verifyStepIsActive(stepNum);
      stepNum = await this.moveToNextStep();

      //Step 6: saveJob and verify the name in the list
      await this.verifyStepIsActive(stepNum);
      await this.saveJob(startImmediately);
    }

    async verifyStepIsActive(stepNumber) {
      await testSubjects.exists(`createRollupStep${stepNumber}--active`);
    }

    async setScheduleTime(time, cron) {
      if (cron) {
        await testSubjects.click('rollupShowAdvancedCronLink');
        await testSubjects.setValue('rollupAdvancedCron', time);
      }
      // TODO: Add handling for if Cron is false to go through clicking options.
    }

    async addRollupNameandIndexPattern(name, indexPattern) {
      log.debug(`Adding name ${name} to form`);
      await testSubjects.setValue('rollupJobName', name);
      await testSubjects.setValue('rollupIndexPattern', indexPattern);
    }

    async setRollupDelay(time) {
      log.debug(`Setting rollup delay to "${time}"`);
      await testSubjects.setValue('rollupDelay', time);
    }

    async verifyIndexPatternAccepted() {
      const span = await testSubjects.find('fieldIndexPatternSuccessMessage');
      const message = await span.findByCssSelector('p');
      const text = await message.getVisibleText();
      expect(text).to.be.equal('Success! Index pattern has matching indices.');
    }

    async setIndexName(name) {
      await testSubjects.setValue('rollupIndexName', name);
    }

    async moveToNextStep(stepNum) {
      await testSubjects.click('rollupJobNextButton');
      return stepNum + 1;
    }

    async setJobInterval(time) {
      await testSubjects.setValue('rollupJobInterval', time);
    }

    async saveJob(startImmediately) {
      if (startImmediately) {
        const checkbox = await find.byCssSelector('.euiCheckbox');
        await checkbox.click();
      }
      await testSubjects.click('rollupJobSaveButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getJobList() {
      const jobs = await testSubjects.findAll('jobTableRow');
      return mapAsync(jobs, async job => {
        const jobNameElement = await job.findByCssSelector('[data-test-subj="jobTableCell-id"]');
        const jobStatusElement = await job.findByCssSelector(
          '[data-test-subj="jobTableCell-status"]'
        );
        const jobIndexPatternElement = await job.findByCssSelector(
          '[data-test-subj="jobTableCell-indexPattern"]'
        );
        const jobRollUpIndexPatternElement = await job.findByCssSelector(
          '[data-test-subj="jobTableCell-rollupIndex"]'
        );
        const jobDelayElement = await job.findByCssSelector(
          '[data-test-subj="jobTableCell-rollupDelay"]'
        );
        const jobIntervalElement = await job.findByCssSelector(
          '[data-test-subj="jobTableCell-dateHistogramInterval"]'
        );
        const jobGroupElement = await job.findByCssSelector(
          '[data-test-subj="jobTableCell-groups"]'
        );
        const jobMetricsElement = await job.findByCssSelector(
          '[data-test-subj="jobTableCell-metrics"]'
        );

        return {
          jobName: await jobNameElement.getVisibleText(),
          jobStatus: await jobStatusElement.getVisibleText(),
          jobIndexPattern: await jobIndexPatternElement.getVisibleText(),
          jobRollUpIndexPattern: await jobRollUpIndexPatternElement.getVisibleText(),
          jobDelayElement: await jobDelayElement.getVisibleText(),
          jobInterval: await jobIntervalElement.getVisibleText(),
          jobGroup: await jobGroupElement.getVisibleText(),
          jobMetrics: await jobMetricsElement.getVisibleText(),
        };
      });
    }
  }
  return new RollupJobPage();
}
