/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  closeFlyout,
  navigateToFlyoutJsonTab,
  navigateToFlyoutTableTab,
  openFlyout,
} from '../../tasks/threat_intelligence/common';
import {
  closeFieldBrowser,
  openFieldBrowser,
  openInspector,
} from '../../tasks/threat_intelligence/indicators';
import {
  BREADCRUMBS,
  DEFAULT_LAYOUT_TITLE,
  ENDING_BREADCRUMB,
  FIELD_BROWSER_MODAL,
  FIELD_SELECTOR,
  FILTERS_GLOBAL_CONTAINER,
  FLYOUT_JSON,
  FLYOUT_TABLE,
  FLYOUT_TABS,
  FLYOUT_TITLE,
  INDICATORS_TABLE,
  INDICATORS_TABLE_FEED_NAME_COLUMN_HEADER,
  INDICATORS_TABLE_FIRST_SEEN_COLUMN_HEADER,
  INDICATORS_TABLE_INDICATOR_NAME_COLUMN_HEADER,
  INDICATORS_TABLE_INDICATOR_TYPE_COLUMN_HEADER,
  INDICATORS_TABLE_LAST_SEEN_COLUMN_HEADER,
  INSPECTOR_PANEL,
  LEADING_BREADCRUMB,
  TIME_RANGE_PICKER,
} from '../../screens/threat_intelligence/indicators';
import { login } from '../../tasks/login';
import { visitWithTimeRange } from '../../tasks/navigation';

const THREAT_INTELLIGENCE = '/app/security/threat_intelligence/indicators';

describe('Indicators', { tags: '@ess' }, () => {
  before(() => {
    cy.task('esArchiverLoad', { archiveName: 'threat_intelligence_indicators_data' });
  });

  after(() => {
    cy.task('esArchiverUnload', { archiveName: 'threat_intelligence_indicators_data' });
  });

  describe('basic/simple url', () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(THREAT_INTELLIGENCE);
    });

    it('should render the basic page elements', () => {
      cy.log('should show breadcrumb');

      cy.get(BREADCRUMBS).should('be.visible');
      cy.get(LEADING_BREADCRUMB).should('have.text', 'Security');
      cy.get(ENDING_BREADCRUMB).should('have.text', 'Intelligence');

      cy.log('should show title');

      cy.get(DEFAULT_LAYOUT_TITLE).should('have.text', 'Indicators');

      cy.log('should show table');

      cy.get(INDICATORS_TABLE).should('exist');
      cy.get(INDICATORS_TABLE_INDICATOR_NAME_COLUMN_HEADER).should('exist');
      cy.get(INDICATORS_TABLE_INDICATOR_TYPE_COLUMN_HEADER).should('exist');
      cy.get(INDICATORS_TABLE_FEED_NAME_COLUMN_HEADER).should('exist');
      cy.get(INDICATORS_TABLE_FIRST_SEEN_COLUMN_HEADER).should('exist');
      cy.get(INDICATORS_TABLE_LAST_SEEN_COLUMN_HEADER).should('exist');

      cy.log('should show kql bar');

      cy.get(FILTERS_GLOBAL_CONTAINER).should('exist');
      cy.get(`${FILTERS_GLOBAL_CONTAINER} ${TIME_RANGE_PICKER}`).should('exist');
      cy.get(`${FIELD_SELECTOR}`).should('exist');

      cy.log('should show flyout');

      openFlyout(1);

      cy.get(FLYOUT_TITLE).should('contain', 'Indicator details');
      cy.get(FLYOUT_TABS).should('exist').children().should('have.length', 3);
      cy.get(FLYOUT_TABS).should('exist');

      navigateToFlyoutTableTab();

      cy.get(FLYOUT_TABLE).should('exist').and('contain.text', 'threat.indicator.type');

      navigateToFlyoutJsonTab();

      cy.get(FLYOUT_JSON).should('exist').and('contain.text', 'threat.indicator.type');

      closeFlyout();

      cy.log('should render proper field browser modal');

      openFieldBrowser();

      cy.get(FIELD_BROWSER_MODAL).should('be.visible');

      closeFieldBrowser();

      cy.log('should render the inspector flyout when inspector button is clicked');

      openInspector();

      cy.get(INSPECTOR_PANEL).contains('Indicators search requests');
    });
  });
});
