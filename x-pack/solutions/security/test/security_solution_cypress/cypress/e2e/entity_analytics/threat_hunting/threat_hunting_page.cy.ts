/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { ENTITY_ANALYTICS_THREAT_HUNTING_URL } from '../../../urls/navigation';
import {
  PAGE_TITLE,
  COMBINED_RISK_DONUT_CHART,
  ANOMALIES_PLACEHOLDER_PANEL,
  THREAT_HUNTING_ENTITIES_TABLE,
  TIMELINE_ICON,
} from '../../../screens/entity_analytics/threat_hunting';

describe(
  'Entity Threat Hunting page',
  {
    tags: ['@ess', '@serverless'],
  },
  () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: 'all_users' });
    });

    beforeEach(() => {
      login();
      visit(ENTITY_ANALYTICS_THREAT_HUNTING_URL);
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: 'all_users' });
    });

    it('renders page as expected', () => {
      cy.get(PAGE_TITLE).should('be.visible');
      cy.contains('Entity Threat Hunting').should('be.visible');
    });

    it('renders KQL search bar', () => {
      // The KQL bar should be present in the FiltersGlobal component
      cy.get('[data-test-subj="globalQueryBar"]').should('be.visible');
    });

    it('renders combined risk donut chart', () => {
      cy.get(COMBINED_RISK_DONUT_CHART).should('be.visible');
    });

    it('renders anomalies placeholder panel', () => {
      cy.get(ANOMALIES_PLACEHOLDER_PANEL).should('be.visible');
      cy.get(ANOMALIES_PLACEHOLDER_PANEL).contains('Anomalies explorer');
    });

    it('renders entities table', () => {
      cy.get(THREAT_HUNTING_ENTITIES_TABLE).should('be.visible');
    });

    it('displays timeline icon in entity name column', () => {
      // Wait for table to load and check for timeline icon
      cy.get(THREAT_HUNTING_ENTITIES_TABLE).should('be.visible');
      // The timeline icon should be present if there are entities and user has timeline privileges
      cy.get(TIMELINE_ICON).should('exist');
    });

    it('can interact with timeline icon', () => {
      cy.get(THREAT_HUNTING_ENTITIES_TABLE).should('be.visible');
      cy.get(TIMELINE_ICON).first().should('be.visible');
      cy.get(TIMELINE_ICON).first().click();
      // Timeline should open (this would need to be verified based on timeline implementation)
    });
  }
);
