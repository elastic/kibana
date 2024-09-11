/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INDICATORS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_ICON } from '../../../screens/threat_intelligence/timeline';
import {
  closeFlyout,
  navigateToFlyoutJsonTab,
  navigateToFlyoutTableTab,
  openFlyout,
  waitForViewToBeLoaded,
} from '../../../tasks/threat_intelligence/common';
import {
  clearQuery,
  closeFieldBrowser,
  enterQuery,
  navigateToIndicatorsTablePage,
  openFieldBrowser,
  openInspector,
} from '../../../tasks/threat_intelligence/indicators';
import {
  ADD_INTEGRATIONS_BUTTON,
  BREADCRUMBS,
  DEFAULT_LAYOUT_TITLE,
  EMPTY_STATE,
  ENDING_BREADCRUMB,
  FIELD_BROWSER,
  FIELD_BROWSER_MODAL,
  FIELD_SELECTOR,
  FIELD_SELECTOR_INPUT,
  FIELD_SELECTOR_LIST,
  FIELD_SELECTOR_TOGGLE_BUTTON,
  FILTERS_GLOBAL_CONTAINER,
  FLYOUT_JSON,
  FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCK_ITEM,
  FLYOUT_OVERVIEW_HIGHLIGHTED_FIELDS_TABLE,
  FLYOUT_TABLE,
  FLYOUT_TABS,
  FLYOUT_TITLE,
  INDICATOR_TYPE_CELL,
  INDICATORS_TABLE,
  INDICATORS_TABLE_FEED_NAME_CELL,
  INDICATORS_TABLE_FEED_NAME_COLUMN_HEADER,
  INDICATORS_TABLE_FIRST_SEEN_COLUMN_HEADER,
  INDICATORS_TABLE_INDICATOR_LAST_SEEN_CELL,
  INDICATORS_TABLE_INDICATOR_NAME_CELL,
  INDICATORS_TABLE_INDICATOR_NAME_COLUMN_HEADER,
  INDICATORS_TABLE_INDICATOR_TYPE_CELL,
  INDICATORS_TABLE_INDICATOR_TYPE_COLUMN_HEADER,
  INDICATORS_TABLE_LAST_SEEN_COLUMN_HEADER,
  INDICATORS_TABLE_ROW_CELL,
  INSPECTOR_BUTTON,
  INSPECTOR_PANEL,
  LEADING_BREADCRUMB,
  QUERY_INPUT,
  REFRESH_BUTTON,
  TABLE_CONTROLS,
  TIME_RANGE_PICKER,
} from '../../../screens/threat_intelligence/indicators';
import { login } from '../../../tasks/login';
import { visit, visitWithTimeRange } from '../../../tasks/navigation';

const URL = '/app/security/threat_intelligence/indicators';
const URL_WITH_CONTRADICTORY_FILTERS =
  '/app/security/threat_intelligence/indicators?indicators=(filterQuery:(language:kuery,query:%27%27),filters:!((%27$state%27:(store:appState),meta:(alias:!n,disabled:!f,index:%27%27,key:threat.indicator.type,negate:!f,params:(query:file),type:phrase),query:(match_phrase:(threat.indicator.type:file))),(%27$state%27:(store:appState),meta:(alias:!n,disabled:!f,index:%27%27,key:threat.indicator.type,negate:!f,params:(query:url),type:phrase),query:(match_phrase:(threat.indicator.type:url)))),timeRange:(from:now/d,to:now/d))';

