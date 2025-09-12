/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TestCaseWithoutTimeline } from '../../../objects/case';
import { ALL_CASES_CREATE_NEW_CASE_BTN, ALL_CASES_NAME } from '../../../screens/all_cases';

import { goToCreateNewCase } from '../../../tasks/all_cases';
import { deleteCases } from '../../../tasks/api_calls/cases';

import {
  backToCases,
  createCase,
  fillCasesMandatoryfields,
  filterStatusOpen,
} from '../../../tasks/create_new_case';
import { login, loginWithUser } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import {
  createUsersAndRoles,
  deleteUsersAndRoles,
  secAll,
  secAllUser,
  secReadCasesAllUser,
  secReadCasesAll,
  secAllCasesNoDelete,
  secAllCasesNoDeleteUser,
  secAllCasesOnlyReadDeleteUser,
  secAllCasesOnlyReadDelete,
} from '../../../tasks/privileges';

import { CASES_URL } from '../../../urls/navigation';
const usersToCreate = [
  secAllUser,
  secReadCasesAllUser,
  secAllCasesNoDeleteUser,
  secAllCasesOnlyReadDeleteUser,
];
const rolesToCreate = [secAll, secReadCasesAll, secAllCasesNoDelete, secAllCasesOnlyReadDelete];

const testCase: TestCaseWithoutTimeline = {
  name: 'This is the title of the case',
  tags: ['Tag1', 'Tag2'],
  description: 'This is the case description',
  reporter: 'elastic',
  owner: 'securitySolution',
};

describe('Cases privileges', { tags: ['@ess'] }, () => {
  beforeEach(() => {
    deleteUsersAndRoles(usersToCreate, rolesToCreate);
    createUsersAndRoles(usersToCreate, rolesToCreate);
    login();
    deleteCases();
  });

  for (const user of [secAllUser, secReadCasesAllUser, secAllCasesNoDeleteUser]) {
    it(`User ${user.username} with role(s) ${user.roles.join()} can create a case`, () => {
      loginWithUser(user);
      visit(CASES_URL);
      goToCreateNewCase();
      fillCasesMandatoryfields(testCase);
      createCase();
      backToCases();
      filterStatusOpen();

      cy.get(ALL_CASES_NAME).should('have.text', testCase.name);
    });
  }

  for (const user of [secAllCasesOnlyReadDeleteUser]) {
    it(`User ${user.username} with role(s) ${user.roles.join()} cannot create a case`, () => {
      loginWithUser(user);
      visit(CASES_URL);
      cy.get(ALL_CASES_CREATE_NEW_CASE_BTN).should('not.exist');
    });
  }
});
