/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

//import { map as mapAsync } from 'bluebird';
import expect from 'expect.js';

export function RollUpPageProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const retry = getService('retry');
  const log = getService('log');

  class RollupJobPage {
    async createNewRollUpJob() {
      await testSubjects.click('createRollupJobButton');
    }

    async addRoleNameandIndexPattern(name, indexPattern, rollUpIndexName) {
      log.debug(`Adding name ${name} to form`);
      await testSubjects.setValue('rollUpJobName', name);
      await testSubjects.setValue('rollUpIndexPattern', indexPattern);
      await testSubjects.setValue('rollUpIndexPatternName', rollUpIndexName);
    }


    async verifyIndexPatternAccepted() {
      await testSubjects.find('fieldIndexPatternSuccessMessage');
      //const message = await testSubjects.find('fieldIndexPatternSuccessMessage');
      //const text = await message.getVisibleText();
      //expect(text).to.be.equal("Success! Index pattern has matching indices.");
      //Success! Index pattern has matching indices.

    }
    async rollUpJobNextButton() {
      await testSubjects.click('rollUpJobNextButton');
    }


    async rollupJobInterval(time) {
      await testSubjects.setValue('rollupJobInterval', time);
    }


    // async rollupJobInterval(name) {
    //   const rollupJobInterval =
    //   await retry.try(() => find.byCssSelector('[data-test-subj="rollupJobInterval"]'));
    //   await rollupJobInterval.type(name);
    // }

    async rollUpJobSaveButton() {
      await testSubjects.click('rollUpJobSaveButton');
    }

  }
  return new RollupJobPage();
}