describe('Single indicator', { tags: ['@ess'] }, () => {
  before(() => cy.task('esArchiverLoad', { archiveName: 'ti_indicators_data_single' }));

  after(() => cy.task('esArchiverUnload', { archiveName: 'ti_indicators_data_single' }));

  describe('basic/simple url', () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(URL);
      waitForViewToBeLoaded();
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
      cy.get(INDICATORS_TABLE_INDICATOR_NAME_CELL).should(
        'contain.text',
        'd86e656455f985357df3063dff6637f7f3b95bb27d1769a6b88c7adecaf7763f'
      );
      cy.get(INDICATORS_TABLE_INDICATOR_TYPE_COLUMN_HEADER).should('exist');
      cy.get(INDICATORS_TABLE_INDICATOR_TYPE_CELL).should('contain.text', 'file');
      cy.get(INDICATORS_TABLE_FEED_NAME_COLUMN_HEADER).should('exist');
      cy.get(INDICATORS_TABLE_FEED_NAME_CELL).should('contain.text', 'AbuseCH Malware');
      cy.get(INDICATORS_TABLE_FIRST_SEEN_COLUMN_HEADER).should('exist');
      cy.get(INDICATORS_TABLE_LAST_SEEN_COLUMN_HEADER).should('exist');
      cy.get(INDICATORS_TABLE_INDICATOR_LAST_SEEN_CELL).should('contain.text', '-');

      cy.log('should show kql bar');

      cy.get(FILTERS_GLOBAL_CONTAINER).should('exist');
      cy.get(`${FILTERS_GLOBAL_CONTAINER} ${TIME_RANGE_PICKER}`).should('exist');
      cy.get(`${FIELD_SELECTOR}`).should('exist');

      cy.log('should show flyout');

      openFlyout();

      cy.get(FLYOUT_TITLE).should('contain', 'Indicator details');
      cy.get(FLYOUT_TABS).should('exist').children().should('have.length', 3);
      cy.get(FLYOUT_TABS).should('exist');

      closeFlyout();

      cy.log('should render proper field browser modal');

      openFieldBrowser();

      cy.get(FIELD_BROWSER_MODAL).should('be.visible');

      closeFieldBrowser();

      cy.log('should render the inspector flyout when inspector button is clicked');

      openInspector();

      cy.get(INSPECTOR_PANEL).contains('Indicators search requests');
    });

    it('should render flyout content', () => {
      openFlyout();

      cy.log('should show the high level blocks');

      cy.get(FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCK_ITEM)
        .eq(0)
        .should('contain.text', 'Feed')
        .and('contain.text', 'AbuseCH Malware');
      cy.get(FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCK_ITEM)
        .eq(1)
        .should('contain.text', 'Indicator type')
        .and('contain.text', 'file');
      cy.get(FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCK_ITEM)
        .eq(2)
        .should('contain.text', 'TLP Marking-')
        .and('contain.text', '-');
      cy.get(FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCK_ITEM)
        .eq(3)
        .should('contain.text', 'Confidence')
        .and('contain.text', '-');

      cy.log('should show the highlighted fields table');

      cy.get(FLYOUT_OVERVIEW_HIGHLIGHTED_FIELDS_TABLE)
        .should('contain.text', 'threat.indicator.file.hash.md5')
        .and('contain.text', 'a7f997be65f62fdbe5ec076f0fe207f7');
      cy.get(FLYOUT_OVERVIEW_HIGHLIGHTED_FIELDS_TABLE)
        .should('contain.text', 'threat.indicator.file.type')
        .and('contain.text', 'zip');

      cy.log('should render the table tab correctly');

      navigateToFlyoutTableTab();

      cy.get(FLYOUT_TABLE).should('contain.text', 'threat.indicator.type');
      cy.get(FLYOUT_TABLE)
        .should('contain.text', '@timestamp')
        .and('contain.text', 'Jun 2, 2022 @ 13:29:47.677');
      cy.get(FLYOUT_TABLE)
        .should('contain.text', 'threat.indicator.file.type')
        .and('contain.text', 'zip');

      cy.log('should render the json tab correctly');

      navigateToFlyoutJsonTab();

      cy.get(FLYOUT_JSON).should('contain.text', 'threat.indicator.type');
      cy.get(FLYOUT_JSON).should('contain.text', '"@timestamp": "2022-06-02T13:29:47.677Z",');
    });
  });

  describe('No items match search criteria', () => {
    beforeEach(() => {
      login();
      cy.visit(URL_WITH_CONTRADICTORY_FILTERS);
    });

    it('should handle no match search criteria', () => {
      cy.log('not display the table when contradictory filters are set');

      cy.get(FLYOUT_TABLE).should('not.exist');
      cy.get(EMPTY_STATE).should('exist').and('contain.text', 'No results');

      cy.log('have the default selected field, then update when user selects');

      const threatFeedName = 'threat.feed.name';
      cy.get(`${FIELD_SELECTOR_INPUT}`).should('have.value', threatFeedName);

      const timestamp: string = '@timestamp';
      cy.get(`${FIELD_SELECTOR_TOGGLE_BUTTON}`).should('exist').click();
      cy.get(`${FIELD_SELECTOR_LIST}`).should('exist').contains(timestamp);
    });
  });

  describe('Field browser', () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(URL);
      waitForViewToBeLoaded();
    });

    it('should render proper modal window', () => {
      cy.get('[data-test-subj="tiIndicatorsTable"]').within(() => {
        cy.get(FIELD_BROWSER).last().click();
      });

      cy.get(FIELD_BROWSER_MODAL).should('be.visible');
    });
  });

  describe('Request inspector', () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(URL);
      waitForViewToBeLoaded();
    });

    it('when inspector button is clicked it should render the inspector flyout', () => {
      cy.get(INSPECTOR_BUTTON).last().click();

      cy.get(INSPECTOR_PANEL).contains('Indicators search requests');
    });
  });

  describe('Add integrations', () => {
    beforeEach(() => {
      login();
      visit(URL);
    });

    it('when the global header add integrations button is clicked it should navigate to the Integrations page with Threat Intelligence category selected', () => {
      cy.get(ADD_INTEGRATIONS_BUTTON).click();

      cy.url().should('include', 'threat_intel');
    });
  });
});

