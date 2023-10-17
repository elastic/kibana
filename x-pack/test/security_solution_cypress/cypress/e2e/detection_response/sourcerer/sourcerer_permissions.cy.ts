/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loginWithUser } from '../../../tasks/login';
import { visitWithUser } from '../../../tasks/navigation';

import { hostsUrl } from '../../../urls/navigation';
import { postDataView } from '../../../tasks/common';
import {
  createUsersAndRoles,
  secReadCasesAll,
  secReadCasesAllUser,
} from '../../../tasks/privileges';
import { TOASTER } from '../../../screens/configure_cases';

const usersToCreate = [secReadCasesAllUser];
const rolesToCreate = [secReadCasesAll];
const dataViews = ['auditbeat-*,fakebeat-*', 'auditbeat-*,*beat*,siem-read*,.kibana*,fakebeat-*'];

describe('Sourcerer permissions', { tags: ['@ess', '@skipInServerless'] }, () => {
  before(() => {
    cy.task('esArchiverResetKibana');
    dataViews.forEach((dataView: string) => postDataView(dataView));
    createUsersAndRoles(usersToCreate, rolesToCreate);
  });

  it(`role(s) ${secReadCasesAllUser.roles.join()} shows error when user does not have permissions`, () => {
    loginWithUser(secReadCasesAllUser);
    visitWithUser(hostsUrl('allHosts'), secReadCasesAllUser);
    cy.get(TOASTER).should('have.text', 'Write role required to generate data');
  });
});
