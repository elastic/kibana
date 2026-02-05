/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleAssetSavedObject } from '../../../../../helpers/rules';
import { ADD_ELASTIC_RULES_TABLE } from '../../../../../screens/alerts_detection_rules';
import {
  expectFirstRuleInTable,
  expectLastRuleInTable,
  expectToContainRule,
  expectVisibleRulesCount,
  filterBySearchTerm,
  filterByTags,
} from '../../../../../tasks/alerts_detection_rules';
import { installPrebuiltRuleAssets } from '../../../../../tasks/api_calls/prebuilt_rules';
import { login } from '../../../../../tasks/login';

import { deletePrebuiltRulesAssets } from '../../../../../tasks/api_calls/common';
import { visitAddRulesPage } from '../../../../../tasks/rules_management';
import {
  expectTablePage,
  expectTableSorting,
  goToTablePage,
  setRowsPerPageTo,
  sortByTableColumn,
} from '../../../../../tasks/table_pagination';

describe(
  'Detection rules, Prebuilt Rules Installation Table',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  () => {
    describe('Pagination', () => {
      beforeEach(() => {
        login();
        deletePrebuiltRulesAssets();
      });

      it('User can paginate over prebuilt rules on Rule Installation page', () => {
        const rules = Array.from({ length: 6 }, (_, i) =>
          createRuleAssetSavedObject({
            name: `Rule ${i + 1}`,
            rule_id: `rule_${i + 1}`,
          })
        );

        installPrebuiltRuleAssets(rules);
        visitAddRulesPage();
        setRowsPerPageTo(5);

        expectTablePage(1);
        expectVisibleRulesCount(ADD_ELASTIC_RULES_TABLE, 5);
        // Verify rules 1-5 exist on page 1 (without asserting order)
        for (let i = 1; i <= 5; i++) {
          expectToContainRule(ADD_ELASTIC_RULES_TABLE, `Rule ${i}`);
        }

        goToTablePage(2);
        expectTablePage(2);
        expectVisibleRulesCount(ADD_ELASTIC_RULES_TABLE, 1);
      });
    });

    describe('Sorting', () => {
      beforeEach(() => {
        login();
        deletePrebuiltRulesAssets();
      });

      it('User can sort prebuilt rules on Rule Installation page', () => {
        const rules = Array.from({ length: 3 }, (_, i) =>
          createRuleAssetSavedObject({
            name: `Rule ${i + 1}`,
            rule_id: `rule_${i + 1}`,
          })
        );

        installPrebuiltRuleAssets(rules);
        visitAddRulesPage();

        sortByTableColumn('Rule', 'desc');
        expectTableSorting('Rule', 'desc');

        expectFirstRuleInTable(ADD_ELASTIC_RULES_TABLE, 'Rule 3');
        expectLastRuleInTable(ADD_ELASTIC_RULES_TABLE, 'Rule 1');

        sortByTableColumn('Rule', 'asc');
        expectTableSorting('Rule', 'asc');

        expectFirstRuleInTable(ADD_ELASTIC_RULES_TABLE, 'Rule 1');
        expectLastRuleInTable(ADD_ELASTIC_RULES_TABLE, 'Rule 3');
      });

      it('Navigating to the next page maintains the sorting order', () => {
        const rules = Array.from({ length: 6 }, (_, i) =>
          createRuleAssetSavedObject({
            name: `Rule ${i + 1}`,
            rule_id: `rule_${i + 1}`,
          })
        );

        installPrebuiltRuleAssets(rules);
        visitAddRulesPage();
        setRowsPerPageTo(5);

        sortByTableColumn('Rule', 'desc');
        expectTableSorting('Rule', 'desc');

        expectFirstRuleInTable(ADD_ELASTIC_RULES_TABLE, 'Rule 6');

        goToTablePage(2);

        expectTableSorting('Rule', 'desc');
        expectLastRuleInTable(ADD_ELASTIC_RULES_TABLE, 'Rule 1');
      });

      it('Changing sorting resets pagination to the first page', () => {
        const rules = Array.from({ length: 6 }, (_, i) =>
          createRuleAssetSavedObject({
            name: `Rule ${i + 1}`,
            rule_id: `rule_${i + 1}`,
          })
        );

        installPrebuiltRuleAssets(rules);
        visitAddRulesPage();
        setRowsPerPageTo(5);

        sortByTableColumn('Rule', 'desc');
        expectTableSorting('Rule', 'desc');

        goToTablePage(2);

        sortByTableColumn('Rule', 'asc');
        expectTableSorting('Rule', 'asc');

        expectTablePage(1);
      });
    });

    describe('Filtering', () => {
      beforeEach(() => {
        login();
        deletePrebuiltRulesAssets();
      });

      it('User can filter prebuilt rules by rule name on the Rule Installation page', () => {
        const rules = ['My Windows rule', 'My Linux rule'].map((name) =>
          createRuleAssetSavedObject({ name, rule_id: `rule_${name}` })
        );

        installPrebuiltRuleAssets(rules);
        visitAddRulesPage();

        filterBySearchTerm('My Windows rule');
        expectVisibleRulesCount(ADD_ELASTIC_RULES_TABLE, 1);
        expectFirstRuleInTable(ADD_ELASTIC_RULES_TABLE, 'My Windows rule');
      });

      it('User can filter prebuilt rules by multiple tags using AND logic on the Rule Installation page', () => {
        const rules = [
          createRuleAssetSavedObject({
            name: 'My Windows rule',
            rule_id: `rule_1`,
            tags: ['tag-a', 'tag-b'],
          }),
          createRuleAssetSavedObject({
            name: 'My Linux rule',
            rule_id: `rule_2`,
            tags: ['tag-b', 'tag-c'],
          }),
          createRuleAssetSavedObject({
            name: 'My macOS rule',
            rule_id: `rule_3`,
            tags: ['tag-c'],
          }),
        ];

        installPrebuiltRuleAssets(rules);
        visitAddRulesPage();

        filterByTags(['tag-b', 'tag-c']);

        expectVisibleRulesCount(ADD_ELASTIC_RULES_TABLE, 1);
        expectFirstRuleInTable(ADD_ELASTIC_RULES_TABLE, 'My Linux rule');
      });

      it('User can sort filtered prebuilt rules', () => {
        const rules = [
          createRuleAssetSavedObject({
            name: 'My rule 1',
            rule_id: 'rule_1',
            tags: ['tag-a', 'tag-b'],
            severity: 'high',
          }),
          createRuleAssetSavedObject({
            name: 'My rule 2',
            rule_id: 'rule_2',
            tags: ['tag-b', 'tag-c'],
            severity: 'low',
          }),
          createRuleAssetSavedObject({
            name: 'My rule 3',
            rule_id: 'rule_3',
            tags: ['tag-c'],
            severity: 'medium',
          }),
        ];

        installPrebuiltRuleAssets(rules);
        visitAddRulesPage();

        filterByTags(['tag-b']);

        sortByTableColumn('Severity', 'asc');
        expectTableSorting('Severity', 'asc');

        expectVisibleRulesCount(ADD_ELASTIC_RULES_TABLE, 2);
        expectFirstRuleInTable(ADD_ELASTIC_RULES_TABLE, 'My rule 2');
        expectLastRuleInTable(ADD_ELASTIC_RULES_TABLE, 'My rule 1');
      });

      it('Setting a filter resets pagination to the first page', () => {
        const rules = Array.from({ length: 6 }, (_, i) =>
          createRuleAssetSavedObject({
            name: `Rule ${i + 1}`,
            rule_id: `rule_${i + 1}`,
            tags: ['tag-a'],
          })
        );

        installPrebuiltRuleAssets(rules);
        visitAddRulesPage();
        setRowsPerPageTo(5);

        goToTablePage(2);
        expectTablePage(2);

        filterByTags(['tag-a']);
        expectTablePage(1);
      });

      it('Empty state is shown when filters match no rules', () => {
        installPrebuiltRuleAssets([
          createRuleAssetSavedObject({
            name: 'My rule 1',
            rule_id: 'rule_1',
          }),
        ]);

        visitAddRulesPage();
        filterBySearchTerm('no such rules');
        cy.get(ADD_ELASTIC_RULES_TABLE).contains('No items found');
      });
    });
  }
);