describe('Multiple indicators', { tags: ['@ess'] }, () => {
  before(() => cy.task('esArchiverLoad', { archiveName: 'ti_indicators_data_multiple' }));

  after(() => cy.task('esArchiverUnload', { archiveName: 'ti_indicators_data_multiple' }));

  describe('Indicator page search', () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(URL);
      waitForViewToBeLoaded();
    });

    it('should handle all search actions', () => {
      cy.log('should narrow the results to url indicators when respective KQL search is executed');

      enterQuery('threat.indicator.type: "url"{enter}');

      // Check if query results are narrowed after search
      cy.get(INDICATOR_TYPE_CELL).should('not.contain.text', 'file');

      clearQuery();
      enterQuery('threat.indicator.type: "file"{enter}');

      cy.get(INDICATOR_TYPE_CELL).should('not.contain.text', 'url');

      clearQuery();

      cy.log('should go to the 2nd page');

      navigateToIndicatorsTablePage(1);

      cy.get(TABLE_CONTROLS).should('contain.text', 'Showing 26-26 of');

      cy.log('should go to page 1 when search input is cleared');

      cy.get(QUERY_INPUT).should('exist').focus();
      cy.get(QUERY_INPUT).clear();
      cy.get(QUERY_INPUT).type('{enter}');
      cy.get(TABLE_CONTROLS).should('contain.text', 'Showing 1-25 of');

      cy.log('should reload the data when refresh button is pressed');

      cy.intercept(/bsearch/).as('search');
      cy.get(REFRESH_BUTTON).should('exist').click();
      cy.wait('@search');
    });
  });
});

describe('Invalid Indicators', { tags: ['@ess'] }, () => {
  before(() => cy.task('esArchiverLoad', { archiveName: 'ti_indicators_data_invalid' }));

  after(() => cy.task('esArchiverUnload', { archiveName: 'ti_indicators_data_invalid' }));

  describe('verify the grid loads even with missing fields', () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(URL);
      waitForViewToBeLoaded();
    });

    it('should display data grid despite the missing fields', () => {
      cy.get(INDICATORS_TABLE).should('exist');

      // there are 19 documents in the x-pack/test/security_solution_cypress/es_archives/ti_indicators_data_invalid/data.json
      const documentsNumber = 22;
      cy.get(INDICATORS_TABLE_ROW_CELL).should('have.length.gte', documentsNumber);

      // the last 3 documents have no hash so the investigate in timeline button isn't rendered
      cy.get(INDICATORS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_ICON).should(
        'have.length',
        documentsNumber - 4
      );

      // we should have 21 documents plus the header
      cy.get(INDICATORS_TABLE_INDICATOR_NAME_CELL).should('have.length', documentsNumber + 1);

      // this entry has no hash to we show - in the Indicator Name column
      cy.get(INDICATORS_TABLE_INDICATOR_NAME_CELL)
        .eq(documentsNumber - 3)
        .should('contain.text', '-');

      // this entry is missing the file key entirely
      cy.get(INDICATORS_TABLE_INDICATOR_NAME_CELL)
        .eq(documentsNumber - 2)
        .should('contain.text', '-');

      // this entry is missing the type field
      cy.get(INDICATORS_TABLE_INDICATOR_NAME_CELL)
        .eq(documentsNumber - 1)
        .should('contain.text', '-');
      cy.get(INDICATORS_TABLE_INDICATOR_TYPE_CELL)
        .eq(documentsNumber - 1)
        .should('contain.text', '-');

      // this entry is missing the type field
      cy.get(INDICATORS_TABLE_INDICATOR_NAME_CELL).last().should('contain.text', '-');
      cy.get(INDICATORS_TABLE_INDICATOR_TYPE_CELL).last().should('contain.text', '-');
    });
  });
});

describe('Missing mappings', { tags: ['@ess'] }, () => {
  before(() => cy.task('esArchiverLoad', { archiveName: 'ti_indicators_data_no_mappings' }));

  after(() => cy.task('esArchiverUnload', { archiveName: 'ti_indicators_data_no_mappings' }));

  describe('verify the grid loads even with missing mappings and missing fields', () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(URL);
      waitForViewToBeLoaded();
    });

    it('should display data grid despite the missing mappings and missing fields', () => {
      // there are 2 documents in the x-pack/test/threat_intelligence_cypress/es_archives/threat_intelligence/missing_mappings_indicators_data/data.json
      const documentsNumber = 2;
      cy.get(INDICATORS_TABLE_ROW_CELL).should('have.length.gte', documentsNumber);

      // we should have 2 documents plus the header
      cy.get(INDICATORS_TABLE_INDICATOR_NAME_CELL).should('have.length', documentsNumber + 1);
    });
  });
});
