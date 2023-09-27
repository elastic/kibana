/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertSuppression } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import type { Exception } from '../objects/exception';
import { EMPTY_ALERT_TABLE } from '../screens/alerts';
import { PAGE_CONTENT_SPINNER } from '../screens/common/page';
import { RULE_STATUS } from '../screens/create_new_rule';
import {
  ADD_EXCEPTIONS_BTN_FROM_EMPTY_PROMPT_BTN,
  ADD_EXCEPTIONS_BTN_FROM_VIEWER_HEADER,
  EXCEPTION_ITEM_VIEWER_SEARCH,
  FIELD_INPUT,
} from '../screens/exceptions';
import {
  ALERTS_TAB,
  EXCEPTIONS_TAB,
  FIELDS_BROWSER_BTN,
  LAST_EXECUTION_STATUS_REFRESH_BUTTON,
  REMOVE_EXCEPTION_BTN,
  RULE_SWITCH,
  DEFINITION_DETAILS,
  INDEX_PATTERNS_DETAILS,
  DETAILS_TITLE,
  DETAILS_DESCRIPTION,
  EXCEPTION_ITEM_ACTIONS_BUTTON,
  EDIT_EXCEPTION_BTN,
  ENDPOINT_EXCEPTIONS_TAB,
  EDIT_RULE_SETTINGS_LINK,
  BACK_TO_RULES_TABLE,
  EXCEPTIONS_TAB_EXPIRED_FILTER,
  EXCEPTIONS_TAB_ACTIVE_FILTER,
  RULE_NAME_HEADER,
  ABOUT_RULE_DESCRIPTION,
  INVESTIGATION_NOTES_TOGGLE,
  ABOUT_INVESTIGATION_NOTES,
  ABOUT_DETAILS,
  SEVERITY_DETAILS,
  RISK_SCORE_DETAILS,
  RISK_SCORE_OVERRIDE_DETAILS,
  REFERENCE_URLS_DETAILS,
  FALSE_POSITIVES_DETAILS,
  TIMESTAMP_OVERRIDE_DETAILS,
  TAGS_DETAILS,
  THREAT_SUBTECHNIQUE,
  THREAT_TACTIC,
  THREAT_TECHNIQUE,
  DATA_VIEW_DETAILS,
  CUSTOM_QUERY_DETAILS,
  RULE_TYPE_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
  SCHEDULE_DETAILS,
  ADDITIONAL_LOOK_BACK_DETAILS,
  RUNS_EVERY_DETAILS,
  SUPPRESS_ALERTS_BY,
  SUPPRESS_ALERTS_FOR,
  SUPPRESS_ALERTS_MISSING,
  ACTION_DETAILS_CONNECTOR_NAME,
  ACTION_DETAILS,
  ACTION_DETAILS_CONNECTOR_FREQUENCY,
  INVESTIGATION_FIELDS_DETAILS,
  SEVERITY_OVERRIDE_DETAILS,
  RULE_DETAILS_TOGGLE,
  BUILDING_BLOCK_DETAILS,
  AUTHOR_DETAILS,
  BUILDING_BLOCK_TEXT_DETAILS,
  removeExternalLinkText,
} from '../screens/rule_details';
import { ALERTS_TABLE_COUNT } from '../screens/timeline';
import { RuleDetailsTabs, ruleDetailsUrl } from '../urls/rule_details';
import { waitForAlerts } from './alerts';
import {
  addExceptionConditions,
  addExceptionFlyoutItemName,
  selectBulkCloseAlerts,
  submitNewExceptionItem,
} from './exceptions';
import { addsFields, closeFieldsBrowser, filterFieldsBrowser } from './fields_browser';
import { visit } from './navigation';
import { getHumanReadableLookback } from './rule_creation';
import { refreshPage } from './security_header';

interface VisitRuleDetailsPageOptions {
  tab?: RuleDetailsTabs;
  role?: ROLES;
}

export function visitRuleDetailsPage(ruleId: string, options?: VisitRuleDetailsPageOptions): void {
  visit(ruleDetailsUrl(ruleId, options?.tab), { role: options?.role });
}

