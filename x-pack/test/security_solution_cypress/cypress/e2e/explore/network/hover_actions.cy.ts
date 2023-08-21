/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../tags';

import { TOP_N_CONTAINER } from '../../../screens/network/flows';
import { GLOBAL_SEARCH_BAR_FILTER_ITEM } from '../../../screens/search_bar';
import { DATA_PROVIDERS } from '../../../screens/timeline';

import { login, visit } from '../../../tasks/login';
import { NETWORK_URL } from '../../../urls/navigation';
import {
  clickOnAddToTimeline,
  clickOnCopyValue,
  clickOnFilterIn,
  clickOnFilterOut,
  clickOnShowTopN,
  mouseoverOnToOverflowItem,
  openHoverActions,
} from '../../../tasks/network/flows';
import { openTimelineUsingToggle } from '../../../tasks/security_main';

const testDomain = 'myTest';

// tracked by https://github.com/elastic/kibana/issues/161874
describe.skip('Hover actions', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
  const onBeforeLoadCallback = (win: Cypress.AUTWindow) => {
    // avoid cypress being held by windows prompt and timeout
    cy.stub(win, 'prompt').returns(true);
  };

  before(() => {
    cy.task('esArchiverLoad', 'network');
  });

  after(() => {
    cy.task('esArchiverUnload', 'network');
  });

  beforeEach(() => {
    login();
    visit(NETWORK_URL, { onBeforeLoad: onBeforeLoadCallback });
    openHoverActions();
    mouseoverOnToOverflowItem();
  });

  it('Adds global filter - filter in', () => {
    clickOnFilterIn();

    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should('have.text', `destination.domain: ${testDomain}`);
  });

  it('Adds global filter - filter out', () => {
    clickOnFilterOut();
    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should(
      'contains.text',
      `NOT destination.domain: ${testDomain}`
    );
  });

  it('Adds to timeline', () => {
    const DATA_PROVIDER_ITEM_NUMBER = 1;
    clickOnAddToTimeline();
    openTimelineUsingToggle();

    cy.get(DATA_PROVIDERS).should('have.length', DATA_PROVIDER_ITEM_NUMBER);
    cy.get(DATA_PROVIDERS).should('have.text', `destination.domain: "${testDomain}"`);
  });

  it('Show topN', () => {
    clickOnShowTopN();
    cy.get(TOP_N_CONTAINER).should('exist').should('contain.text', 'Top destination.domain');
  });

  it('Copy value', () => {
    cy.document().then((doc) => cy.spy(doc, 'execCommand').as('execCommand'));

    clickOnCopyValue();

    cy.get('@execCommand').should('have.been.calledOnceWith', 'copy');
  });
});
