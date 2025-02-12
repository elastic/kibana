/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { visitWithTimeRange } from '../../../tasks/navigation';
import {
  closeFlyout,
  navigateToBlocklist,
  navigateToThreatIntelligence,
  openFlyout,
  openFlyoutTakeAction,
  openIndicatorsTableMoreActions,
  waitForViewToBeLoaded,
} from '../../../tasks/threat_intelligence/common';
import {
  fillBlocklistForm,
  openAddToBlockListFlyoutFromTable,
  openAddToBlocklistFromFlyout,
} from '../../../tasks/threat_intelligence/blocklist';
import { login } from '../../../tasks/login';
import {
  BLOCK_LIST_VALUE_INPUT,
  FLYOUT_ADD_TO_BLOCK_LIST_ITEM,
  INDICATORS_TABLE_ADD_TO_BLOCK_LIST_BUTTON_ICON,
  SAVED_BLOCK_LIST_DESCRIPTION,
  SAVED_BLOCK_LIST_NAME,
} from '../../../screens/threat_intelligence/blocklist';

const URL = '/app/security/threat_intelligence/indicators';

const FIRST_BLOCK_LIST_NEW_NAME = 'first blocklist entry';
const FIRST_BLOCK_LIST_NEW_DESCRIPTION = 'the first description';
const SECOND_BLOCK_LIST_NEW_NAME = 'second blocklist entry';
const SECOND_BLOCK_LIST_NEW_DESCRIPTION = 'the second description';

describe('Block list with invalid indicators', { tags: ['@ess'] }, () => {
  before(() => cy.task('esArchiverLoad', { archiveName: 'ti_indicators_data_invalid' }));

  after(() => cy.task('esArchiverUnload', { archiveName: 'ti_indicators_data_invalid' }));

  beforeEach(() => {
    login();
    visitWithTimeRange(URL);
    waitForViewToBeLoaded();
  });

  it('should disabled blocklist in the indicators table context menu item and flyout context menu items', () => {
    openIndicatorsTableMoreActions(3);
    cy.get(INDICATORS_TABLE_ADD_TO_BLOCK_LIST_BUTTON_ICON).should('be.disabled');

    openFlyout(3);
    openFlyoutTakeAction();
    cy.get(FLYOUT_ADD_TO_BLOCK_LIST_ITEM).should('be.disabled');
  });
});

describe('Block list interactions', { tags: ['@ess'] }, () => {
  before(() => cy.task('esArchiverLoad', { archiveName: 'ti_indicators_data_multiple' }));

  after(() => cy.task('esArchiverUnload', { archiveName: 'ti_indicators_data_multiple' }));

  beforeEach(() => {
    login();
    visitWithTimeRange(URL);
    waitForViewToBeLoaded();
  });

  it('should add to block list from the indicators table and from flyout', () => {
    // first indicator is a valid indicator for add to blocklist feature
    const firstIndicatorId = '7cbf47ef916aa02a1b39cad40dfe71ea121d8d5b36d5a13fdec5977a8dcb4550';

    cy.log('add to blocklist from the table more action menu');

    openIndicatorsTableMoreActions();
    openAddToBlockListFlyoutFromTable();

    cy.get(BLOCK_LIST_VALUE_INPUT(firstIndicatorId));

    fillBlocklistForm(FIRST_BLOCK_LIST_NEW_NAME, FIRST_BLOCK_LIST_NEW_DESCRIPTION);
    navigateToBlocklist();

    cy.get(SAVED_BLOCK_LIST_NAME).eq(0).should('have.text', FIRST_BLOCK_LIST_NEW_NAME);
    cy.get(SAVED_BLOCK_LIST_DESCRIPTION)
      .eq(0)
      .should('have.text', FIRST_BLOCK_LIST_NEW_DESCRIPTION);

    navigateToThreatIntelligence();

    // second indicator is a valid indicator for add to blocklist feature
    const secondIndicatorId = 'd4ba36cfa7e4191199836b228f6d79bd74e86793bc183563b78591f508b066ed';

    cy.log('add to blocklist from the flyout');

    openFlyout(1);
    openFlyoutTakeAction();
    openAddToBlocklistFromFlyout();

    cy.get(BLOCK_LIST_VALUE_INPUT(secondIndicatorId));

    fillBlocklistForm(SECOND_BLOCK_LIST_NEW_NAME, SECOND_BLOCK_LIST_NEW_DESCRIPTION);
    closeFlyout();
    navigateToBlocklist();

    cy.get(SAVED_BLOCK_LIST_NAME).eq(0).should('have.text', SECOND_BLOCK_LIST_NEW_NAME);
    cy.get(SAVED_BLOCK_LIST_DESCRIPTION)
      .eq(0)
      .should('have.text', SECOND_BLOCK_LIST_NEW_DESCRIPTION);
  });
});