export const enablesRule = () => {
  // Rules get enabled via _bulk_action endpoint
  cy.intercept('POST', '/api/detection_engine/rules/_bulk_action?dry_run=false').as('bulk_action');
  cy.get(RULE_SWITCH).should('be.visible');
  cy.get(RULE_SWITCH).click();
  cy.wait('@bulk_action').then(({ response }) => {
    cy.wrap(response?.statusCode).should('eql', 200);
  });
};

export const addsFieldsToTimeline = (search: string, fields: string[]) => {
  cy.get(FIELDS_BROWSER_BTN).click();
  filterFieldsBrowser(search);
  addsFields(fields);
  closeFieldsBrowser();
};

export const openExceptionFlyoutFromEmptyViewerPrompt = () => {
  cy.get(ADD_EXCEPTIONS_BTN_FROM_EMPTY_PROMPT_BTN).click();
  cy.get(FIELD_INPUT).should('be.visible');
};

export const searchForExceptionItem = (query: string) => {
  cy.get(EXCEPTION_ITEM_VIEWER_SEARCH).clear();
  cy.get(EXCEPTION_ITEM_VIEWER_SEARCH).type(`${query}{enter}`);
};

export const addExceptionFlyoutFromViewerHeader = () => {
  cy.get(ADD_EXCEPTIONS_BTN_FROM_VIEWER_HEADER).click();
  cy.get(FIELD_INPUT).should('be.visible');
};

export const addExceptionFromRuleDetails = (exception: Exception) => {
  addExceptionFlyoutFromViewerHeader();
  addExceptionConditions(exception);
  submitNewExceptionItem();
};

export const addFirstExceptionFromRuleDetails = (exception: Exception, name: string) => {
  openExceptionFlyoutFromEmptyViewerPrompt();
  addExceptionFlyoutItemName(name);
  addExceptionConditions(exception);
  selectBulkCloseAlerts();
  submitNewExceptionItem();
};

export const goToAlertsTab = () => {
  cy.get(ALERTS_TAB).click();
};

export const goToExceptionsTab = () => {
  cy.get(EXCEPTIONS_TAB).click();
};

export const viewExpiredExceptionItems = () => {
  cy.get(EXCEPTIONS_TAB_EXPIRED_FILTER).click();
  cy.get(EXCEPTIONS_TAB_ACTIVE_FILTER).click();
};

export const goToEndpointExceptionsTab = () => {
  cy.get(ENDPOINT_EXCEPTIONS_TAB).click();
};

export const openEditException = (index = 0) => {
  cy.get(EXCEPTION_ITEM_ACTIONS_BUTTON).eq(index).click();
  cy.get(EDIT_EXCEPTION_BTN).eq(index).click();
};

export const removeException = () => {
  cy.get(EXCEPTION_ITEM_ACTIONS_BUTTON).click();

  cy.get(REMOVE_EXCEPTION_BTN).click();
};

/**
 * Waits for rule details page to be loaded
 *
 * @param ruleName rule's name
 */
export const waitForPageToBeLoaded = (ruleName: string): void => {
  cy.get(PAGE_CONTENT_SPINNER).should('be.visible');
  cy.contains(RULE_NAME_HEADER, ruleName).should('be.visible');
  cy.get(PAGE_CONTENT_SPINNER).should('not.exist');
};

export const waitForTheRuleToBeExecuted = () => {
  cy.waitUntil(() => {
    cy.log('Waiting for the rule to be executed');
    cy.get(LAST_EXECUTION_STATUS_REFRESH_BUTTON).click();

    return cy
      .get(RULE_STATUS)
      .invoke('text')
      .then((ruleStatus) => ruleStatus === 'succeeded');
  });
};

export const goBackToRulesTable = () => {
  cy.get(BACK_TO_RULES_TABLE).click();
};

export const getDetails = (title: string | RegExp) =>
  cy.contains(DETAILS_TITLE, title).next(DETAILS_DESCRIPTION);

