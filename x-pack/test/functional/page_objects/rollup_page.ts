/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

export class RollupPageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly log = this.ctx.getService('log');
  private readonly find = this.ctx.getService('find');
  private readonly header = this.ctx.getPageObject('header');

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
    await this.testSubjects.click('createRollupJobButton');
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
    await this.testSubjects.exists(`createRollupStep${stepNumber}--active`);
  }

  async setScheduleTime(time: string, isCron: boolean) {
    if (isCron) {
      await this.testSubjects.click('rollupShowAdvancedCronLink');
      await this.testSubjects.setValue('rollupAdvancedCron', time);
    }
    // TODO: Add handling for if Cron is false to go through clicking options.
  }

  async addRollupNameandIndexPattern(name: string, indexPattern: string) {
    this.log.debug(`Adding name ${name} to form`);
    await this.testSubjects.setValue('rollupJobName', name);
    await this.testSubjects.setValue('rollupIndexPattern', indexPattern);
  }

  async setRollupDelay(time: string) {
    this.log.debug(`Setting rollup delay to "${time}"`);
    await this.testSubjects.setValue('rollupDelay', time);
  }

  async verifyIndexPatternAccepted() {
    const span = await this.testSubjects.find('fieldIndexPatternSuccessMessage');
    const message = await span.findByCssSelector('p');
    const text = await message.getVisibleText();
    expect(text).to.be.equal('Success! Index pattern has matching indices.');
  }

  async setIndexName(name: string) {
    await this.testSubjects.setValue('rollupIndexName', name);
  }

  async moveToNextStep(stepNum = 0) {
    await this.testSubjects.click('rollupJobNextButton');
    return stepNum + 1;
  }

  async setJobInterval(time: string) {
    await this.testSubjects.setValue('rollupJobInterval', time);
  }

  async saveJob(startImmediately: boolean) {
    if (startImmediately) {
      const checkbox = await this.find.byCssSelector('.euiCheckbox');
      await checkbox.click();
    }
    await this.testSubjects.click('rollupJobSaveButton');
    await this.header.waitUntilLoadingHasFinished();
  }

  async getJobList() {
    const jobs = await this.testSubjects.findAll('jobTableRow');
    return await Promise.all(
      jobs.map(async (job) => {
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
      })
    );
  }
}
