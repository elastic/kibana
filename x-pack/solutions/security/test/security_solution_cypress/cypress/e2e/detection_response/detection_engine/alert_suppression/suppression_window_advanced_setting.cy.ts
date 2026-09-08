/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM } from '@kbn/security-solution-plugin/common/constants';
import type { QueryRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getCustomQueryRuleParams } from '../../../../objects/rule';
import type { CreateRulePropsRewrites } from '../../../../objects/types';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { createRule } from '../../../../tasks/api_calls/rules';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';
import { visitRuleDetailsPage } from '../../../../tasks/rule_details';
import { login } from '../../../../tasks/login';
import { selectSuppressionBehaviorOnAlertClosure } from '../../../../tasks/stack_management';
import { TOASTER } from '../../../../screens/alerts_detection_rules';
import { ALERT_STATUS_BADGE_BUTTON, CLOSE_ALERT_BTN } from '../../../../screens/alerts';
import {
  bulkCloseSelectedAlerts,
  closeAlertFromFlyoutActions,
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
    const setupRuleAndAlerts = ({ withSuppression } = { withSuppression: true }) => {
      const params: CreateRulePropsRewrites<QueryRuleCreateProps> = {
        query: 'user.name:*',
        interval: '1m',
        rule_id: 'rule_testing',
      };
      if (withSuppression) {
        params.alert_suppression = {
          group_by: ['user.name'],
          duration: {
            value: 5,
            unit: 'h',
          },
        };
      }
      deleteAlertsAndRules();
      createRule(getCustomQueryRuleParams(params)).then((rule) =>
        visitRuleDetailsPage(rule.body.id, { tab: 'alerts' })
      );

      waitForAlertsToPopulate();
    };

    const doLogin = () => {
      login(Cypress.env(IS_SERVERLESS) ? 'admin' : undefined);
    };

    const confirmAlertCloseModal = () => {
      cy.get('[data-test-subj="confirmModalConfirmButton"]').click();
      cy.get('[data-test-subj="alertCloseInfoModal"]').should('not.exist');
    };

    const messages: Record<
      SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM,
      { title: string; message: string }
    > = {
      [SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM.RestartWindow]: {
        title: 'Closing alert restarts alert suppression',
        message:
          'Some of the alerts being closed were created while a suppression window was active. If suppression remains active, any new, duplicate events will be grouped and suppressed. Each unique group will be associated with a new alert.',
      },
      [SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM.ContinueWindow]: {
        title: "Closing alert doesn't interrupt alert suppression",
        message:
          "Some of the alerts being closed were created while a suppression window was active. If suppression remains active, duplicate events will continue to be grouped and suppressed, but new alerts won't be created for these groups.",
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
        cy.task('esArchiverLoad', { archiveName: 'all_users' });
      });

      after(() => {
        cy.task('esArchiverUnload', { archiveName: 'all_users' });
      });

      const verifySuccessToast = (count = 1) =>
        cy
          .get(TOASTER)
          .should(
            'contain.text',
            count > 1
              ? `Successfully closed ${count} alerts.`
              : `Successfully closed ${count} alert.`
          );
      const closeFirstAlert = () => {
        expandFirstAlertActions();
        cy.get(CLOSE_ALERT_BTN).click();
        selectAndConfirmClosingReason();
      };

      const closeAlertFromStatusBadge = () => {
        cy.get(ALERT_STATUS_BADGE_BUTTON).click();
        cy.get(CLOSE_ALERT_BTN).click();
        selectAndConfirmClosingReason();
      };

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
          closeFirstAlert();
          cy.get('[data-test-subj="confirmModalCancelButton"]').click();
          cy.get('[data-test-subj="actions-context-menu"]').should('be.visible');
        });

        it('should close the alert if the user confirms the message in the modal', () => {
          closeFirstAlert();
          verifyModalRestart();
          confirmAlertCloseModal();
          cy.get('[data-test-subj="actions-context-menu"]').should('not.exist');

          verifySuccessToast();
        });

        it('should not show the modal again if the user ticks "do not show this message again" select box', () => {
          closeFirstAlert();
          verifyModalRestart();
          cy.get('[data-test-subj="doNotShowAgainCheckbox"]').check();
          confirmAlertCloseModal();

          verifySuccessToast();

          closeFirstAlert();

          verifySuccessToast();
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
          closeFirstAlert();
          cy.get('[data-test-subj="confirmModalCancelButton"]').click();
          cy.get('[data-test-subj="actions-context-menu"]').should('be.visible');
        });

        it('should close the alert if the user confirms the message in the modal', () => {
          closeFirstAlert();
          verifyModalContinue();
          confirmAlertCloseModal();
          cy.get('[data-test-subj="actions-context-menu"]').should('not.exist');

          verifySuccessToast();
        });

        it('should not show the modal again if the user ticks "do not show this message again" select box', () => {
          closeFirstAlert();
          verifyModalContinue();
          cy.get('[data-test-subj="doNotShowAgainCheckbox"]').check();
          confirmAlertCloseModal();

          verifySuccessToast();

          closeFirstAlert();

          verifySuccessToast();
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
          bulkCloseSelectedAlerts();
          verifyModalContinue();
          confirmAlertCloseModal();
        });

        it('should display the modal when closing alerts after grouping them', () => {
          groupAlertsBy('user.name');
          closeFirstGroupedAlerts();
          verifyModalContinue();
          confirmAlertCloseModal();
        });

        describe('alert details flyout', () => {
          beforeEach(() => {
            expandFirstAlert();
          });

          it('should show the modal when closing the alert from the status badge button', () => {
            closeAlertFromStatusBadge();
            verifyModalContinue();
            confirmAlertCloseModal();
          });

          it('should show the modal when closing the alert from the take action button', () => {
            closeAlertFromFlyoutActions();
            verifyModalContinue();
            confirmAlertCloseModal();
          });
        });
      });

      describe('rules without an alert suppression window', () => {
        beforeEach(() => {
          doLogin();
          selectSuppressionBehaviorOnAlertClosure(
            SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM.ContinueWindow
          );
          setupRuleAndAlerts({ withSuppression: false });
        });

        it('should not display the modal when closing alerts through the bulk actions', () => {
          selectNumberOfAlerts(2);
          bulkCloseSelectedAlerts();
          verifySuccessToast(2);
        });

        it('should not display the modal when closing alerts after grouping them', () => {
          groupAlertsBy('user.name');
          closeFirstGroupedAlerts();
          verifySuccessToast();
        });

        describe('alert details flyout', () => {
          beforeEach(() => {
            expandFirstAlert();
          });

          it('should not show the modal when closing the alert from the status badge button', () => {
            closeAlertFromStatusBadge();
            verifySuccessToast();
          });

          it('should not show the modal when closing the alert from the take action button', () => {
            closeAlertFromFlyoutActions();
            verifySuccessToast();
          });
        });
      });
    });
  }
);
