/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM } from '@kbn/security-solution-plugin/common/constants';
import { getCustomQueryRuleParams } from '../../../../objects/rule';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { createRule } from '../../../../tasks/api_calls/rules';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';
import { visitRuleDetailsPage } from '../../../../tasks/rule_details';
import { login } from '../../../../tasks/login';
import { selectSuppressionBehaviorOnAlertClosure } from '../../../../tasks/stack_management';
import { SUCCESS_TOASTER_HEADER } from '../../../../screens/alerts_detection_rules';
import { CLOSE_ALERT_BTN } from '../../../../screens/alerts';
import {
  bulkCloseSelectedAlerts,
  closeAlertFromFlyoutActions,
  closeAlertFromStatusBadge,
  closeFirstAlert,
  closeFirstAlertModalOff,
  closeFirstGroupedAlerts,
  expandFirstAlert,
  expandFirstAlertActions,
  groupAlertsBy,
  selectAndConfirmClosingReason,
  selectNumberOfAlerts,
} from '../../../../tasks/alerts';
import { IS_SERVERLESS } from '../../../../env_var_names_constants';

describe(
  'Alert suppression - advanced settings',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
  },
  () => {
    const setupRuleAndAlerts = () => {
      deleteAlertsAndRules();
      createRule(
        getCustomQueryRuleParams({
          query: 'agent.name:*',
          interval: '1m',
          rule_id: 'rule_testing',
        })
      ).then((rule) => visitRuleDetailsPage(rule.body.id));

      waitForAlertsToPopulate();
    };

    const doLogin = () => {
      login(Cypress.env(IS_SERVERLESS) ? 'admin' : undefined);
    };

    const messages: Record<
      SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM,
      { title: string; message: string }
    > = {
      [SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM.RestartWindow]: {
        title: 'Closing alert restarts alert suppression',
        message:
          'Any new, duplicate events will be grouped and suppressed. Each unique group will be associated with a new alert. Learn more.',
      },
      [SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM.ContinueWindow]: {
        title: "Closing alert doesn't interrupt alert suppression",
        message:
          "Duplicate events will continue to be grouped and suppressed, but new alerts won't be created for these groups. Learn more.",
      },
    };

    const verifyModal = (setting: SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM) => {
      cy.get('[data-test-subj="alertCloseInfoModal"]')
        .should('be.visible')
        .should('contain.text', messages[setting].title)
        .should('contain.text', messages[setting].message);
    };
    const verifyModalContinue = () =>
      verifyModal(SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM.ContinueWindow);
    const verifyModalRestart = () =>
      verifyModal(SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM.RestartWindow);

    describe('setting suppressionBehaviorOnAlertClosure', () => {
      before(() => {
        cy.task('esArchiverLoad', { archiveName: 'auditbeat_multiple' });
      });

      after(() => {
        cy.task('esArchiverUnload', { archiveName: 'auditbeat_multiple' });
      });

      describe(`when set to ${SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM.RestartWindow}`, () => {
        beforeEach(() => {
          doLogin();
          selectSuppressionBehaviorOnAlertClosure(
            SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM.RestartWindow
          );
          setupRuleAndAlerts();
        });

        it('should display a modal telling the user about the current setting. Pressing cancel should not close the alert', () => {
          expandFirstAlertActions();
          cy.get(CLOSE_ALERT_BTN).click();
          selectAndConfirmClosingReason();
          cy.get('[data-test-subj="confirmModalCancelButton"]').click();
          cy.get('[data-test-subj="actions-context-menu"]').should('be.visible');
        });

        it('should close the alert if the user confirms the message in the modal', () => {
          closeFirstAlert(verifyModalRestart);
          cy.get('[data-test-subj="actions-context-menu"]').should('not.exist');

          cy.get(SUCCESS_TOASTER_HEADER).should('contain.text', 'Successfully closed 1 alert.');
        });

        it('should not show the modal again if the user ticks "do not show this message again" select box', () => {
          closeFirstAlert(() => {
            verifyModalRestart();
            cy.get('[data-test-subj="doNotShowAgainCheckbox"]').check();
          });

          cy.get(SUCCESS_TOASTER_HEADER).should('contain.text', 'Successfully closed 1 alert.');

          closeFirstAlertModalOff();

          cy.get(SUCCESS_TOASTER_HEADER).should('contain.text', 'Successfully closed 1 alert.');
        });
      });

      describe(`when set to ${SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM.ContinueWindow}`, () => {
        beforeEach(() => {
          doLogin();
          selectSuppressionBehaviorOnAlertClosure(
            SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM.ContinueWindow
          );
          setupRuleAndAlerts();
        });

        it('should display a modal telling the user about the current setting. Pressing cancel should not close the alert', () => {
          expandFirstAlertActions();
          cy.get(CLOSE_ALERT_BTN).click();
          selectAndConfirmClosingReason();
          cy.get('[data-test-subj="confirmModalCancelButton"]').click();
          cy.get('[data-test-subj="actions-context-menu"]').should('be.visible');
        });

        it('should close the alert if the user confirms the message in the modal', () => {
          closeFirstAlert(verifyModalContinue);
          cy.get('[data-test-subj="actions-context-menu"]').should('not.exist');

          cy.get(SUCCESS_TOASTER_HEADER).should('contain.text', 'Successfully closed 1 alert.');
        });

        it('should not show the modal again if the user ticks "do not show this message again" select box', () => {
          closeFirstAlert(() => {
            verifyModalContinue();
            cy.get('[data-test-subj="doNotShowAgainCheckbox"]').check();
          });

          cy.get(SUCCESS_TOASTER_HEADER).should('contain.text', 'Successfully closed 1 alert.');

          closeFirstAlertModalOff();

          cy.get(SUCCESS_TOASTER_HEADER).should('contain.text', 'Successfully closed 1 alert.');
        });
      });

      describe('modal display', () => {
        beforeEach(() => {
          doLogin();
          selectSuppressionBehaviorOnAlertClosure(
            SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM.ContinueWindow
          );
          setupRuleAndAlerts();
        });

        it('should display the modal when closing alerts through the bulk actions', () => {
          selectNumberOfAlerts(2);
          bulkCloseSelectedAlerts(verifyModalContinue);
        });

        it('should display the modal when closing alerts after grouping them', () => {
          groupAlertsBy('user.name');
          closeFirstGroupedAlerts(verifyModalContinue);
        });

        describe('alert details flyout', () => {
          beforeEach(() => {
            expandFirstAlert();
          });

          it('should show the modal when closing the alert from the status badge button', () => {
            closeAlertFromStatusBadge(verifyModalContinue);
          });

          it('should show the modal when closing the alert from the take action button', () => {
            closeAlertFromFlyoutActions(verifyModalContinue);
          });
        });
      });
    });
  }
);
