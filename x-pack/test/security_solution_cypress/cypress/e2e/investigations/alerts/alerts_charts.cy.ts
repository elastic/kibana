/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../objects/rule';
import {
  ALERT_SUMMARY_CHARTS,
  SELECT_OVERVIEW_CHARTS,
  SELECT_HISTOGRAM,
  SELECT_COUNTS_TABLE,
  SELECT_TREEMAP,
  ALERT_SUMMARY_SEVERITY_DONUT_CHART,
  ALERT_SUMMARY_RULES_TABLE,
  ALERT_SUMMARY_PROGRESS_BAR_CHARTS,
  ALERTS_HISTOGRAM,
  ALERT_COUNT_TABLE,
  ALERT_TREEMAP,
  ALERTS_COUNT,
  ALERT_SUMMARY_CHARTS_COLLAPSED,
} from '../../../screens/alerts';
import {
  clickAlertsHistogramLegend,
  clickAlertsHistogramLegendAddToTimeline,
  clickAlertsHistogramLegendFilterFor,
  clickAlertsHistogramLegendFilterOut,
  selectAlertsHistogram,
  selectAlertsCountTable,
  selectAlertsTreemap,
  toggleKPICharts,
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

describe('KPI visualizations in Alerts Page', { tags: ['@ess', '@serverless'] }, () => {
  const ruleConfigs = getNewRule();
  beforeEach(() => {
    deleteAlertsAndRules();
    login();
    createRule(getNewRule({ rule_id: 'new custom rule' }));
    visitWithTimeRange(ALERTS_URL);
  });

  context('KPI viz navigation', () => {
    it('should navigate through clicking chart names', () => {
      cy.log('should display summary charts by default');

      cy.get(ALERT_SUMMARY_CHARTS).should('exist');
      cy.get(ALERT_SUMMARY_CHARTS_COLLAPSED).should('not.exist');
      cy.get(SELECT_OVERVIEW_CHARTS).should('have.class', 'euiButtonGroupButton-isSelected');

      cy.get(ALERT_SUMMARY_SEVERITY_DONUT_CHART).should('exist');
      cy.get(ALERT_SUMMARY_RULES_TABLE).should('exist');
      cy.get(ALERT_SUMMARY_PROGRESS_BAR_CHARTS).should('exist');

      cy.log('should display histogram charts when clicking trend button');

      selectAlertsHistogram();
      cy.get(SELECT_HISTOGRAM).should('have.class', 'euiButtonGroupButton-isSelected');
      cy.get(ALERT_SUMMARY_CHARTS).should('not.exist');
      cy.get(ALERTS_HISTOGRAM).should('exist');

      cy.log('should display table charts when clicking table button');

      selectAlertsCountTable();
      cy.get(ALERT_COUNT_TABLE).should('exist');
      cy.get(SELECT_COUNTS_TABLE).should('have.class', 'euiButtonGroupButton-isSelected');

      cy.log('should display treemap charts when clicking treemap button');

      selectAlertsTreemap();
      cy.get(ALERT_TREEMAP).should('exist');
      cy.get(SELECT_TREEMAP).should('have.class', 'euiButtonGroupButton-isSelected');
    });

    it('should display/hide collapsed chart when clicking on the toggle', () => {
      cy.log('should display summary charts by default');

      cy.get(ALERT_SUMMARY_CHARTS_COLLAPSED).should('not.exist');
      cy.get(ALERT_SUMMARY_SEVERITY_DONUT_CHART).should('exist');

      cy.log('should display collapsed summary when clicking toggle button');

      toggleKPICharts();
      cy.get(ALERT_SUMMARY_CHARTS_COLLAPSED).should('exist');
      cy.get(ALERT_SUMMARY_SEVERITY_DONUT_CHART).should('not.exist');

      cy.log('should display summary when clicking toggle button again');

      toggleKPICharts();
      cy.get(ALERT_SUMMARY_CHARTS_COLLAPSED).should('not.exist');
      cy.get(ALERT_SUMMARY_SEVERITY_DONUT_CHART).should('exist');
    });
  });

  context('Histogram legend hover actions', () => {
    it('should should add a filter in to KQL bar', () => {
      selectAlertsHistogram();
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
      selectAlertsHistogram();
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
      selectAlertsHistogram();
      clickAlertsHistogramLegend();
      clickAlertsHistogramLegendAddToTimeline(ruleConfigs.name);

      cy.get(TOASTER).should('have.text', `Added ${ruleConfigs.name} to Timeline`);
    });
  });
});
