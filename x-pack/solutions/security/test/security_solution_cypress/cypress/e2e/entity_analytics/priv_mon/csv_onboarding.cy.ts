/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../../helpers/common';
import { ONBOARDING_CALLOUT } from '../../../screens/privileged_user_monitoring';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import {
  clickFileUploaderAssignButton,
  deletePrivMonEngine,
  openFilePicker,
  uploadCSVFile,
} from '../../../tasks/privileged_user_monitoring';
import { ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_URL } from '../../../urls/navigation';

describe(
  'Privileged User Monitoring - CSV onboarding',
  {
    tags: ['@ess'],
  },
  () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: 'linux_process' });
      deletePrivMonEngine(); // Just in case another test left it behind
    });

    beforeEach(() => {
      login();
    });

    afterEach(() => {
      deletePrivMonEngine();
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: 'linux_process' });
    });

    it('uploads a valid CSV file', () => {
      visit(ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_URL);

      openFilePicker();
      uploadCSVFile('valid_file.txt', 'tet1,testLabel');
      clickFileUploaderAssignButton();

      cy.get(ONBOARDING_CALLOUT).should(
        'contain.text',
        'Privileged user monitoring set up: 1 user added'
      );
    });

    it('it validates an invalid CSV file', () => {
      visit(ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_URL);

      openFilePicker();
      uploadCSVFile('invalid_file.txt', 'invalid,line,format');

      cy.get(getDataTestSubjectSelector('privileged-user-monitoring-validation-step')).should(
        'contain.text',
        "1 row is invalid and won't be added"
      );
    });
  }
);
