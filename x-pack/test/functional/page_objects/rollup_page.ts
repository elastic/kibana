/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { map as mapAsync } from 'bluebird';
import { FtrProviderContext } from '../ftr_provider_context';

export function RollupPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const find = getService('find');
  const PageObjects = getPageObjects(['header', 'common']);

  class RollupJobPage {
    async createNewRollUpJob(
      jobName: string,
      indexPattern: string,
      indexName: string,
      interval: string,
      delay = '1d',
      startImmediately = false,
      scheduledTime = { time: 'minute', cron: true }
    ) {
      let stepNum = 1;
      // Step 1
      await testSubjects.click('createRollupJobButton');
      await this.verifyStepIsActive(stepNum);
      await this.addRollupNameandIndexPattern(jobName, indexPattern);
      await this.verifyIndexPatternAccepted();
      await this.setIndexName(indexName);
      await this.setScheduleTime(scheduledTime.time, scheduledTime.cron);
      await this.setRollupDelay(delay);
      stepNum = await this.moveToNextStep(stepNum);

      // Step 2: Histogram
      await this.verifyStepIsActive(stepNum);
      await this.setJobInterval(interval);
      stepNum = await this.moveToNextStep(stepNum);

      // Step 3: Terms (optional)
      await this.verifyStepIsActive(stepNum);
      stepNum = await this.moveToNextStep();

      // Step 4: Histogram(optional)
      await this.verifyStepIsActive(stepNum);
      stepNum = await this.moveToNextStep();

      // Step 5: Metrics(optional)
      await this.verifyStepIsActive(stepNum);
      stepNum = await this.moveToNextStep();

      // Step 6: saveJob and verify the name in the list
      await this.verifyStepIsActive(stepNum);
      await this.saveJob(startImmediately);
    }

    async verifyStepIsActive(stepNumber = 0) {
      await testSubjects.exists(`createRollupStep${stepNumber}--active`);
    }

    async setScheduleTime(time: string, isCron: boolean) {
      if (isCron) {
        await testSubjects.click('rollupShowAdvancedCronLink');
        await testSubjects.setValue('rollupAdvancedCron', time);
      }
      // TODO: Add handling for if Cron is false to go through clicking options.
    }

    async addRollupNameandIndexPattern(name: string, indexPattern: string) {
      log.debug(`Adding name ${name} to form`);
      await testSubjects.setValue('rollupJobName', name);
      await testSubjects.setValue('rollupIndexPattern', indexPattern);
    }

    async setRollupDelay(time: string) {
      log.debug(`Setting rollup delay to "${time}"`);
      await testSubjects.setValue('rollupDelay', time);
    }

    async verifyIndexPatternAccepted() {
      const span = await testSubjects.find('fieldIndexPatternSuccessMessage');
      const message = await span.findByCssSelector('p');
      const text = await message.getVisibleText();
      expect(text).to.be.equal('Success! Index pattern has matching indices.');
    }

    async setIndexName(name: string) {
      await testSubjects.setValue('rollupIndexName', name);
    }

    async moveToNextStep(stepNum = 0) {
      await testSubjects.click('rollupJobNextButton');
      return stepNum + 1;
    }

    async setJobInterval(time: string) {
      await testSubjects.setValue('rollupJobInterval', time);
    }

    async saveJob(startImmediately: boolean) {
      if (startImmediately) {
        const checkbox = await find.byCssSelector('.euiCheckbox');
        await checkbox.click();
      }
      await testSubjects.click('rollupJobSaveButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getJobList() {
      const jobs = await testSubjects.findAll('jobTableRow');
      return mapAsync(jobs, async (job) => {
        const jobNameElement = await job.findByTestSubject('jobTableCell-id');
        const jobStatusElement = await job.findByTestSubject('jobTableCell-status');
        const jobIndexPatternElement = await job.findByTestSubject('jobTableCell-indexPattern');
        const jobRollUpIndexPatternElement = await job.findByTestSubject(
          'jobTableCell-rollupIndex'
        );
        const jobDelayElement = await job.findByTestSubject('jobTableCell-rollupDelay');
        const jobIntervalElement = await job.findByTestSubject(
          'jobTableCell-dateHistogramInterval'
        );
        const jobGroupElement = await job.findByTestSubject('jobTableCell-groups');
        const jobMetricsElement = await job.findByTestSubject('jobTableCell-metrics');

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
