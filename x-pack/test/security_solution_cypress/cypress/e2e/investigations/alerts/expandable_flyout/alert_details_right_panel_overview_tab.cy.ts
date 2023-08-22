/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tag } from '../../../../tags';

import { collapseDocumentDetailsExpandableFlyoutLeftSection } from '../../../../tasks/expandable_flyout/alert_details_right_panel';
import { DOCUMENT_DETAILS_FLYOUT_INVESTIGATION_TAB_CONTENT } from '../../../../screens/expandable_flyout/alert_details_left_panel_investigation_tab';
import {
  createNewCaseFromExpandableFlyout,
  expandFirstAlertExpandableFlyout,
} from '../../../../tasks/expandable_flyout/common';
import {
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ABOUT_SECTION_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ABOUT_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ANALYZER_PREVIEW_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_DETAILS,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_TITLE,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_OPEN_RULE_PREVIEW_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_DETAILS,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_HEADER_TITLE,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_VALUES,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_ENTITIES_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_ENTITIES_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_PREVALENCE_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_PREVALENCE_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_PREVALENCE_VALUES,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_THREAT_INTELLIGENCE_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_THREAT_INTELLIGENCE_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_THREAT_INTELLIGENCE_VALUES,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_GUIDE_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_SECTION_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_MITRE_ATTACK_DETAILS,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_MITRE_ATTACK_TITLE,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_REASON_DETAILS,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_REASON_TITLE,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_SESSION_PREVIEW_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_TABLE_FIELD_CELL,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_TABLE_VALUE_CELL,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_RESPONSE_SECTION_EMPTY_RESPONSE,
} from '../../../../screens/expandable_flyout/alert_details_right_panel_overview_tab';
import {
  navigateToCorrelationsDetails,
  clickInvestigationGuideButton,
  navigateToPrevalenceDetails,
  toggleOverviewTabAboutSection,
  toggleOverviewTabInsightsSection,
  toggleOverviewTabInvestigationSection,
  toggleOverviewTabResponseSection,
  toggleOverviewTabVisualizationsSection,
} from '../../../../tasks/expandable_flyout/alert_details_right_panel_overview_tab';
import { cleanKibana } from '../../../../tasks/common';
import { login, visit } from '../../../../tasks/login';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';
import {
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_ENTITIES_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS,
} from '../../../../screens/expandable_flyout/alert_details_left_panel_entities_tab';

