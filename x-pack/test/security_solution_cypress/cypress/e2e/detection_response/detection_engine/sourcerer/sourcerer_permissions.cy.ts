/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '@kbn/security-solution-plugin/common/test';

import { TOASTER } from '../../../../screens/configure_cases';
import { postDataView } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { hostsUrl } from '../../../../urls/navigation';

const dataViews = ['auditbeat-*,fakebeat-*', 'auditbeat-*,*beat*,siem-read*,.kibana*,fakebeat-*'];

describe('Sourcerer permissions', { tags: ['@ess', '@skipInServerless'] }, () => {
  beforeEach(() => {
    dataViews.forEach((dataView: string) => postDataView(dataView));
  });

  it(`role Hunter No actions  shows error when user does not have permissions`, () => {
    login(ROLES.hunter_no_actions);
    visit(hostsUrl('allHosts'));
    cy.get(TOASTER).should('have.text', 'Write role required to generate data');
  });
});
