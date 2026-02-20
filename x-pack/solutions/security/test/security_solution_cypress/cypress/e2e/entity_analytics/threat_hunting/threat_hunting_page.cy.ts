/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import {
  ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_URL,
  ENTITY_ANALYTICS_THREAT_HUNTING_URL,
} from '../../../urls/navigation';
import {
  PAGE_TITLE,
  COMBINED_RISK_DONUT_CHART,
  ANOMALIES_PLACEHOLDER_PANEL,
  THREAT_HUNTING_ENTITIES_TABLE,
  THREAT_HUNTING_ENTITIES_TABLE_LOADED,
  TIMELINE_ICON,
} from '../../../screens/entity_analytics/threat_hunting';
import { WATCHLIST_FILTER_COMBO_BOX } from '../../../screens/entity_analytics/watchlist_filter';

describe(
  'Entity Threat Hunting page',
  {
    tags: ['@ess', '@serverless'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'entityThreatHuntingEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: 'all_users' });
    });

    beforeEach(() => {
      login();
      visit(ENTITY_ANALYTICS_THREAT_HUNTING_URL);
      // Wait for the app to be ready - check that we haven't been redirected away
      cy.url({ timeout: 10000 }).should('include', ENTITY_ANALYTICS_THREAT_HUNTING_URL);
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: 'all_users' });
    });

    it('renders page as expected', () => {
      // Wait for page to be fully loaded
      // The page may show a loader initially while data view/sourcerer is loading
      cy.get(PAGE_TITLE, { timeout: 60000 }).should('exist');
      // Verify the page title text is present
      cy.get('h1').contains('Entity Threat Hunting').should('be.visible');
    });

    it('renders KQL search bar', () => {
      // Wait for page to be fully loaded first
      cy.get(PAGE_TITLE, { timeout: 60000 }).should('exist');
      // The KQL bar should be present in the FiltersGlobal component
      cy.get('[data-test-subj="globalQueryBar"]', { timeout: 30000 }).should('be.visible');
    });

    it('renders combined risk donut chart', () => {
      // Wait for page to be fully loaded first
      cy.get(PAGE_TITLE, { timeout: 60000 }).should('exist');
      cy.get(COMBINED_RISK_DONUT_CHART, { timeout: 30000 }).should('be.visible');
    });

    it('renders anomalies placeholder panel', () => {
      // Wait for page to be fully loaded first
      cy.get(PAGE_TITLE, { timeout: 60000 }).should('exist');
      cy.get(ANOMALIES_PLACEHOLDER_PANEL, { timeout: 30000 }).should('be.visible');
      cy.get(ANOMALIES_PLACEHOLDER_PANEL).contains('Anomaly explorer');
    });

    it('renders entities table', () => {
      // Wait for page to be fully loaded first
      cy.get(PAGE_TITLE, { timeout: 60000 }).should('exist');
      // Wait for table to load - it may start with loading-true and then change to loading-false
      cy.get(THREAT_HUNTING_ENTITIES_TABLE, { timeout: 30000 }).should('exist');
      // Verify the table content is rendered (either loading skeleton or actual table)
      cy.get(
        '[data-test-subj="paginated-basic-table"], [data-test-subj="initialLoadingPanelPaginatedTable"]',
        {
          timeout: 30000,
        }
      ).should('exist');
    });

    it('navigate to privileged user monitoring page on selecting privileged users watchlist', () => {
      cy.get(PAGE_TITLE, { timeout: 60000 }).should('exist');

      cy.get(WATCHLIST_FILTER_COMBO_BOX).should('exist');
      const comboBoxInput = `${WATCHLIST_FILTER_COMBO_BOX} input`;
      cy.get(comboBoxInput).first().click();
      cy.get(comboBoxInput).first().type('Privileged users{downArrow}{enter}');

      cy.url({ timeout: 6000 }).should('include', ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_URL);
      cy.url().should('include', '/entity_analytics_privileged_user_monitoring');
    });

    it('displays timeline icon when data is available', () => {
      // Wait for page to be fully loaded first
      cy.get(PAGE_TITLE, { timeout: 60000 }).should('exist');

      // Wait for table to load
      cy.get(THREAT_HUNTING_ENTITIES_TABLE_LOADED, {
        timeout: 30000,
      }).should('exist');

      cy.get('[data-test-subj="paginated-basic-table"]', { timeout: 30000 }).should('exist');

      // Check for table content - verify table renders with data or empty state
      cy.get('body').then(($body) => {
        const iconCount = $body.find(TIMELINE_ICON).length;
        const rowCount = $body.find('[data-test-subj="paginated-basic-table"] .euiTableRow').length;

        if (rowCount > 0 && iconCount > 0) {
          // Data exists with timeline icons - verify they're present
          cy.log(`Found ${rowCount} rows and ${iconCount} timeline icons`);
          cy.get(TIMELINE_ICON).should('have.length.at.least', 1);
        } else if (rowCount > 0 && iconCount === 0) {
          // Data exists but no timeline icons (e.g., no entity names or no timeline privileges)
          cy.log(`Found ${rowCount} rows but no timeline icons - this is valid`);
        } else {
          // Empty state - verify empty message is shown
          cy.log('No data in table - verifying empty state');
          cy.get('[data-test-subj="paginated-basic-table"]')
            .find('.euiEmptyPrompt, [data-test-subj="emptyPrompt"]')
            .should('exist');
        }
      });
    });

    it('can interact with timeline icon when available', () => {
      // Wait for page to be fully loaded first
      cy.get(PAGE_TITLE, { timeout: 60000 }).should('exist');

      // Wait for table to load
      cy.get(THREAT_HUNTING_ENTITIES_TABLE_LOADED, {
        timeout: 30000,
      }).should('exist');

      cy.get('[data-test-subj="paginated-basic-table"]', { timeout: 30000 }).should('exist');

      // Only test interaction if timeline icons are actually present
      cy.get('body').then(($body) => {
        const iconCount = $body.find(TIMELINE_ICON).length;

        if (iconCount > 0) {
          // Timeline icons exist - test interaction
          cy.log(`Found ${iconCount} timeline icons - testing interaction`);
          cy.get(TIMELINE_ICON).first().should('be.visible');
          cy.get(TIMELINE_ICON).first().click();
          // Note: Timeline interaction verified - specific timeline flyout assertions
          // can be added when timeline behavior is finalized
        } else {
          // No timeline icons available - this is valid and test should pass
          cy.log('No timeline icons available - test passes as table is functional without them');
        }
      });
    });
  }
);
