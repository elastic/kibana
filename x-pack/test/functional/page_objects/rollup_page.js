/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

//import { map as mapAsync } from 'bluebird';
//import expect from 'expect.js';

export function RollUpPageProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const retry = getService('retry');
  const log = getService('log');

  class RollupJobPage {
    async createNewRollUpJob() {
      //await testSubjects.find('createRollupJobButton');
      await testSubjects.click('createRollupJobButton');
    }

    async addRoleName(name) {
      log.debug(`Adding name ${name} to form`);
      const rollUpJobNameInput =
      await retry.try(() => find.byCssSelector('[data-test-subj="rollUpJobName"]'));
      await rollUpJobNameInput.type(name);
    }


    async addIndexPattern(name) {
      log.debug(`Adding name ${name} to form`);
      const rollUpIndexPattern =
      await retry.try(() => find.byCssSelector('[data-test-subj="rollUpIndexPattern"]'));
      await rollUpIndexPattern.type(name);
    }


    async rollupIndexName(name) {
      log.debug(`Adding name ${name} to form`);
      const rollUpIndexName =
      await retry.try(() => find.byCssSelector('[data-test-subj="rollUpIndexName"]'));
      await rollUpIndexName.type(name);
    }

    async rollUpJobNextButton() {
      await testSubjects.click('rollUpJobNextButton');
    }

    async rollupJobInterval(name) {
      const rollupJobInterval =
      await retry.try(() => find.byCssSelector('[data-test-subj="rollupJobInterval"]'));
      await rollupJobInterval.type(name);
    }

    async rollUpJobSaveButton() {
      await testSubjects.click('rollUpJobSaveButton');
    }

  }
  return new RollupJobPage();
}
