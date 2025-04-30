/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { GET_STARTED_URL } from '../../../urls/navigation';
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
});