export const assertDetailsNotExist = (title: string | RegExp) =>
  cy.get(DETAILS_TITLE).contains(title).should('not.exist');

export const hasIndexPatterns = (indexPatterns: string) => {
  cy.get(DEFINITION_DETAILS).within(() => {
    getDetails(INDEX_PATTERNS_DETAILS).should('have.text', indexPatterns);
  });
};

export const goToRuleEditSettings = () => {
  cy.get(EDIT_RULE_SETTINGS_LINK).click();
};

export const waitForAlertsToPopulate = (alertCountThreshold = 1) => {
  cy.waitUntil(
    () => {
      cy.log('Waiting for alerts to appear');
      refreshPage();
      return cy.root().then(($el) => {
        const emptyTableState = $el.find(EMPTY_ALERT_TABLE);
        if (emptyTableState.length > 0) {
          cy.log('Table is empty', emptyTableState.length);
          return false;
        }
        const countEl = $el.find(ALERTS_TABLE_COUNT);
        const alertCount = parseInt(countEl.text(), 10) || 0;
        return alertCount >= alertCountThreshold;
      });
    },
    { interval: 500, timeout: 12000 }
  );
  waitForAlerts();
};

export const confirmRuleDetailsAbout = (rule: RuleResponse) => {
  cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', rule.description);

  if (rule.note) {
    cy.get(INVESTIGATION_NOTES_TOGGLE).click();
    cy.get(ABOUT_INVESTIGATION_NOTES).should('have.text', rule.note);
    cy.get(RULE_DETAILS_TOGGLE).click();
  }

  cy.get(ABOUT_DETAILS).within(() => {
    if (rule.author && rule.author.length) {
      getDetails(AUTHOR_DETAILS).should('have.text', rule.author.join(''));
    }
    if (rule.building_block_type === 'default') {
      getDetails(BUILDING_BLOCK_DETAILS).should('have.text', BUILDING_BLOCK_TEXT_DETAILS);
    }

    getDetails(SEVERITY_DETAILS)
      .invoke('text')
      .then((text) => {
        cy.wrap(text.toLowerCase()).should('equal', rule.severity);
      });

    if (rule.severity_mapping && rule.severity_mapping.length) {
      getDetails(SEVERITY_OVERRIDE_DETAILS).should(
        'have.text',
        `${rule.severity_mapping[0].field}${rule.severity_mapping[0].severity}`
      );
    }

    getDetails(RISK_SCORE_DETAILS).should('have.text', rule.risk_score);

    if (rule.risk_score_mapping && rule.risk_score_mapping.length) {
      getDetails(RISK_SCORE_OVERRIDE_DETAILS).should(
        'have.text',
        `${rule.risk_score_mapping?.[0].field}kibana.alert.risk_score`
      );
    }

    if (rule.references && rule.references.length) {
      getDetails(REFERENCE_URLS_DETAILS).should((details) => {
        expect(removeExternalLinkText(details.text())).equal(rule.references.join(''));
      });
    }

    if (rule.false_positives && rule.false_positives.length) {
      getDetails(FALSE_POSITIVES_DETAILS).should('have.text', rule.false_positives.join(''));
    }

    if (rule.investigation_fields) {
      getDetails(INVESTIGATION_FIELDS_DETAILS).should(
        'have.text',
        rule.investigation_fields.field_names.join('')
      );
    }

    if (rule.timestamp_override) {
      getDetails(TIMESTAMP_OVERRIDE_DETAILS).should('have.text', rule.timestamp_override);
    }

    if (rule.tags && rule.tags.length) {
      getDetails(TAGS_DETAILS).should('have.text', rule.tags.join(''));
    }
  });

  if (rule.threat && rule.threat.length) {
    rule.threat.forEach((attack, index) => {
      const tactic = attack.tactic;

      cy.get(THREAT_TACTIC).should('contain', `${tactic.name} (${tactic.id})`);

      if (attack.technique) {
        attack.technique.forEach((threatTechnique) => {
          cy.get(THREAT_TECHNIQUE).should(
            'contain',
            `${threatTechnique.name} (${threatTechnique.id})`
          );

          if (threatTechnique.subtechnique) {
            threatTechnique.subtechnique.forEach((threatSubtechnique) => {
              cy.get(THREAT_SUBTECHNIQUE).should(
                'contain',
                `${threatSubtechnique.name} (${threatSubtechnique.id})`
              );
            });
          }
        });
      }
    });
  }
};

