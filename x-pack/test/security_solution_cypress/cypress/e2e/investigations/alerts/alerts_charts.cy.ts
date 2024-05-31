/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../objects/rule';
import { ALERTS_COUNT } from '../../../screens/alerts';
import {
  clickAlertsHistogramLegend,
  clickAlertsHistogramLegendAddToTimeline,
  clickAlertsHistogramLegendFilterFor,
  clickAlertsHistogramLegendFilterOut,
  selectAlertsHistogram,
} from '../../../tasks/alerts';
import { createRule } from '../../../tasks/api_calls/rules';
import { deleteAlertsAndRules } from '../../../tasks/api_calls/common';
import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import { ALERTS_URL } from '../../../urls/navigation';
import {
  GLOBAL_SEARCH_BAR_FILTER_ITEM,
  GLOBAL_SEARCH_BAR_FILTER_ITEM_DELETE,
} from '../../../screens/search_bar';
import { TOASTER } from '../../../screens/alerts_detection_rules';

describe('Histogram legend hover actions', { tags: ['@ess', '@serverless'] }, () => {
  const ruleConfigs = getNewRule();

  beforeEach(() => {
    deleteAlertsAndRules();
    login();
    createRule(getNewRule({ rule_id: 'new custom rule' }));
    visitWithTimeRange(ALERTS_URL);
    selectAlertsHistogram();
  });

  it('should should add a filter in to KQL bar', () => {
    const expectedNumberOfAlerts = 1;
    clickAlertsHistogramLegend();
    clickAlertsHistogramLegendFilterFor(ruleConfigs.name);
    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should(
      'have.text',
      `kibana.alert.rule.name: ${ruleConfigs.name}`
    );
    cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlerts} alert`);
  });

  it('should add a filter out to KQL bar', () => {
    clickAlertsHistogramLegend();
    clickAlertsHistogramLegendFilterOut(ruleConfigs.name);
    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should(
      'have.text',
      `NOT kibana.alert.rule.name: ${ruleConfigs.name}`
    );
    cy.get(ALERTS_COUNT).should('not.exist');

    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM_DELETE).click();
    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should('not.exist');
  });

  it('should add To Timeline', () => {
    clickAlertsHistogramLegend();
    clickAlertsHistogramLegendAddToTimeline(ruleConfigs.name);

    cy.get(TOASTER).should('have.text', `Added ${ruleConfigs.name} to timeline`);
  });
});
