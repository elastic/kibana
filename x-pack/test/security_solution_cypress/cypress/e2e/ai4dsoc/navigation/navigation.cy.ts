/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import {
  ASSETS_URL,
  ALERTS_URL,
  ASSET_INVENTORY_URL,
  CREATE_RULE_URL,
  CSP_DASHBOARD_URL,
  CSP_BENCHMARKS_URL,
  CSP_FINDINGS_URL,
  CSP_VULNERABILITIES_URL,
  DASHBOARDS_URL,
  ENTITY_ANALYTICS_MANAGEMENT_URL,
  ENTITY_ANALYTICS_ENTITY_STORE_URL,
  EXPLORE_URL,
  GET_STARTED_URL,
  INVESTIGATIONS_URL,
  HOSTS_URL,
  NETWORK_URL,
  NOTES_URL,
  OVERVIEW_URL,
  TIMELINES_URL,
  USERS_URL,
} from '../../../urls/navigation';
import { AI_SOC_NAVIGATION } from '../../../screens/ai_soc';

const visibleLinks = ['alert_summary', 'attack_discovery', 'cases', 'configurations', 'discover'];
const notVisibleLinks = [
  'securityGroup:rules',
  'alerts',
  'cloud_security_posture-findings',
  'threat_intelligence',
  'securityGroup:explore',
  'securityGroup:assets',
  'securityGroup:machine_learning',
  'alerts',
  'rules',
];

const redirectedLinks = [
  ALERTS_URL,
  ASSETS_URL,
  ASSET_INVENTORY_URL,
  CREATE_RULE_URL,
  CSP_DASHBOARD_URL,
  CSP_FINDINGS_URL,
  CSP_VULNERABILITIES_URL,
  CSP_BENCHMARKS_URL,
  DASHBOARDS_URL,
  ENTITY_ANALYTICS_MANAGEMENT_URL,
  ENTITY_ANALYTICS_ENTITY_STORE_URL,
  EXPLORE_URL,
  HOSTS_URL,
  INVESTIGATIONS_URL,
  NETWORK_URL,
  NOTES_URL,
  OVERVIEW_URL,
  TIMELINES_URL,
  USERS_URL,
];

describe('AI4dSoC Navigation', { tags: '@serverless' }, () => {
  beforeEach(() => {
    login('admin');
    visit(GET_STARTED_URL);
  });

  describe('renders links correctly', () => {
    it('should contain the specified links', () => {
      cy.get(AI_SOC_NAVIGATION)
        .should('exist')
        .within(() => {
          visibleLinks.map((link) => {
            cy.getByTestSubjContains(`nav-item-id-${link}`).should('exist');
          });

          notVisibleLinks.map((link) => {
            cy.getByTestSubjContains(`nav-item-id-${link}`).should('not.exist');
          });
        });
    });
  });

  describe('renders pages within links correctly', () => {
    it('should show the correct page for visible links when navigating', () => {
      cy.get(AI_SOC_NAVIGATION).should('exist');

      visibleLinks.forEach((link) => {
        cy.getByTestSubjContains(`nav-item-id-${link}`).click();
        cy.url().should('include', `/${link}`);
        cy.getByTestSubjContains(`nav-item-id-${link}`).click();

        if (link === 'alert_summary') {
          cy.getByTestSubjContains('alert-summary-landing-page-prompt');
        }

        if (link === 'attack_discovery') {
          cy.getByTestSubjContains('attackDiscoveryPageTitle').contains('Attack discovery');
        }

        if (link === 'cases') {
          cy.getByTestSubjContains('header-page-title').contains('Cases');
        }

        if (link === 'configurations') {
          cy.url().should('include', `/${link}/integrations`);
          cy.get('.euiTab').then((tabs) => {
            const tabNames = Array.from(tabs).map((tab) => tab.innerText);
            expect(tabNames).to.deep.equal(['Integrations', 'Rules', 'AI settings']);
          });
        }

        if (link === 'discover') {
          cy.getByTestSubjContains('discoverSavedSearchTitle').contains(
            'Discover - Search not yet saved'
          );
        }
      });
    });
  });

  describe('Redirected pages', () => {
    it('should redirect to the "get started page"', () => {
      redirectedLinks.forEach((link) => {
        cy.visit(link);
        cy.url().should('include', GET_STARTED_URL);
      });
    });
  });
});