const RULE_TYPE = {
  query: 'Query',
  eql: 'Event Correlation',
  threat_match: 'Indicator match',
  saved_query: 'Saved query',
  threshold: 'Threshold',
  machine_learning: 'Machine Learning',
  new_terms: 'New Terms',
};

export const confirmAlertSuppressionDetails = (suppression: AlertSuppression) => {
  cy.get(DEFINITION_DETAILS).within(() => {
    getDetails(SUPPRESS_ALERTS_BY).should('have.text', suppression.group_by.join(''));
    if (suppression.duration) {
      getDetails(SUPPRESS_ALERTS_FOR).should(
        'have.text',
        `${suppression.duration.value}${suppression.duration.unit}`
      );
    } else {
      getDetails(SUPPRESS_ALERTS_FOR).should('have.text', 'One rule execution');
    }

    if (suppression.missing_fields_strategy === 'suppress') {
      getDetails(SUPPRESS_ALERTS_MISSING).should(
        'have.text',
        'Suppress and group alerts for events with missing fields'
      );
    } else {
      getDetails(SUPPRESS_ALERTS_MISSING).should(
        'have.text',
        'Do not suppress alerts for events with missing fields'
      );
    }
  });
};

export const confirmRuleDetailsDefinition = (rule: RuleResponse) => {
  cy.get(DEFINITION_DETAILS).within(() => {
    if (rule.data_view_id) {
      getDetails(DATA_VIEW_DETAILS).should('have.text', rule.data_view_id);
    } else {
      getDetails(INDEX_PATTERNS_DETAILS).should('have.text', rule.index.join(''));
    }
    getDetails(CUSTOM_QUERY_DETAILS).should('have.text', rule.query);
    getDetails(RULE_TYPE_DETAILS).should('have.text', RULE_TYPE[rule.type]);
    if (rule.timeline_title) {
      getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', rule.timeline_title);
    } else {
      getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
    }

    if (rule.alert_suppression) {
      getDetails(SUPPRESS_ALERTS_BY).should('have.text', rule.alert_suppression.group_by.join(''));
      if (rule.alert_suppression.duration) {
        getDetails(SUPPRESS_ALERTS_FOR).should(
          'have.text',
          `${rule.alert_suppression.duration.value}${rule.alert_suppression.duration.unit}`
        );
      } else {
        getDetails(SUPPRESS_ALERTS_FOR).should('have.text', 'One rule execution');
      }

      if (rule.alert_suppression.missing_fields_strategy === 'suppress') {
        getDetails(SUPPRESS_ALERTS_MISSING).should(
          'have.text',
          'Suppress and group alerts for events with missing fields'
        );
      } else {
        getDetails(SUPPRESS_ALERTS_MISSING).should(
          'have.text',
          'Do not suppress alerts for events with missing fields'
        );
      }
    }
  });
};

export const confirmRuleDetailsSchedule = (rule: RuleResponse) => {
  const lookbackTime = getHumanReadableLookback(rule.from, rule.interval);
  cy.get(SCHEDULE_DETAILS).within(() => {
    getDetails(RUNS_EVERY_DETAILS).should('have.text', rule.interval);
    getDetails(ADDITIONAL_LOOK_BACK_DETAILS).should(
      'have.text',
      `${lookbackTime[0]}${lookbackTime[1]}`
    );
  });
};

export const confirmRuleDetailsActions = (name: string, frequency: string) => {
  cy.get(ACTION_DETAILS).within(() => {
    cy.get(ACTION_DETAILS_CONNECTOR_NAME).should('have.text', name);
    getDetails(ACTION_DETAILS_CONNECTOR_FREQUENCY).should('have.text', frequency);
  });
};
