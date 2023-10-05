/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertSuppression,
  EqlRuleCreateProps,
  QueryRuleCreateProps,
  RuleResponse,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { ruleFields } from '../../data/detection_engine';
import {
  CUSTOM_QUERY_DETAILS,
  DATA_VIEW_DETAILS,
  DEFINITION_DETAILS,
  INDEX_PATTERNS_DETAILS,
  RULE_TYPE_DETAILS,
  SUPPRESS_ALERTS_BY,
  SUPPRESS_ALERTS_FOR,
  SUPPRESS_ALERTS_MISSING,
  TIMELINE_TEMPLATE_DETAILS,
} from '../../screens/rule_details';
import { getDetails } from './common_tasks';

export const hasIndexPatterns = (indexPatterns: string) => {
  cy.get(DEFINITION_DETAILS).within(() => {
    getDetails(INDEX_PATTERNS_DETAILS).should('have.text', indexPatterns);
  });
};

export const checkRuleDetailsRuleIndex = (index: string[] = ruleFields.defaultIndexPatterns) => {
  cy.get(DEFINITION_DETAILS).within(() => {
    getDetails(INDEX_PATTERNS_DETAILS).should('have.text', index.join(''));
  });
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

const RULE_TYPE = {
  query: 'Query',
  eql: 'Event Correlation',
  esql: 'ES|QL',
  threat_match: 'Indicator match',
  saved_query: 'Saved query',
  threshold: 'Threshold',
  machine_learning: 'Machine Learning',
  new_terms: 'New Terms',
};

export const checkDataViewDetails = (dataViewId: string = ruleFields.dataViewId) => {
  cy.get(DEFINITION_DETAILS).within(() => {
    getDetails(DATA_VIEW_DETAILS).should('have.text', dataViewId);
  });
};

export const checkQueryDetails = (query: string = ruleFields.ruleQuery) => {
  cy.get(DEFINITION_DETAILS).within(() => {
    getDetails(CUSTOM_QUERY_DETAILS).should('have.text', query);
  });
};

export const checkRuleTypeDetails = (ruleType: string = 'query') => {
  cy.get(DEFINITION_DETAILS).within(() => {
    getDetails(RULE_TYPE_DETAILS).should('have.text', RULE_TYPE[ruleType]);
  });
};

export const checkTimelineTemplateDetails = (timelineTitle: string | undefined) => {
  cy.get(DEFINITION_DETAILS).within(() => {
    if (timelineTitle) {
      getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', timelineTitle);
    } else {
      getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
    }
  });
};

export const confirmRuleDetailsDefinition = (
  rule: RuleResponse | QueryRuleCreateProps | EqlRuleCreateProps
) => {
  if (rule.data_view_id) {
    checkDataViewDetails(rule.data_view_id);
  } else {
    checkRuleDetailsRuleIndex(rule.index);
  }
  checkQueryDetails(rule.query);
  checkRuleTypeDetails(rule.type);
  checkTimelineTemplateDetails(rule.timeline_title);
  if (rule.alert_suppression) {
    confirmAlertSuppressionDetails(rule.alert_suppression);
  }
};
