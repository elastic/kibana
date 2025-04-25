/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { closeFlyout } from '../../../../tasks/expandable_flyout/alert_details_right_panel';
import {
  createNewCaseFromExpandableFlyout,
  expandAlertAtIndexExpandableFlyout,
} from '../../../../tasks/expandable_flyout/common';
import {
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ABOUT_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ANALYZER_PREVIEW_CONTAINER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_DETAILS,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_TITLE,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_OPEN_RULE_PREVIEW_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_DETAILS,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_HEADER_TITLE,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_VALUES_RELATED_ALERTS_BY_ANCESTRY,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_VALUES_RELATED_ALERTS_BY_SESSION,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_VALUES_RELATED_CASES,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_ENTITIES_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_PREVALENCE_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_PREVALENCE_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_THREAT_INTELLIGENCE_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_THREAT_INTELLIGENCE_VALUES,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_GUIDE_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_MITRE_ATTACK_DETAILS,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_MITRE_ATTACK_TITLE,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_REASON_DETAILS,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_REASON_TITLE,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_SESSION_PREVIEW_CONTAINER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_TABLE_FIELD_CELL,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_TABLE_VALUE_CELL,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_RESPONSE_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_VALUES_RELATED_ALERTS_BY_SAME_SOURCE_EVENT,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ABOUT_SECTION_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HOST_OVERVIEW_LINK,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_USER_OVERVIEW_LINK,
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
  navigateToEntitiesDetails,
  navigateToThreatIntelligenceDetails,
  navigateToResponseDetails,
} from '../../../../tasks/expandable_flyout/alert_details_right_panel_overview_tab';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';
import { DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_ENTITIES_BUTTON } from '../../../../screens/expandable_flyout/alert_details_left_panel_entities_tab';
import {
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB,
  DOCUMENT_DETAILS_FLYOUT_INVESTIGATION_TAB,
  DOCUMENT_DETAILS_FLYOUT_RESPONSE_TAB,
} from '../../../../screens/expandable_flyout/alert_details_left_panel';
import { DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_CORRELATIONS_BUTTON } from '../../../../screens/expandable_flyout/alert_details_left_panel_correlations_tab';
import { DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_THREAT_INTELLIGENCE_BUTTON } from '../../../../screens/expandable_flyout/alert_details_left_panel_threat_intelligence_tab';
import { DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_BUTTON } from '../../../../screens/expandable_flyout/alert_details_left_panel_prevalence_tab';
import {
  HOST_PANEL_HEADER,
  HOST_PREVIEW_PANEL_FOOTER,
  OPEN_HOST_FLYOUT_LINK,
} from '../../../../screens/hosts/flyout_host_panel';
import {
  USER_PANEL_HEADER,
  USER_PREVIEW_PANEL_FOOTER,
  OPEN_USER_FLYOUT_LINK,
} from '../../../../screens/users/flyout_user_panel';
import {
  PREVIEW_SECTION,
  PREVIEW_BANNER,
} from '../../../../screens/expandable_flyout/alert_details_preview_panel';

