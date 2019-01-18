/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

//import { map as mapAsync } from 'bluebird';
import expect from 'expect.js';

export function RollUpPageProvider({ getService }) {
  const testSubjects = getService('testSubjects');

  class RollupJobPage {
    async verifyAccountSettings(expectedEmail, expectedUserName) {
      await testSubjects.click('loggedInUser');
      const usernameField = await testSubjects.find('usernameField');
      const userName = await usernameField.getVisibleText();
      expect(userName).to.be(expectedUserName);
      const emailIdField = await testSubjects.find('emailIdField');
      const emailField = await emailIdField.getVisibleText();
      expect(emailField).to.be(expectedEmail);
    }

  }
  return new RollupJobPage();
}
