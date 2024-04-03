/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';

import { resetRulesTableState } from '../../../../tasks/common';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { DASHBOARDS_URL, KIBANA_HOME } from '../../../../urls/navigation';
import { RULES_MANAGEMENT_URL, RULES_MONITORING_URL } from '../../../../urls/rules_management';
import { getNewRule } from '../../../../objects/rule';
import {
  filterByCustomRules,
  filterBySearchTerm,
  filterByTags,
  expectFilterSearchTerm,
  expectFilterByTags,
  expectFilterByCustomRules,
  expectRulesManagementTab,
  expectRulesMonitoringTab,
  expectNoFilterByTags,
  expectNoFilterByElasticOrCustomRules,
  expectFilterByDisabledRules,
  expectNoFilterByEnabledOrDisabledRules,
  filterByDisabledRules,
  expectFilterByPrebuiltRules,
  expectFilterByEnabledRules,
  expectManagementTableRules,
  goToRuleDetailsOf,
} from '../../../../tasks/alerts_detection_rules';
import { createRule } from '../../../../tasks/api_calls/rules';
import {
  expectRowsPerPage,
  expectTablePage,
  expectTableSorting,
  goToTablePage,
  setRowsPerPageTo,
  sortByTableColumn,
} from '../../../../tasks/table_pagination';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';

function createTestRules(): void {
  createRule(getNewRule({ rule_id: '1', name: 'test 1', tags: ['tag-a'], enabled: false }));
  createRule(getNewRule({ rule_id: '2', name: 'rule 1', tags: ['tag-b'], enabled: false }));
  createRule(getNewRule({ rule_id: '3', name: 'rule 2', tags: ['tag-b'], enabled: false }));
  createRule(
    getNewRule({ rule_id: '4', name: 'rule 3', tags: ['tag-b', 'tag-c'], enabled: false })
  );
  createRule(getNewRule({ rule_id: '5', name: 'rule 4', tags: ['tag-b'], enabled: false }));
  createRule(
    getNewRule({ rule_id: '6', name: 'rule 5', tags: ['tag-b', 'tag-c'], enabled: false })
  );
  createRule(getNewRule({ rule_id: '7', name: 'rule 6', tags: ['tag-b'], enabled: false }));
  createRule(getNewRule({ rule_id: '8', name: 'rule 7', tags: ['tag-b'], enabled: true }));
}

function visitRulesTableWithState(urlTableState: Record<string, unknown>): void {
  visit(RULES_MANAGEMENT_URL, { visitOptions: { qs: { rulesTable: encode(urlTableState) } } });
}

function setStorageState(storageTableState: Record<string, unknown>): void {
  cy.window().then((win) => {
    win.sessionStorage.setItem('securitySolution.rulesTable', JSON.stringify(storageTableState));
  });
}

function changeRulesTableState(): void {
  filterBySearchTerm('rule');
  filterByTags(['tag-b']);
  filterByCustomRules();
  filterByDisabledRules();
  sortByTableColumn('Rule', 'asc');
  setRowsPerPageTo(5);
}

function expectRulesTableState(): void {
  expectFilterSearchTerm('rule');
  expectFilterByTags(['tag-b']);
  expectFilterByCustomRules();
  expectFilterByDisabledRules();
  expectTableSorting('Rule', 'asc');
  expectRowsPerPage(5);
}

function expectDefaultRulesTableState(): void {
  expectFilterSearchTerm('');
  expectNoFilterByTags();
  expectNoFilterByElasticOrCustomRules();
  expectNoFilterByEnabledOrDisabledRules();
  expectTableSorting('Enabled', 'desc');
  expectRowsPerPage(20);
  expectTablePage(1);
}

