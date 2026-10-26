/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  openFlyout,
  openFlyoutTakeAction,
  openIndicatorsTableMoreActions,
  visitIndicatorsWithTimeRange,
} from '../../../tasks/threat_intelligence/common';
import { deleteCases } from '../../../tasks/api_calls/cases';
import {
  createNewCaseFromTI,
  navigateToCaseViaToaster,
  openAddToExistingCaseFlyoutFromTable,
  openAddToExistingCaseFromFlyout,
  openAddToNewCaseFlyoutFromTable,
  openAddToNewCaseFromFlyout,
  selectExistingCase,
} from '../../../tasks/threat_intelligence/cases';
import { CASE_COMMENT_INDICATOR_ATTACHMENT } from '../../../screens/threat_intelligence/cases';
import { login } from '../../../tasks/login';

describe('Cases interactions', { tags: ['@ess'] }, () => {
  before(() => cy.task('esArchiverLoad', { archiveName: 'ti_indicators_data_single' }));

  after(() => cy.task('esArchiverUnload', { archiveName: 'ti_indicators_data_single' }));

  beforeEach(() => {
    login();
    // this suite attaches to "the case I just created" by picking the first row of the existing
    // cases modal, so it needs to start from a stack with no cases left over from a previous run
    deleteCases();
    visitIndicatorsWithTimeRange();
  });

  it('should add to new case and to existing case from the indicators table and the flyout', () => {
    cy.log('should add to new case when clicking on the button in the indicators table');

    openIndicatorsTableMoreActions();
    openAddToNewCaseFlyoutFromTable();
    createNewCaseFromTI();
    navigateToCaseViaToaster();

    cy.get(CASE_COMMENT_INDICATOR_ATTACHMENT)
      .should('exist')
      .and('contain.text', 'added an indicator of compromise')
      .and('contain.text', 'Indicator name')
      .and('contain.text', 'Indicator type')
      .and('contain.text', 'Feed name');

    visitIndicatorsWithTimeRange();

    cy.log('should add to existing case when clicking on the button in the indicators table');

    openIndicatorsTableMoreActions();
    openAddToExistingCaseFlyoutFromTable();
    selectExistingCase();
    navigateToCaseViaToaster();

    cy.get(CASE_COMMENT_INDICATOR_ATTACHMENT)
      .should('exist')
      .and('contain.text', 'added an indicator of compromise')
      .and('contain.text', 'Indicator name')
      .and('contain.text', 'Indicator type')
      .and('contain.text', 'Feed name');

    visitIndicatorsWithTimeRange();

    cy.log('should add to new case when clicking on the button in the indicators flyout');

    openFlyout();
    openFlyoutTakeAction();
    openAddToNewCaseFromFlyout();
    createNewCaseFromTI();

    navigateToCaseViaToaster();
    cy.get(CASE_COMMENT_INDICATOR_ATTACHMENT)
      .should('exist')
      .and('contain.text', 'added an indicator of compromise')
      .and('contain.text', 'Indicator name')
      .and('contain.text', 'Indicator type')
      .and('contain.text', 'Feed name');

    visitIndicatorsWithTimeRange();

    cy.log('should add to existing case when clicking on the button in the indicators flyout');

    openFlyout();
    openFlyoutTakeAction();
    openAddToExistingCaseFromFlyout();
    selectExistingCase();

    navigateToCaseViaToaster();
    cy.get(CASE_COMMENT_INDICATOR_ATTACHMENT)
      .should('exist')
      .and('contain.text', 'added an indicator of compromise')
      .and('contain.text', 'Indicator name')
      .and('contain.text', 'Indicator type')
      .and('contain.text', 'Feed name');
  });
});