describe(
  'Alert details expandable flyout right panel overview tab',
  { tags: [tag.ESS, tag.BROKEN_IN_SERVERLESS] },
  () => {
    const rule = getNewRule();

    beforeEach(() => {
      cleanKibana();
      login();
      createRule(rule);
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlertExpandableFlyout();
    });

    describe('about section', () => {
      it('should display about section', () => {
        cy.log('header and content');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ABOUT_SECTION_HEADER)
          .should('be.visible')
          .and('have.text', 'About');
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ABOUT_SECTION_CONTENT).should('be.visible');

        cy.log('description');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_TITLE)
          .should('be.visible')
          .and('contain.text', 'Rule description');
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_TITLE)
          .should('be.visible')
          .within(() => {
            cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_OPEN_RULE_PREVIEW_BUTTON)
              .should('be.visible')
              .and('have.text', 'Rule summary');
          });
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_DETAILS)
          .should('be.visible')
          .and('have.text', rule.description);

        cy.log('reason');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_REASON_TITLE)
          .should('be.visible')
          .and('contain.text', 'Alert reason')
          .and('contain.text', 'Show full reason');
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_REASON_DETAILS)
          .should('be.visible')
          .and('contain.text', rule.name);

        cy.log('mitre attack');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_MITRE_ATTACK_TITLE)
          .should('be.visible')
          // @ts-ignore
          .and('contain.text', rule.threat[0].framework);

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_MITRE_ATTACK_DETAILS)
          .should('be.visible')
          // @ts-ignore
          .and('contain.text', rule.threat[0].technique[0].name)
          // @ts-ignore
          .and('contain.text', rule.threat[0].tactic.name);
      });
    });

    describe('visualizations section', () => {
      it('should display analyzer and session previews', () => {
        toggleOverviewTabAboutSection();
        toggleOverviewTabVisualizationsSection();

        cy.log('analyzer graph preview');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ANALYZER_PREVIEW_CONTENT).scrollIntoView();
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ANALYZER_PREVIEW_CONTENT).should('be.visible');

        cy.log('session view preview');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_SESSION_PREVIEW_CONTENT).scrollIntoView();
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_SESSION_PREVIEW_CONTENT).should('be.visible');
      });
    });

    describe('investigation section', () => {
      it('should display investigation section', () => {
        toggleOverviewTabAboutSection();

        cy.log('header and content');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_SECTION_HEADER)
          .should('be.visible')
          .and('have.text', 'Investigation');
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_SECTION_CONTENT).should(
          'be.visible'
        );

        cy.log('investigation guide button');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_GUIDE_BUTTON)
          .should('be.visible')
          .and('have.text', 'Investigation guide');

        cy.log('should navigate to left Investigation tab');

        clickInvestigationGuideButton();
        cy.get(DOCUMENT_DETAILS_FLYOUT_INVESTIGATION_TAB_CONTENT).scrollIntoView();
        cy.get(DOCUMENT_DETAILS_FLYOUT_INVESTIGATION_TAB_CONTENT).should('be.visible');

        cy.log('highlighted fields');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_HEADER_TITLE)
          .should('be.visible')
          .and('have.text', 'Highlighted fields');
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_DETAILS).should(
          'be.visible'
        );

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_TABLE_FIELD_CELL)
          .should('be.visible')
          .and('contain.text', 'host.name');
        const hostNameCell =
          DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_TABLE_VALUE_CELL('siem-kibana');
        cy.get(hostNameCell).should('be.visible').and('have.text', 'siem-kibana');

        cy.get(hostNameCell).click();
        cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS).scrollIntoView();
        cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS).should('be.visible');

        collapseDocumentDetailsExpandableFlyoutLeftSection();

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_TABLE_FIELD_CELL)
          .should('be.visible')
          .and('contain.text', 'user.name');
        const userNameCell =
          DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_TABLE_VALUE_CELL('test');
        cy.get(userNameCell).should('be.visible').and('have.text', 'test');

        cy.get(userNameCell).click();
        cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS).scrollIntoView();
        cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS).should('be.visible');
      });
    });

    describe('insights section', () => {
      it('should display entities section', () => {
        toggleOverviewTabAboutSection();
        toggleOverviewTabInvestigationSection();
        toggleOverviewTabInsightsSection();

        cy.log('header and content');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_ENTITIES_HEADER).scrollIntoView();
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_ENTITIES_HEADER)
          .should('be.visible')
          .and('have.text', 'Entities');
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_ENTITIES_CONTENT).should('be.visible');
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_ENTITIES_HEADER).should('be.visible');

        cy.log('should navigate to left panel Entities tab');

        // TODO: skipping this section as Cypress can't seem to find the element (though it's in the DOM)
        // navigateToEntitiesDetails();
        // cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_ENTITIES_CONTENT).should('be.visible');
      });

      it('should display threat intelligence section', () => {
        toggleOverviewTabAboutSection();
        toggleOverviewTabInvestigationSection();
        toggleOverviewTabInsightsSection();

        cy.log('header and content');

        cy.get(
          DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_THREAT_INTELLIGENCE_HEADER
        ).scrollIntoView();
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_THREAT_INTELLIGENCE_HEADER)
          .should('be.visible')
          .and('have.text', 'Threat Intelligence');
        cy.get(
          DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_THREAT_INTELLIGENCE_CONTENT
        ).scrollIntoView();
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_THREAT_INTELLIGENCE_CONTENT)
          .should('be.visible')
          .within(() => {
            // threat match detected
            cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_THREAT_INTELLIGENCE_VALUES)
              .eq(0)
              .should('be.visible')
              .and('have.text', '0 threat match detected'); // TODO work on getting proper IoC data to get proper data here

            // field with threat enrichement
            cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_THREAT_INTELLIGENCE_VALUES)
              .eq(1)
              .should('be.visible')
              .and('have.text', '0 field enriched with threat intelligence'); // TODO work on getting proper IoC data to get proper data here
          });

        cy.log('should navigate to left panel Threat Intelligence tab');

        // TODO: skipping this section as Cypress can't seem to find the element (though it's in the DOM)
        // navigateToThreatIntelligenceDetails();
        // cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_ENTITIES_CONTENT).should('be.visible'); // TODO update when we can navigate to Threat Intelligence sub tab directly
      });

      // TODO: skipping this due to flakiness
      it.skip('should display correlations section', () => {
        cy.log('link the alert to a new case');

        createNewCaseFromExpandableFlyout();

        toggleOverviewTabAboutSection();
        toggleOverviewTabInvestigationSection();
        toggleOverviewTabInsightsSection();

        cy.log('header and content');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_HEADER).scrollIntoView();
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_HEADER)
          .should('be.visible')
          .and('have.text', 'Correlations');
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_CONTENT).scrollIntoView();
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_CONTENT)
          .should('be.visible')
          .within(() => {
            // TODO the order in which these appear is not deterministic currently, hence this can cause flakiness
            cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_VALUES)
              .eq(0)
              .should('be.visible')
              .and('have.text', '1 alert related by ancestry');
            // cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_VALUES)
            //   .eq(2)
            //   .should('be.visible')
            //   .and('have.text', '1 alert related by the same source event'); // TODO work on getting proper data to display some same source data here
            cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_VALUES)
              .eq(2)
              .should('be.visible')
              .and('have.text', '1 alert related by session');
            cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_VALUES)
              .eq(1)
              .should('be.visible')
              .and('have.text', '1 related case');
          });

        cy.log('should navigate to left panel Correlations tab');

        navigateToCorrelationsDetails();
        cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_ENTITIES_CONTENT).should('be.visible'); // TODO update when we can navigate to Correlations sub tab directly
      });

      // TODO work on getting proper data to make the prevalence section work here
      //  we need to generate enough data to have at least one field with prevalence
      it.skip('should display prevalence section', () => {
        toggleOverviewTabAboutSection();
        toggleOverviewTabInvestigationSection();
        toggleOverviewTabInsightsSection();

        cy.log('header and content');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_PREVALENCE_HEADER).scrollIntoView();
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_PREVALENCE_HEADER)
          .should('be.visible')
          .and('have.text', 'Prevalence');
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_PREVALENCE_CONTENT).scrollIntoView();
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_PREVALENCE_CONTENT)
          .should('be.visible')
          .within(() => {
            cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_PREVALENCE_VALUES)
              .should('be.visible')
              .and('have.text', 'is uncommon');
          });

        cy.log('should navigate to left panel Prevalence tab');

        navigateToPrevalenceDetails();
        cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_ENTITIES_CONTENT).should('be.visible'); // TODO update when we can navigate to Prevalence sub tab directly
      });
    });

    describe('response section', () => {
      it('should display empty message', () => {
        toggleOverviewTabAboutSection();
        toggleOverviewTabInvestigationSection();
        toggleOverviewTabResponseSection();

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_RESPONSE_SECTION_EMPTY_RESPONSE).should(
          'be.visible'
        );
      });
    });
  }
);