describe('Rules table: persistent state', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    createTestRules();
    login();
    resetRulesTableState();
  });

  describe('while on a happy path', { tags: ['@ess', '@serverless'] }, () => {
    it('activates management tab by default', () => {
      visit(RULES_MANAGEMENT_URL);

      expectRulesManagementTab();
    });

    it('leads to displaying a rule according to the specified filters', () => {
      visitRulesTableWithState({
        searchTerm: 'rule',
        tags: ['tag-b'],
        source: 'custom',
        enabled: false,
        field: 'name',
        order: 'asc',
        perPage: 5,
        page: 2,
      });

      expectManagementTableRules(['rule 6']);
    });

    it('loads from the url', () => {
      visitRulesTableWithState({
        searchTerm: 'rule',
        tags: ['tag-b'],
        source: 'custom',
        enabled: false,
        field: 'name',
        order: 'asc',
        perPage: 5,
        page: 2,
      });

      expectRulesManagementTab();
      expectFilterSearchTerm('rule');
      expectFilterByTags(['tag-b']);
      expectFilterByCustomRules();
      expectFilterByDisabledRules();
      expectTableSorting('Rule', 'asc');
      expectRowsPerPage(5);
      expectTablePage(2);
    });

    it('loads from the session storage', () => {
      setStorageState({
        searchTerm: 'test',
        tags: ['tag-a'],
        source: 'prebuilt',
        enabled: true,
        field: 'severity',
        order: 'desc',
        perPage: 10,
      });

      visit(RULES_MANAGEMENT_URL);

      expectRulesManagementTab();
      expectFilterSearchTerm('test');
      expectFilterByTags(['tag-a']);
      expectFilterByPrebuiltRules();
      expectFilterByEnabledRules();
      expectTableSorting('Severity', 'desc');
    });

    it('prefers url state over storage state', () => {
      setStorageState({
        searchTerm: 'test',
        tags: ['tag-c'],
        source: 'prebuilt',
        enabled: true,
        field: 'severity',
        order: 'desc',
        perPage: 10,
      });

      visitRulesTableWithState({
        searchTerm: 'rule',
        tags: ['tag-b'],
        source: 'custom',
        enabled: false,
        field: 'name',
        order: 'asc',
        perPage: 5,
        page: 2,
      });

      expectRulesManagementTab();
      expectRulesTableState();
      expectTablePage(2);
    });

    describe('and on the rules management tab', () => {
      beforeEach(() => {
        login();
        visit(RULES_MANAGEMENT_URL);
      });

      it('persists after reloading the page', () => {
        changeRulesTableState();
        goToTablePage(2);

        cy.reload();

        expectRulesManagementTab();
        expectRulesTableState();
        expectTablePage(2);
      });

      it('persists after navigating back from a rule details page', () => {
        changeRulesTableState();
        goToTablePage(2);

        goToRuleDetailsOf('rule 6');
        cy.go('back');

        expectRulesManagementTab();
        expectRulesTableState();
        expectTablePage(2);
      });

      it('persists after navigating to another page inside Security Solution', () => {
        changeRulesTableState();
        goToTablePage(2);

        visit(DASHBOARDS_URL);
        visit(RULES_MANAGEMENT_URL);

        expectRulesManagementTab();
        expectRulesTableState();
        expectTablePage(1);
      });

      it('persists after navigating to another page outside Security Solution', () => {
        changeRulesTableState();
        goToTablePage(2);

        visit(KIBANA_HOME);
        visit(RULES_MANAGEMENT_URL);

        expectRulesManagementTab();
        expectRulesTableState();
        expectTablePage(1);
      });
    });

    describe('and on the rules monitoring tab', () => {
      beforeEach(() => {
        login();
        visit(RULES_MONITORING_URL);
      });

      it('persists the selected tab', () => {
        changeRulesTableState();

        cy.reload();

        expectRulesMonitoringTab();
      });
    });
  });

  describe('upon state format upgrade', async () => {
    beforeEach(() => {
      login();
    });

    describe('and having state in the url', () => {
      it('ignores unsupported state key', () => {
        visitRulesTableWithState({
          someKey: 10,
          searchTerm: 'rule',
          tags: ['tag-b'],
          source: 'custom',
          enabled: false,
          field: 'name',
          order: 'asc',
          perPage: 5,
          page: 2,
        });

        expectRulesTableState();
        expectTablePage(2);
      });
    });

    describe('and having state in the session storage', () => {
      it('ignores unsupported state key', () => {
        setStorageState({
          someKey: 10,
          searchTerm: 'rule',
          tags: ['tag-b'],
          source: 'custom',
          enabled: false,
          field: 'name',
          order: 'asc',
          perPage: 5,
        });

        visit(RULES_MANAGEMENT_URL);

        expectRulesTableState();
        expectTablePage(1);
      });
    });
  });

  describe('when persisted state is partially unavailable', () => {
    describe('and on the rules management tab', () => {
      beforeEach(() => {
        login();
        visit(RULES_MANAGEMENT_URL);
      });

      it('persists after clearing the session storage', () => {
        changeRulesTableState();
        goToTablePage(2);

        cy.window().then((win) => {
          win.sessionStorage.clear();
        });
        cy.reload();

        expectRulesManagementTab();
        expectRulesTableState();
        expectTablePage(2);
      });

      it('persists after clearing the url state', () => {
        changeRulesTableState();
        goToTablePage(2);

        visit(RULES_MANAGEMENT_URL);

        expectRulesManagementTab();
        expectRulesTableState();
        expectTablePage(1);
      });
    });
  });

  describe('when corrupted', () => {
    describe('and on the rules management tab', () => {
      beforeEach(() => {
        login();
        visit(RULES_MANAGEMENT_URL);
      });

      it('persists after corrupting the session storage data', () => {
        changeRulesTableState();
        goToTablePage(2);

        cy.window().then((win) => {
          win.sessionStorage.setItem('securitySolution.rulesTable', '!invalid');
          cy.reload();

          expectRulesManagementTab();
          expectRulesTableState();
          expectTablePage(2);
        });
      });

      it('persists after corrupting the url param data', () => {
        changeRulesTableState();
        goToTablePage(2);

        visit(RULES_MANAGEMENT_URL, { visitOptions: { qs: { rulesTable: '(!invalid)' } } });

        expectRulesManagementTab();
        expectRulesTableState();
        expectTablePage(1);
      });

      it('DOES NOT persist after corrupting the session storage and url param data', () => {
        changeRulesTableState();
        goToTablePage(2);

        visit(RULES_MANAGEMENT_URL, {
          visitOptions: {
            qs: { rulesTable: '(!invalid)' },
            onBeforeLoad: (win) => {
              win.sessionStorage.setItem('securitySolution.rulesTable', '!invalid');
            },
          },
        });

        expectRulesManagementTab();
        expectDefaultRulesTableState();
      });
    });
  });
});