describe(
  'Alert details expandable flyout right panel overview tab',
  { tags: ['@ess', '@serverless'] },
  () => {
    const rule = { ...getNewRule(), investigation_fields: { field_names: ['host.os.name'] } };

    beforeEach(() => {
      deleteAlertsAndRules();
      login();
      createRule(rule);
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandAlertAtIndexExpandableFlyout();
    });

    describe('about section', () => {
      it('should display about section', () => {
        cy.log('header and content');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ABOUT_SECTION_HEADER).should(
          'have.text',
          'About'
        );

        cy.log('description');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_TITLE).and(
          'contain.text',
          'Rule description'
        );
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_TITLE).within(() => {
          cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_OPEN_RULE_PREVIEW_BUTTON).should(
            'have.text',
            'Show rule summary'
          );
        });
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_DETAILS).should(
          'have.text',
          rule.description
        );

        cy.log('reason');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_REASON_TITLE)
          .should('contain.text', 'Alert reason')
          .and('contain.text', 'Show full reason');
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_REASON_DETAILS).should(
          'contain.text',
          rule.name
        );

        cy.log('mitre attack');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_MITRE_ATTACK_TITLE).should(
          'contain.text',
          // @ts-ignore
          rule.threat[0].framework
        );

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_MITRE_ATTACK_DETAILS)
          // @ts-ignore
          .should('contain.text', rule.threat[0].technique[0].name)
          // @ts-ignore
          .and('contain.text', rule.threat[0].tactic.name);
      });
    });

    describe('visualizations section', () => {
      it('should display analyzer and session previews', () => {
        toggleOverviewTabAboutSection();
        toggleOverviewTabInvestigationSection();
        toggleOverviewTabVisualizationsSection();

        cy.log('session view preview');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_SESSION_PREVIEW_CONTAINER).should(
          'contain.text',
          'You can only view Linux session details if you’ve enabled the Include session data setting in your Elastic Defend integration policy. Refer to Enable Session View data(opens in a new tab or window) for more information.'
        );

        cy.log('analyzer graph preview');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ANALYZER_PREVIEW_CONTAINER).should(
          'contain.text',
          'zsh'
        );
      });
    });

    describe('investigation section', () => {
      it('should display investigation section', () => {
        toggleOverviewTabAboutSection();

        cy.log('header and content');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_SECTION_HEADER).should(
          'have.text',
          'Investigation'
        );

        cy.log('investigation guide button');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_GUIDE_BUTTON).should(
          'have.text',
          'Show investigation guide'
        );

        cy.log('should navigate to left Investigation tab');

        clickInvestigationGuideButton();

        cy.get(DOCUMENT_DETAILS_FLYOUT_INVESTIGATION_TAB)
          .should('have.text', 'Investigation')
          .and('have.class', 'euiTab-isSelected');

        cy.log('highlighted fields section');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_HEADER_TITLE).should(
          'have.text',
          'Highlighted fields'
        );
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_DETAILS).should('exist');

        cy.log('custom highlighted fields');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_TABLE_FIELD_CELL).should(
          'contain.text',
          'host.os.name'
        );
        const customHighlightedField =
          DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_TABLE_VALUE_CELL('Mac OS X');
        cy.get(customHighlightedField).and('have.text', 'Mac OS X');

        cy.log('system defined highlighted fields');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_TABLE_FIELD_CELL).should(
          'contain.text',
          'host.name'
        );
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_TABLE_FIELD_CELL).should(
          'contain.text',
          'user.name'
        );
      });

      it('should open host preview when host name is clicked', () => {
        toggleOverviewTabAboutSection();

        cy.log('should open host preview when clicked on host name');

        const hostNameCell =
          DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_TABLE_VALUE_CELL('siem-kibana');
        cy.get(hostNameCell).click();

        cy.get(PREVIEW_SECTION).should('exist');
        cy.get(PREVIEW_BANNER).should('have.text', 'Preview host details');
        cy.get(HOST_PANEL_HEADER).should('exist');
        cy.get(HOST_PREVIEW_PANEL_FOOTER).should('exist');

        cy.log('should open host flyout when click on footer link');

        cy.get(OPEN_HOST_FLYOUT_LINK).click();
        cy.get(HOST_PANEL_HEADER).should('exist');
        cy.get(PREVIEW_SECTION).should('not.exist');
        cy.get(HOST_PREVIEW_PANEL_FOOTER).should('not.exist');
      });

      it('should open user preview when user name is clicked', () => {
        toggleOverviewTabAboutSection();

        const userNameCell =
          DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_TABLE_VALUE_CELL('test');
        cy.get(userNameCell).and('have.text', 'test');

        cy.get(userNameCell).click();
        cy.get(PREVIEW_SECTION).should('exist');
        cy.get(PREVIEW_BANNER).should('have.text', 'Preview user details');
        cy.get(USER_PANEL_HEADER).should('exist');
        cy.get(USER_PREVIEW_PANEL_FOOTER).should('exist');

        cy.get(OPEN_USER_FLYOUT_LINK).click();
        cy.get(USER_PANEL_HEADER).should('exist');
        cy.get(PREVIEW_SECTION).should('not.exist');
        cy.get(USER_PREVIEW_PANEL_FOOTER).should('not.exist');
      });
    });

    describe('insights section', () => {
      it('should display entities section', () => {
        toggleOverviewTabAboutSection();
        toggleOverviewTabInvestigationSection();
        toggleOverviewTabInsightsSection();

        cy.log('header and content');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_ENTITIES_HEADER).should(
          'have.text',
          'Entities'
        );

        cy.log('should navigate to left panel Entities tab');

        navigateToEntitiesDetails();
        cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB)
          .should('have.text', 'Insights')
          .and('have.class', 'euiTab-isSelected');
        cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_ENTITIES_BUTTON)
          .should('have.text', 'Entities')
          .and('have.class', 'euiButtonGroupButton-isSelected');
      });

      it('open host preview when host name is clicked', () => {
        toggleOverviewTabAboutSection();
        toggleOverviewTabInvestigationSection();
        toggleOverviewTabInsightsSection();

        cy.log('should open host preview when clicked on host name');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HOST_OVERVIEW_LINK).click();

        cy.get(PREVIEW_SECTION).should('exist');
        cy.get(PREVIEW_BANNER).should('have.text', 'Preview host details');
        cy.get(HOST_PANEL_HEADER).should('exist');
        cy.get(HOST_PREVIEW_PANEL_FOOTER).should('exist');

        cy.log('should open host flyout when click on footer link');

        cy.get(OPEN_HOST_FLYOUT_LINK).click();
        cy.get(HOST_PANEL_HEADER).should('exist');
        cy.get(PREVIEW_SECTION).should('not.exist');
        cy.get(HOST_PREVIEW_PANEL_FOOTER).should('not.exist');
      });

      it('open user preview when user name is clicked', () => {
        toggleOverviewTabAboutSection();
        toggleOverviewTabInvestigationSection();
        toggleOverviewTabInsightsSection();

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_USER_OVERVIEW_LINK).click();

        cy.get(PREVIEW_SECTION).should('exist');
        cy.get(PREVIEW_BANNER).should('have.text', 'Preview user details');
        cy.get(USER_PANEL_HEADER).should('exist');
        cy.get(USER_PREVIEW_PANEL_FOOTER).should('exist');

        cy.get(OPEN_USER_FLYOUT_LINK).click();
        cy.get(USER_PANEL_HEADER).should('exist');
        cy.get(PREVIEW_SECTION).should('not.exist');
        cy.get(USER_PREVIEW_PANEL_FOOTER).should('not.exist');
      });

      it('should display threat intelligence section', () => {
        toggleOverviewTabAboutSection();
        toggleOverviewTabInvestigationSection();
        toggleOverviewTabInsightsSection();

        cy.log('header and content');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_THREAT_INTELLIGENCE_HEADER).should(
          'have.text',
          'Threat intelligence'
        );

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_THREAT_INTELLIGENCE_VALUES)
          .eq(0)
          .should('have.text', '0 threat matches detected'); // TODO work on getting proper IoC data to get proper data here

        // field with threat enrichement
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_THREAT_INTELLIGENCE_VALUES)
          .eq(1)
          .should('have.text', '0 fields enriched with threat intelligence'); // TODO work on getting proper IoC data to get proper data here

        cy.log('should navigate to left panel Threat Intelligence tab');

        navigateToThreatIntelligenceDetails();
        cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB)
          .should('have.text', 'Insights')
          .and('have.class', 'euiTab-isSelected');
        cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_THREAT_INTELLIGENCE_BUTTON)
          .should('have.text', 'Threat intelligence')
          .and('have.class', 'euiButtonGroupButton-isSelected');
      });

      it('should display correlations section', () => {
        cy.log('link the alert to a new case');

        createNewCaseFromExpandableFlyout();

        toggleOverviewTabAboutSection();
        toggleOverviewTabInvestigationSection();
        toggleOverviewTabInsightsSection();

        cy.log('header and content');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_HEADER).should(
          'have.text',
          'Correlations'
        );
        // cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_VALUES_SUPPRESSED_ALERTS)
        //   .should('be.visible')
        //   .and('have.text', '1 suppressed alert'); // TODO populate rule with alert suppression
        cy.get(
          DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_VALUES_RELATED_ALERTS_BY_ANCESTRY
        ).should('have.text', '1 alert related by ancestry');
        cy.get(
          DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_VALUES_RELATED_ALERTS_BY_SAME_SOURCE_EVENT
        ).should('have.text', '1 alert related by source event');
        cy.get(
          DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_VALUES_RELATED_ALERTS_BY_SESSION
        ).should('have.text', '1 alert related by session');
        cy.get(
          DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_VALUES_RELATED_CASES
        ).should('have.text', '1 related case');

        cy.log('should navigate to left panel Correlations tab');

        navigateToCorrelationsDetails();
        cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB)
          .should('have.text', 'Insights')
          .and('have.class', 'euiTab-isSelected');
        cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_CORRELATIONS_BUTTON)
          .should('have.text', 'Correlations')
          .and('have.class', 'euiButtonGroupButton-isSelected');
      });

      // TODO work on getting proper data to make the prevalence section work here
      //  we need to generate enough data to have at least one field with prevalence
      it('should display prevalence section', () => {
        toggleOverviewTabAboutSection();
        toggleOverviewTabInvestigationSection();
        toggleOverviewTabInsightsSection();

        cy.log('header and content');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_PREVALENCE_HEADER).should(
          'have.text',
          'Prevalence'
        );
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_PREVALENCE_CONTENT).should(
          'have.text',
          'No prevalence data available.'
        );

        cy.log('should navigate to left panel Prevalence tab');

        navigateToPrevalenceDetails();
        cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB)
          .should('have.text', 'Insights')
          .and('have.class', 'euiTab-isSelected');
        cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_BUTTON)
          .should('have.text', 'Prevalence')
          .and('have.class', 'euiButtonGroupButton-isSelected');
      });
    });

    describe('response section', () => {
      it('should display button', () => {
        toggleOverviewTabAboutSection();
        toggleOverviewTabInvestigationSection();
        toggleOverviewTabResponseSection();

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_RESPONSE_BUTTON).should(
          'have.text',
          'Response'
        );

        navigateToResponseDetails();
        cy.get(DOCUMENT_DETAILS_FLYOUT_RESPONSE_TAB)
          .should('have.text', 'Response')
          .and('have.class', 'euiTab-isSelected');
      });
    });

    describe('local storage persistence', () => {
      before(() => {
        cy.task('esArchiverLoad', { archiveName: 'auditbeat_multiple' });
      });

      after(() => {
        cy.task('esArchiverUnload', { archiveName: 'auditbeat_multiple' });
      });

      it('should persist which section are collapsed/expanded', () => {
        cy.log('should show the correct expanded and collapsed section by default');

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ABOUT_SECTION_CONTENT).should('be.visible');

        cy.log('should persist the expanded and collapsed sections when opening another alert');

        toggleOverviewTabAboutSection();

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ABOUT_SECTION_CONTENT).should('not.be.visible');

        cy.log('should persist the expanded and collapsed sections after closing the flyout');

        closeFlyout();
        expandAlertAtIndexExpandableFlyout();

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ABOUT_SECTION_CONTENT).should('not.be.visible');

        cy.log('should persist the expanded and collapsed sections after page reload');

        closeFlyout();
        cy.reload();
        expandAlertAtIndexExpandableFlyout();

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ABOUT_SECTION_CONTENT).should('not.be.visible');
      });
    });
  }
);
