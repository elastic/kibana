/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { Filter } from '@kbn/es-query';
import type { PrebuiltRuleAsset } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules';
import type { ReviewRuleUpgradeResponseBody } from '@kbn/security-solution-plugin/common/api/detection_engine/prebuilt_rules/review_rule_upgrade/review_rule_upgrade_route';
import type {
  Threshold,
  AlertSuppression,
} from '@kbn/security-solution-plugin/common/api/detection_engine/model/rule_schema';
import { type ThreatMapping } from '@kbn/security-solution-plugin/common/api/detection_engine/model/rule_schema';
import { getPrebuiltRuleMockOfType } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules/mocks';
import { setUpRuleUpgrades } from '../../../../../tasks/prebuilt_rules/setup_rule_upgrades';
import { createRuleAssetSavedObject } from '../../../../../helpers/rules';
import {
  UPDATE_PREBUILT_RULE_PREVIEW,
  UPDATE_PREBUILT_RULE_BUTTON,
  FIELD_UPGRADE_WRAPPER,
  PER_FIELD_DIFF_WRAPPER,
  PER_FIELD_DIFF_DEFINITION_SECTION,
  RULES_MANAGEMENT_TABLE,
} from '../../../../../screens/alerts_detection_rules';
import { installMockPrebuiltRulesPackage } from '../../../../../tasks/api_calls/prebuilt_rules';
import { createSavedQuery, deleteSavedQueries } from '../../../../../tasks/api_calls/saved_queries';
import { fetchMachineLearningModules } from '../../../../../tasks/api_calls/machine_learning';
import { resetRulesTableState } from '../../../../../tasks/common';
import { login } from '../../../../../tasks/login';
import {
  assertRulesNotPresentInRuleUpdatesTable,
  assertRuleUpgradeSuccessToastShown,
  clickRuleUpdatesTab,
} from '../../../../../tasks/prebuilt_rules';
import {
  assertAlertSuppressionPropertiesShown,
  assertCommonPropertiesShown,
  assertCustomQueryPropertyShown,
  assertDataViewPropertiesShown,
  assertEqlQueryPropertyShown,
  assertEsqlQueryPropertyShown,
  assertFiltersPropertyShown,
  assertIndexPropertyShown,
  assertMachineLearningPropertiesShown,
  assertNewTermsFieldsPropertyShown,
  assertSavedQueryPropertiesShown,
  assertSelectedPreviewTab,
  assertThreatMatchQueryPropertiesShown,
  assertThresholdPropertyShown,
  assertWindowSizePropertyShown,
  openPrebuiltRuleUpgradeFlyoutFor,
  selectPreviewTab,
  closePrebuiltRuleUpgradeFlyout,
} from '../../../../../tasks/prebuilt_rules_preview';
import {
  visitRulesManagementTable,
  visitRulesUpgradeTable,
} from '../../../../../tasks/rules_management';
import {
  deleteAlertsAndRules,
  deleteDataView,
  deletePrebuiltRulesAssets,
  postDataView,
} from '../../../../../tasks/api_calls/common';
import { enableRules, waitForRulesToFinishExecution } from '../../../../../tasks/api_calls/rules';
import { expectRulesInTable, goToRuleDetailsOf } from '../../../../../tasks/alerts_detection_rules';
import {
  acceptFieldValue,
  cancelFieldValue,
  saveFieldValue,
  switchFieldToEditMode,
  toggleFieldAccordion,
  typeRuleName,
} from '../../../../../tasks/prebuilt_rules/prebuilt_rules_upgrade_flyout';

const PREVIEW_TABS = {
  OVERVIEW: 'Overview',
  JSON_VIEW: 'JSON view',
  UPDATES: 'Elastic update overview', // Currently open by default on upgrade
};

describe(
  'Detection rules, Prebuilt Rules Upgrade With Preview',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  () => {
    before(() => {
      installMockPrebuiltRulesPackage();
    });

    beforeEach(() => {
      resetRulesTableState();
      deletePrebuiltRulesAssets();
      deleteAlertsAndRules();
      login();
    });

    describe('preview prebuilt rule upgrade', () => {
      const PREBUILT_RULE_ID = 'test-prebuilt-rule';
      const PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
        rule_id: PREBUILT_RULE_ID,
        version: 1,
        name: 'Prebuilt rule',
        description: 'Non-customized prebuilt rule',
      });
      const NEW_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
        rule_id: PREBUILT_RULE_ID,
        version: 2,
        name: 'New Prebuilt rule A',
        description: 'New Non-customized prebuilt rule',
      });

      it('previews a prebuilt rule upgrade', () => {
        setUpRuleUpgrades({
          currentRuleAssets: [PREBUILT_RULE_ASSET],
          rulePatches: [{ rule_id: PREBUILT_RULE_ID, tags: ['customized'] }],
          newRuleAssets: [NEW_PREBUILT_RULE_ASSET],
        });

        const currentRuleName = PREBUILT_RULE_ASSET['security-rule'].name;
        const newRuleName = NEW_PREBUILT_RULE_ASSET['security-rule'].name;

        visitRulesUpgradeTable();

        openPrebuiltRuleUpgradeFlyoutFor(currentRuleName);
        cy.contains(UPDATE_PREBUILT_RULE_PREVIEW, newRuleName).should('be.visible');

        closePrebuiltRuleUpgradeFlyout();
        cy.contains(UPDATE_PREBUILT_RULE_PREVIEW, newRuleName).should('not.exist');
      });

      it('hides tabs and sections without content', () => {
        const PREBUILT_RULE_WITHOUT_INVESTIGATION_AND_SETUP_GUIDES = createRuleAssetSavedObject({
          rule_id: 'test-prebuilt_rule_without_investigation_and_setup_guides',
          version: 2,
          name: 'Prebuilt rule without investigation and setup guides',
        });
        const NEW_PREBUILT_RULE_WITHOUT_INVESTIGATION_AND_SETUP_GUIDES = createRuleAssetSavedObject(
          {
            rule_id: 'test-prebuilt_rule_without_investigation_and_setup_guides',
            version: 3,
            name: 'New Prebuilt rule without investigation and setup guides',
          }
        );

        setUpRuleUpgrades({
          currentRuleAssets: [PREBUILT_RULE_WITHOUT_INVESTIGATION_AND_SETUP_GUIDES],
          rulePatches: [],
          newRuleAssets: [NEW_PREBUILT_RULE_WITHOUT_INVESTIGATION_AND_SETUP_GUIDES],
        });

        const currentRuleName =
          PREBUILT_RULE_WITHOUT_INVESTIGATION_AND_SETUP_GUIDES['security-rule'].name;

        visitRulesUpgradeTable();

        openPrebuiltRuleUpgradeFlyoutFor(currentRuleName);

        cy.get(UPDATE_PREBUILT_RULE_PREVIEW).contains('Investigation guide').should('not.exist');
        cy.get(UPDATE_PREBUILT_RULE_PREVIEW).contains('Setup guide').should('not.exist');
      });

      it('shows custom query prebuilt rule properties', () => {
        setUpRuleUpgrades({
          currentRuleAssets: [CUSTOM_QUERY_PREBUILT_RULE_ASSET],
          rulePatches: [],
          newRuleAssets: [UPDATED_CUSTOM_QUERY_PREBUILT_RULE_ASSET],
        });
        visitRulesUpgradeTable();

        openPrebuiltRuleUpgradeFlyoutFor(
          UPDATED_CUSTOM_QUERY_PREBUILT_RULE_ASSET['security-rule'].name
        );
        selectPreviewTab(PREVIEW_TABS.OVERVIEW);

        const { index } = UPDATED_CUSTOM_QUERY_PREBUILT_RULE_ASSET['security-rule'] as {
          index: string[];
        };
        assertIndexPropertyShown(index);

        const { query } = UPDATED_CUSTOM_QUERY_PREBUILT_RULE_ASSET['security-rule'] as {
          query: string;
        };
        assertCustomQueryPropertyShown(query);

        const { filters: queryFilters } = UPDATED_CUSTOM_QUERY_PREBUILT_RULE_ASSET[
          'security-rule'
        ] as {
          filters: Filter[];
        };
        assertFiltersPropertyShown(queryFilters);

        const { alert_suppression: alertSuppression } = UPDATED_CUSTOM_QUERY_PREBUILT_RULE_ASSET[
          'security-rule'
        ] as { alert_suppression: AlertSuppression };
        assertAlertSuppressionPropertiesShown(alertSuppression);
      });

      it('shows saved query prebuilt prebuilt rule properties', () => {
        const testSavedQuery = {
          query: 'agent.id: *',
          name: 'My test saved query',
          filterKey: 'agent.hostname',
        };
        const testDataView = {
          indexPattern: 'test-*',
          name: 'My test data view',
          id: 'my-test-data-view-id',
        };

        deleteDataView(testDataView.id);
        postDataView(testDataView.indexPattern, testDataView.name, testDataView.id);

        deleteSavedQueries();
        createSavedQuery(testSavedQuery.name, testSavedQuery.query, testSavedQuery.filterKey)
          .its('body.id')
          .then((id: string) => {
            (
              UPDATED_SAVED_QUERY_PREBUILT_RULE_ASSET['security-rule'] as { saved_id: string }
            ).saved_id = id;

            setUpRuleUpgrades({
              currentRuleAssets: [SAVED_QUERY_PREBUILT_RULE_ASSET],
              rulePatches: [],
              newRuleAssets: [UPDATED_SAVED_QUERY_PREBUILT_RULE_ASSET],
            });
            visitRulesUpgradeTable();

            openPrebuiltRuleUpgradeFlyoutFor(
              UPDATED_SAVED_QUERY_PREBUILT_RULE_ASSET['security-rule'].name
            );
            selectPreviewTab(PREVIEW_TABS.OVERVIEW);

            const { data_view_id: dataViewId } = UPDATED_SAVED_QUERY_PREBUILT_RULE_ASSET[
              'security-rule'
            ] as {
              data_view_id: string;
            };
            assertDataViewPropertiesShown(dataViewId, testDataView.indexPattern);

            assertSavedQueryPropertiesShown(
              testSavedQuery.query,
              testSavedQuery.filterKey,
              testSavedQuery.name
            );

            assertCommonPropertiesShown(commonProperties);
          });
      });

      it('shows machine learning prebuilt rule properties', function () {
        fetchMachineLearningModules()
          .its('body')
          .then((mlModules) => {
            setUpRuleUpgrades({
              currentRuleAssets: [MACHINE_LEARNING_PREBUILT_RULE_ASSET],
              rulePatches: [],
              newRuleAssets: [UPDATED_MACHINE_LEARNING_PREBUILT_RULE_ASSET],
            });
            visitRulesUpgradeTable();

            openPrebuiltRuleUpgradeFlyoutFor(
              UPDATED_MACHINE_LEARNING_PREBUILT_RULE_ASSET['security-rule'].name
            );
            selectPreviewTab(PREVIEW_TABS.OVERVIEW);

            assertCommonPropertiesShown(commonProperties);

            const {
              anomaly_threshold: anomalyThreshold,
              machine_learning_job_id: machineLearningJobIds,
            } = UPDATED_MACHINE_LEARNING_PREBUILT_RULE_ASSET['security-rule'] as {
              anomaly_threshold: number;
              machine_learning_job_id: string[];
            };
            assertMachineLearningPropertiesShown(
              anomalyThreshold,
              machineLearningJobIds,
              mlModules
            );
          });
      });

      it('shows threshold prebuilt rule properties', () => {
        setUpRuleUpgrades({
          currentRuleAssets: [THRESHOLD_PREBUILT_RULE_ASSET],
          rulePatches: [],
          newRuleAssets: [UPDATED_THRESHOLD_PREBUILT_RULE_ASSET],
        });
        visitRulesUpgradeTable();

        openPrebuiltRuleUpgradeFlyoutFor(
          UPDATED_THRESHOLD_PREBUILT_RULE_ASSET['security-rule'].name
        );
        selectPreviewTab(PREVIEW_TABS.OVERVIEW);

        assertCommonPropertiesShown(commonProperties);

        const { threshold } = UPDATED_THRESHOLD_PREBUILT_RULE_ASSET['security-rule'] as {
          threshold: Threshold;
        };
        assertThresholdPropertyShown(threshold);

        const { index } = UPDATED_THRESHOLD_PREBUILT_RULE_ASSET['security-rule'] as {
          index: string[];
        };
        assertIndexPropertyShown(index);

        const { query } = UPDATED_THRESHOLD_PREBUILT_RULE_ASSET['security-rule'] as {
          query: string;
        };
        assertCustomQueryPropertyShown(query);

        const { filters: queryFilters } = UPDATED_THRESHOLD_PREBUILT_RULE_ASSET[
          'security-rule'
        ] as {
          filters: Filter[];
        };
        assertFiltersPropertyShown(queryFilters);
      });

      it('shows EQL prebuilt rule properties', () => {
        setUpRuleUpgrades({
          currentRuleAssets: [EQL_PREBUILT_RULE_ASSET],
          rulePatches: [],
          newRuleAssets: [UPDATED_EQL_INDEX_PATTERN_RULE],
        });
        visitRulesUpgradeTable();

        openPrebuiltRuleUpgradeFlyoutFor(UPDATED_EQL_INDEX_PATTERN_RULE['security-rule'].name);
        selectPreviewTab(PREVIEW_TABS.OVERVIEW);

        assertCommonPropertiesShown(commonProperties);

        const { query } = UPDATED_EQL_INDEX_PATTERN_RULE['security-rule'] as { query: string };
        assertEqlQueryPropertyShown(query);

        const { filters: queryFilters } = UPDATED_EQL_INDEX_PATTERN_RULE['security-rule'] as {
          filters: Filter[];
        };
        assertFiltersPropertyShown(queryFilters);
      });

      it('shows indicator match prebuilt rule properties', () => {
        setUpRuleUpgrades({
          currentRuleAssets: [THREAT_MATCH_PREBUILT_RULE_ASSET],
          rulePatches: [],
          newRuleAssets: [UPDATED_THREAT_MATCH_PREBUILT_RULE_ASSET],
        });
        visitRulesUpgradeTable();

        openPrebuiltRuleUpgradeFlyoutFor(
          UPDATED_THREAT_MATCH_PREBUILT_RULE_ASSET['security-rule'].name
        );
        selectPreviewTab(PREVIEW_TABS.OVERVIEW);

        assertCommonPropertiesShown(commonProperties);

        const {
          threat_index: threatIndex,
          threat_mapping: threatMapping,
          threat_filters: threatFilters,
          threat_query: threatQuery,
        } = UPDATED_THREAT_MATCH_PREBUILT_RULE_ASSET['security-rule'] as {
          threat_index: string[];
          threat_mapping: ThreatMapping;
          threat_filters: Filter[];
          threat_query: string;
        };
        assertThreatMatchQueryPropertiesShown({
          threatIndex,
          threatMapping,
          threatFilters,
          threatQuery,
        });

        const { filters: queryFilters } = UPDATED_THREAT_MATCH_PREBUILT_RULE_ASSET[
          'security-rule'
        ] as {
          filters: Filter[];
        };
        assertFiltersPropertyShown(queryFilters);

        const { index } = UPDATED_THREAT_MATCH_PREBUILT_RULE_ASSET['security-rule'] as {
          index: string[];
        };
        assertIndexPropertyShown(index);

        const { query } = UPDATED_THREAT_MATCH_PREBUILT_RULE_ASSET['security-rule'] as {
          query: string;
        };
        assertCustomQueryPropertyShown(query);
      });

      it('shows new terms prebuilt rule properties', () => {
        setUpRuleUpgrades({
          currentRuleAssets: [NEW_TERMS_PREBUILT_RULE_ASSET],
          rulePatches: [],
          newRuleAssets: [UPDATED_NEW_TERMS_PREBUILT_RULE_ASSET],
        });
        visitRulesUpgradeTable();

        openPrebuiltRuleUpgradeFlyoutFor(
          UPDATED_NEW_TERMS_PREBUILT_RULE_ASSET['security-rule'].name
        );
        selectPreviewTab(PREVIEW_TABS.OVERVIEW);

        assertCommonPropertiesShown(commonProperties);

        const { new_terms_fields: newTermsFields } = UPDATED_NEW_TERMS_PREBUILT_RULE_ASSET[
          'security-rule'
        ] as { new_terms_fields: string[] };
        assertNewTermsFieldsPropertyShown(newTermsFields);

        const { history_window_start: historyWindowStart } = UPDATED_NEW_TERMS_PREBUILT_RULE_ASSET[
          'security-rule'
        ] as { history_window_start: string };
        assertWindowSizePropertyShown(historyWindowStart);

        const { filters: queryFilters } = UPDATED_NEW_TERMS_PREBUILT_RULE_ASSET[
          'security-rule'
        ] as {
          filters: Filter[];
        };
        assertFiltersPropertyShown(queryFilters);

        const { index } = UPDATED_NEW_TERMS_PREBUILT_RULE_ASSET['security-rule'] as {
          index: string[];
        };
        assertIndexPropertyShown(index);

        const { query } = UPDATED_NEW_TERMS_PREBUILT_RULE_ASSET['security-rule'] as {
          query: string;
        };
        assertCustomQueryPropertyShown(query);
      });

      it('shows ES|QL prebuilt rule properties', () => {
        setUpRuleUpgrades({
          currentRuleAssets: [ESQL_PREBUILT_RULE_ASSET],
          rulePatches: [],
          newRuleAssets: [UPDATED_ESQL_PREBUILT_RULE_ASSET],
        });
        visitRulesUpgradeTable();

        openPrebuiltRuleUpgradeFlyoutFor(UPDATED_ESQL_PREBUILT_RULE_ASSET['security-rule'].name);
        selectPreviewTab(PREVIEW_TABS.OVERVIEW);

        assertCommonPropertiesShown(commonProperties);

        const { query } = UPDATED_ESQL_PREBUILT_RULE_ASSET['security-rule'] as { query: string };
        assertEsqlQueryPropertyShown(query);

        const { alert_suppression: alertSuppression } = UPDATED_ESQL_PREBUILT_RULE_ASSET[
          'security-rule'
        ] as {
          alert_suppression: AlertSuppression;
        };
        assertAlertSuppressionPropertiesShown(alertSuppression);
      });
    });

    describe('preview prebuilt rule upgrade in JSON diff view', () => {
      const PREBUILT_RULE_ID_A = 'test-prebuilt-rule-a';
      const PREBUILT_RULE_ID_B = 'test-prebuilt-rule-b';
      const PREBUILT_RULE_ASSET_A = createRuleAssetSavedObject({
        rule_id: PREBUILT_RULE_ID_A,
        version: 1,
        name: 'Prebuilt rule A',
        description: 'Non-customized prebuilt rule A',
      });
      const NEW_PREBUILT_RULE_ASSET_A = createRuleAssetSavedObject({
        rule_id: PREBUILT_RULE_ID_A,
        version: 2,
        name: 'New Prebuilt rule A',
        description: 'New Non-customized prebuilt rule A',
      });
      const PREBUILT_RULE_ASSET_B = createRuleAssetSavedObject({
        rule_id: PREBUILT_RULE_ID_B,
        version: 1,
        name: 'Prebuilt rule B',
        description: 'Non-customized prebuilt rule B',
      });
      const NEW_PREBUILT_RULE_ASSET_B = createRuleAssetSavedObject({
        rule_id: PREBUILT_RULE_ID_B,
        version: 2,
        name: 'New Prebuilt rule B',
        description: 'New Non-customized prebuilt rule B',
      });

      it('shows side-by-side JSON diff view', () => {
        setUpRuleUpgrades({
          currentRuleAssets: [PREBUILT_RULE_ASSET_A, PREBUILT_RULE_ASSET_B],
          rulePatches: [{ rule_id: PREBUILT_RULE_ID_A, tags: ['customized'] }],
          newRuleAssets: [NEW_PREBUILT_RULE_ASSET_A, NEW_PREBUILT_RULE_ASSET_B],
        });
        visitRulesUpgradeTable();

        openPrebuiltRuleUpgradeFlyoutFor(PREBUILT_RULE_ASSET_A['security-rule'].name);
        selectPreviewTab(PREVIEW_TABS.JSON_VIEW);

        cy.get(UPDATE_PREBUILT_RULE_PREVIEW).contains('Current rule').should('be.visible');
        cy.get(UPDATE_PREBUILT_RULE_PREVIEW).contains('Elastic update').should('be.visible');

        cy.get(UPDATE_PREBUILT_RULE_PREVIEW).contains('"version": 1').should('be.visible');
        cy.get(UPDATE_PREBUILT_RULE_PREVIEW).contains('"version": 2').should('be.visible');

        cy.get(UPDATE_PREBUILT_RULE_PREVIEW)
          .contains('"name": "Prebuilt rule A"')
          .should('be.visible');

        closePrebuiltRuleUpgradeFlyout();

        openPrebuiltRuleUpgradeFlyoutFor(PREBUILT_RULE_ASSET_B['security-rule'].name);
        selectPreviewTab(PREVIEW_TABS.JSON_VIEW);

        /* Make sure the JSON diff is displayed for the newly selected rule */
        cy.get(UPDATE_PREBUILT_RULE_PREVIEW)
          .contains('"name": "Prebuilt rule B"')
          .should('be.visible');
        cy.get(UPDATE_PREBUILT_RULE_PREVIEW)
          .contains('"name": "Prebuilt rule A"')
          .should('not.exist');
      });

      it('omits dynamic properties in preview', () => {
        setUpRuleUpgrades({
          currentRuleAssets: [PREBUILT_RULE_ASSET_A, PREBUILT_RULE_ASSET_B],
          rulePatches: [{ rule_id: PREBUILT_RULE_ID_A, tags: ['customized'] }],
          newRuleAssets: [NEW_PREBUILT_RULE_ASSET_A, NEW_PREBUILT_RULE_ASSET_B],
        });
        visitRulesManagementTable();

        const dateBeforeRuleExecution = new Date();

        /* Enable a rule and wait for it to execute */
        enableRules({ names: [PREBUILT_RULE_ASSET_A['security-rule'].name] });
        waitForRulesToFinishExecution(
          [PREBUILT_RULE_ASSET_A['security-rule'].rule_id],
          dateBeforeRuleExecution
        );

        cy.intercept('POST', '/internal/detection_engine/prebuilt_rules/upgrade/_review').as(
          'updatePrebuiltRulesReview'
        );

        clickRuleUpdatesTab();

        /* Check that API response contains dynamic properties, like "enabled" and "execution_summary" */
        cy.wait('@updatePrebuiltRulesReview')
          .its('response.body')
          .then((body: ReviewRuleUpgradeResponseBody) => {
            const executedRuleInfo = body.rules.find(
              (ruleInfo) => ruleInfo.rule_id === PREBUILT_RULE_ASSET_A['security-rule'].rule_id
            );

            const enabled = executedRuleInfo?.current_rule?.enabled;
            expect(enabled).to.eql(true);

            const executionSummary = executedRuleInfo?.current_rule?.execution_summary;
            expect(executionSummary).to.not.eql(undefined);
          });

        /* Open the preview and check that dynamic properties are not shown in the diff */
        openPrebuiltRuleUpgradeFlyoutFor(PREBUILT_RULE_ASSET_A['security-rule'].name);

        cy.get(UPDATE_PREBUILT_RULE_PREVIEW).contains('enabled').should('not.exist');
        cy.get(UPDATE_PREBUILT_RULE_PREVIEW).contains('execution_summary').should('not.exist');
      });
    });

    describe('preview prebuilt rule upgrade in per-field diff view', () => {
      const PREBUILT_RULE_ID_A = 'test-prebuilt-rule-a';
      const PREBUILT_RULE_ID_B = 'test-prebuilt-rule-b';
      const PREBUILT_RULE_ASSET_A = createRuleAssetSavedObject({
        rule_id: PREBUILT_RULE_ID_A,
        version: 1,
        name: 'Prebuilt rule A',
        description: 'Non-customized prebuilt rule A',
      });
      const NEW_PREBUILT_RULE_ASSET_A = createRuleAssetSavedObject({
        rule_id: PREBUILT_RULE_ID_A,
        version: 2,
        name: 'New Prebuilt rule A',
        description: 'New Non-customized prebuilt rule A',
      });
      const PREBUILT_RULE_ASSET_B = createRuleAssetSavedObject({
        rule_id: PREBUILT_RULE_ID_B,
        version: 1,
        name: 'Prebuilt rule B',
        description: 'Non-customized prebuilt rule B',
      });
      const NEW_PREBUILT_RULE_ASSET_B = createRuleAssetSavedObject({
        rule_id: PREBUILT_RULE_ID_B,
        version: 2,
        name: 'New Prebuilt rule B',
        description: 'New Non-customized prebuilt rule B',
      });

      it('shows side-by-side per-field diff view', () => {
        setUpRuleUpgrades({
          currentRuleAssets: [PREBUILT_RULE_ASSET_A, PREBUILT_RULE_ASSET_B],
          rulePatches: [{ rule_id: PREBUILT_RULE_ID_A, tags: ['customized'] }],
          newRuleAssets: [NEW_PREBUILT_RULE_ASSET_A, NEW_PREBUILT_RULE_ASSET_B],
        });
        visitRulesUpgradeTable();

        openPrebuiltRuleUpgradeFlyoutFor(PREBUILT_RULE_ASSET_A['security-rule'].name);
        assertSelectedPreviewTab(PREVIEW_TABS.UPDATES); // Should be open by default

        const nameFieldUpgradeWrapper = FIELD_UPGRADE_WRAPPER('name');
        cy.get(nameFieldUpgradeWrapper).should('have.length', 1);
        cy.get(nameFieldUpgradeWrapper).last().contains('Name').should('be.visible');

        // expand Name field section
        cy.get(nameFieldUpgradeWrapper).last().contains('Name').click();

        cy.get(nameFieldUpgradeWrapper).last().contains('Prebuilt rule A').should('be.visible');
        cy.get(nameFieldUpgradeWrapper).last().contains('New Prebuilt rule A').should('be.visible');
      });

      it('shows rule type change upgrade', () => {
        const PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
          name: 'Query rule',
          rule_id: 'rule_id',
          version: 1,
          type: 'query',
          language: 'kuery',
        });
        const NEW_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
          language: 'eql',
          name: 'EQL rule',
          rule_id: 'rule_id',
          version: 2,
          type: 'eql',
        });

        setUpRuleUpgrades({
          currentRuleAssets: [PREBUILT_RULE_ASSET],
          rulePatches: [],
          newRuleAssets: [NEW_PREBUILT_RULE_ASSET],
        });
        visitRulesUpgradeTable();

        openPrebuiltRuleUpgradeFlyoutFor(PREBUILT_RULE_ASSET['security-rule'].name);
        assertSelectedPreviewTab(PREVIEW_TABS.UPDATES); // Should be open by default

        cy.get(UPDATE_PREBUILT_RULE_PREVIEW).contains('Current rule').should('be.visible');
        cy.get(UPDATE_PREBUILT_RULE_PREVIEW).contains('Elastic update').should('be.visible');

        cy.get(PER_FIELD_DIFF_WRAPPER).should('have.length', 5);

        cy.get(PER_FIELD_DIFF_DEFINITION_SECTION).contains('Type').should('be.visible');
        cy.get(PER_FIELD_DIFF_DEFINITION_SECTION).contains('query').should('be.visible');
        cy.get(PER_FIELD_DIFF_DEFINITION_SECTION).contains('eql').should('be.visible');

        cy.get(PER_FIELD_DIFF_DEFINITION_SECTION).contains('KQL query').should('exist');
        cy.get(PER_FIELD_DIFF_DEFINITION_SECTION).contains('EQL query').should('exist');
      });
    });

    describe('rule upgrade after preview', () => {
      const PREBUILT_RULE_ID = 'test-prebuilt-rule-a';
      const PREBUILT_RULE_PARAMS: Partial<PrebuiltRuleAsset> = {
        rule_id: PREBUILT_RULE_ID,
        version: 1,
        type: 'query',
        index: ['test-index-*'],
        query: '*:*',
        language: 'kuery',
        name: 'Prebuilt rule A',
        description: 'Non-customized prebuilt rule A',
        risk_score: 30,
        severity: 'low',
        rule_name_override: 'event.name',
        timestamp_override: 'event.timestamp',
        timestamp_override_fallback_disabled: true,
        timeline_id: 'test-timeline-1',
        timeline_title: 'Test timeline',
        license: 'Test license',
        note: 'Test note',
        building_block_type: 'default',
        investigation_fields: {
          field_names: ['fieldA', 'fieldB'],
        },
        tags: ['tag-a', 'tag-b'],
        enabled: false,
        risk_score_mapping: [
          {
            field: 'fieldB',
            operator: 'equals',
            value: 'low',
            risk_score: 30,
          },
        ],
        severity_mapping: [
          {
            field: 'fieldC',
            operator: 'equals',
            severity: 'low',
            value: 'low',
          },
        ],
        interval: '10m',
        from: 'now-20m',
        to: 'now',
        exceptions_list: [
          {
            id: 'test-exception-list',

            list_id: 'test-list-id',
            type: 'detection',
            namespace_type: 'agnostic',
          },
        ],
        author: ['Test'],
        false_positives: ['false-positive-1', 'false-positive-2'],
        references: ['http://reference-1', 'http://reference-2'],
        max_signals: 50,
        threat: [
          {
            framework: 'MITRE ATT&CK',
            tactic: {
              id: 'TA0001',
              name: 'Initial Access',
              reference: 'https://attack.mitre.org/tactics/TA0001/',
            },
            technique: [
              {
                id: 'T1078',
                name: 'Valid Accounts',
                reference: 'https://attack.mitre.org/techniques/T1078/',
                subtechnique: [
                  {
                    id: 'T1078.004',
                    name: 'Cloud Accounts',
                    reference: 'https://attack.mitre.org/techniques/T1078/004/',
                  },
                ],
              },
            ],
          },
        ],
        setup: 'Test investigation guide',
        related_integrations: [
          {
            package: 'google_workspace',
            version: '^2.31.0',
          },
        ],
        alert_suppression: {
          group_by: ['fieldA', 'fieldB'],
          duration: { value: 2, unit: 'h' },
          missing_fields_strategy: 'doNotSuppress',
        },
      };

      describe('AAB diff case', () => {
        const PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
          ...PREBUILT_RULE_PARAMS,
          rule_id: PREBUILT_RULE_ID,
          version: 2,
          name: 'Prebuilt rule',
        });
        const NEW_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
          ...PREBUILT_RULE_PARAMS,
          rule_id: PREBUILT_RULE_ID,
          version: 3,
          name: 'New Prebuilt rule',
        });

        it('upgrades a non-customized prebuilt rule', () => {
          setUpRuleUpgrades({
            currentRuleAssets: [PREBUILT_RULE_ASSET],
            rulePatches: [],
            newRuleAssets: [NEW_PREBUILT_RULE_ASSET],
          });
          visitRulesUpgradeTable();
          openPrebuiltRuleUpgradeFlyoutFor(PREBUILT_RULE_ASSET['security-rule'].name);

          // Upgrade the prebuilt rule
          cy.get(UPDATE_PREBUILT_RULE_BUTTON).click();

          assertRuleUpgradeSuccessToastShown([NEW_PREBUILT_RULE_ASSET]);
          assertRulesNotPresentInRuleUpdatesTable([NEW_PREBUILT_RULE_ASSET]);

          visitRulesManagementTable();
          expectRulesInTable(RULES_MANAGEMENT_TABLE, [
            NEW_PREBUILT_RULE_ASSET['security-rule'].name,
          ]);
        });

        it('customizes via flyout and upgrades a non-customized prebuilt rule', () => {
          setUpRuleUpgrades({
            currentRuleAssets: [PREBUILT_RULE_ASSET],
            rulePatches: [],
            newRuleAssets: [NEW_PREBUILT_RULE_ASSET],
          });
          visitRulesUpgradeTable();
          openPrebuiltRuleUpgradeFlyoutFor(PREBUILT_RULE_ASSET['security-rule'].name);

          // Enter a new rule name
          toggleFieldAccordion('name');
          switchFieldToEditMode('name');
          typeRuleName('Custom rule name');
          saveFieldValue('name');

          // Upgrade the prebuilt rule
          cy.get(UPDATE_PREBUILT_RULE_BUTTON).click();

          assertRuleUpgradeSuccessToastShown([NEW_PREBUILT_RULE_ASSET]);
          assertRulesNotPresentInRuleUpdatesTable([NEW_PREBUILT_RULE_ASSET]);

          visitRulesManagementTable();
          expectRulesInTable(RULES_MANAGEMENT_TABLE, ['Custom rule name']);
        });
      });

      describe('ABA diff case', () => {
        const PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
          ...PREBUILT_RULE_PARAMS,
          rule_id: PREBUILT_RULE_ID,
          version: 2,
          name: 'Prebuilt rule',
          tags: ['tag-a', 'tag-b'],
        });
        const NEW_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
          ...PREBUILT_RULE_PARAMS,
          rule_id: PREBUILT_RULE_ID,
          version: 3,
          name: 'New Prebuilt rule',
          tags: ['tag-a', 'tag-b'],
        });

        it('upgrades a customized prebuilt rule', () => {
          setUpRuleUpgrades({
            currentRuleAssets: [PREBUILT_RULE_ASSET],
            rulePatches: [{ rule_id: PREBUILT_RULE_ID, tags: ['custom-tag'] }],
            newRuleAssets: [NEW_PREBUILT_RULE_ASSET],
          });
          visitRulesUpgradeTable();
          openPrebuiltRuleUpgradeFlyoutFor(PREBUILT_RULE_ASSET['security-rule'].name);

          // Upgrade the prebuilt rule
          cy.get(UPDATE_PREBUILT_RULE_BUTTON).click();

          assertRuleUpgradeSuccessToastShown([NEW_PREBUILT_RULE_ASSET]);
          assertRulesNotPresentInRuleUpdatesTable([NEW_PREBUILT_RULE_ASSET]);

          visitRulesManagementTable();
          expectRulesInTable(RULES_MANAGEMENT_TABLE, [
            NEW_PREBUILT_RULE_ASSET['security-rule'].name,
          ]);
        });

        it('customizes via flyout and upgrades a customized prebuilt rule', () => {
          setUpRuleUpgrades({
            currentRuleAssets: [PREBUILT_RULE_ASSET],
            rulePatches: [{ rule_id: PREBUILT_RULE_ID, tags: ['custom-tag'] }],
            newRuleAssets: [NEW_PREBUILT_RULE_ASSET],
          });
          visitRulesUpgradeTable();
          openPrebuiltRuleUpgradeFlyoutFor(PREBUILT_RULE_ASSET['security-rule'].name);

          // Enter a new rule name
          toggleFieldAccordion('name');
          switchFieldToEditMode('name');
          typeRuleName('Custom rule name');
          saveFieldValue('name');

          // Upgrade the prebuilt rule
          cy.get(UPDATE_PREBUILT_RULE_BUTTON).click();

          assertRuleUpgradeSuccessToastShown([NEW_PREBUILT_RULE_ASSET]);
          assertRulesNotPresentInRuleUpdatesTable([NEW_PREBUILT_RULE_ASSET]);

          visitRulesManagementTable();
          expectRulesInTable(RULES_MANAGEMENT_TABLE, ['Custom rule name']);
        });
      });

      describe('ABC diff case (solvable conflict)', () => {
        const PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
          ...PREBUILT_RULE_PARAMS,
          rule_id: PREBUILT_RULE_ID,
          version: 2,
          name: 'Prebuilt rule',
          tags: ['tag-a', 'tag-b'],
        });
        const NEW_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
          ...PREBUILT_RULE_PARAMS,
          rule_id: PREBUILT_RULE_ID,
          version: 3,
          name: 'New Prebuilt rule',
          tags: ['tag-c', 'tag-d'],
        });

        it('upgrades a customized prebuilt rule', () => {
          setUpRuleUpgrades({
            currentRuleAssets: [PREBUILT_RULE_ASSET],
            rulePatches: [{ rule_id: PREBUILT_RULE_ID, tags: ['custom-tag'] }],
            newRuleAssets: [NEW_PREBUILT_RULE_ASSET],
          });
          visitRulesUpgradeTable();
          openPrebuiltRuleUpgradeFlyoutFor(PREBUILT_RULE_ASSET['security-rule'].name);

          acceptFieldValue('tags');

          // Upgrade the prebuilt rule
          cy.get(UPDATE_PREBUILT_RULE_BUTTON).click();

          assertRuleUpgradeSuccessToastShown([NEW_PREBUILT_RULE_ASSET]);
          assertRulesNotPresentInRuleUpdatesTable([NEW_PREBUILT_RULE_ASSET]);

          visitRulesManagementTable();
          expectRulesInTable(RULES_MANAGEMENT_TABLE, [
            NEW_PREBUILT_RULE_ASSET['security-rule'].name,
          ]);
        });

        it('customizes via flyout and upgrades a customized prebuilt rule', () => {
          setUpRuleUpgrades({
            currentRuleAssets: [PREBUILT_RULE_ASSET],
            rulePatches: [{ rule_id: PREBUILT_RULE_ID, tags: ['custom-tag'] }],
            newRuleAssets: [NEW_PREBUILT_RULE_ASSET],
          });
          visitRulesUpgradeTable();
          openPrebuiltRuleUpgradeFlyoutFor(PREBUILT_RULE_ASSET['security-rule'].name);

          acceptFieldValue('tags');

          // Enter a new rule name
          toggleFieldAccordion('name');
          switchFieldToEditMode('name');
          typeRuleName('Custom rule name');
          saveFieldValue('name');

          // Upgrade the prebuilt rule
          cy.get(UPDATE_PREBUILT_RULE_BUTTON).click();

          assertRuleUpgradeSuccessToastShown([NEW_PREBUILT_RULE_ASSET]);
          assertRulesNotPresentInRuleUpdatesTable([NEW_PREBUILT_RULE_ASSET]);

          visitRulesManagementTable();
          expectRulesInTable(RULES_MANAGEMENT_TABLE, ['Custom rule name']);
        });
      });

      describe('ABC diff case (non-solvable conflict)', () => {
        const PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
          ...PREBUILT_RULE_PARAMS,
          rule_id: PREBUILT_RULE_ID,
          version: 2,
          name: 'Prebuilt rule',
          query: 'fieldA : someValue',
          index: ['test-index-*'],
        });
        const NEW_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
          ...PREBUILT_RULE_PARAMS,
          rule_id: PREBUILT_RULE_ID,
          version: 3,
          name: 'New Prebuilt rule',
          query: 'fieldB : someValue AND fieldC : anotherValue',
          index: ['another-test-index-*', 'test-index-*'],
        });

        it('upgrades a customized prebuilt rule', () => {
          setUpRuleUpgrades({
            currentRuleAssets: [PREBUILT_RULE_ASSET],
            rulePatches: [{ rule_id: PREBUILT_RULE_ID, query: '*:*', index: ['my-index'] }],
            newRuleAssets: [NEW_PREBUILT_RULE_ASSET],
          });
          visitRulesUpgradeTable();
          openPrebuiltRuleUpgradeFlyoutFor(PREBUILT_RULE_ASSET['security-rule'].name);

          saveFieldValue('kql_query');
          acceptFieldValue('data_source');

          // Upgrade the prebuilt rule
          cy.get(UPDATE_PREBUILT_RULE_BUTTON).click();

          assertRuleUpgradeSuccessToastShown([NEW_PREBUILT_RULE_ASSET]);
          assertRulesNotPresentInRuleUpdatesTable([NEW_PREBUILT_RULE_ASSET]);

          visitRulesManagementTable();
          expectRulesInTable(RULES_MANAGEMENT_TABLE, [
            NEW_PREBUILT_RULE_ASSET['security-rule'].name,
          ]);
        });

        it('customizes via flyout and upgrades a customized prebuilt rule', () => {
          setUpRuleUpgrades({
            currentRuleAssets: [PREBUILT_RULE_ASSET],
            rulePatches: [{ rule_id: PREBUILT_RULE_ID, query: '*:*', index: ['my-index'] }],
            newRuleAssets: [NEW_PREBUILT_RULE_ASSET],
          });
          visitRulesUpgradeTable();
          openPrebuiltRuleUpgradeFlyoutFor(PREBUILT_RULE_ASSET['security-rule'].name);

          saveFieldValue('kql_query');
          acceptFieldValue('data_source');

          // Enter a new rule name
          toggleFieldAccordion('name');
          switchFieldToEditMode('name');
          typeRuleName('Custom rule name');
          saveFieldValue('name');

          // Upgrade the prebuilt rule
          cy.get(UPDATE_PREBUILT_RULE_BUTTON).click();

          assertRuleUpgradeSuccessToastShown([NEW_PREBUILT_RULE_ASSET]);
          assertRulesNotPresentInRuleUpdatesTable([NEW_PREBUILT_RULE_ASSET]);

          visitRulesManagementTable();
          expectRulesInTable(RULES_MANAGEMENT_TABLE, ['Custom rule name']);
        });
      });

      describe('-AB diff case (missing base version)', () => {
        const PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
          ...PREBUILT_RULE_PARAMS,
          rule_id: PREBUILT_RULE_ID,
          version: 2,
          name: 'Prebuilt rule',
          query: 'fieldA : someValue',
          index: ['test-index-*'],
        });
        const NEW_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
          ...PREBUILT_RULE_PARAMS,
          rule_id: PREBUILT_RULE_ID,
          version: 3,
          name: 'New Prebuilt rule',
          query: 'fieldB : someValue AND fieldC : anotherValue',
          index: ['another-test-index-*', 'test-index-*'],
        });

        it('upgrades a customized prebuilt rule', () => {
          setUpRuleUpgrades({
            currentRuleAssets: [PREBUILT_RULE_ASSET],
            rulePatches: [
              {
                rule_id: PREBUILT_RULE_ID,
                query: '*:*',
                index: ['my-index'],
                tags: ['custom-tag'],
              },
            ],
            newRuleAssets: [NEW_PREBUILT_RULE_ASSET],
            cleanUpCurrentRuleAssets: true,
          });
          visitRulesUpgradeTable();
          openPrebuiltRuleUpgradeFlyoutFor(PREBUILT_RULE_ASSET['security-rule'].name);

          acceptFieldValue('name');
          acceptFieldValue('kql_query');
          acceptFieldValue('data_source');
          acceptFieldValue('tags');

          // Upgrade the prebuilt rule
          cy.get(UPDATE_PREBUILT_RULE_BUTTON).click();

          assertRuleUpgradeSuccessToastShown([NEW_PREBUILT_RULE_ASSET]);
          assertRulesNotPresentInRuleUpdatesTable([NEW_PREBUILT_RULE_ASSET]);

          visitRulesManagementTable();
          expectRulesInTable(RULES_MANAGEMENT_TABLE, [
            NEW_PREBUILT_RULE_ASSET['security-rule'].name,
          ]);
        });

        it('customizes via flyout and upgrades a customized prebuilt rule', () => {
          setUpRuleUpgrades({
            currentRuleAssets: [PREBUILT_RULE_ASSET],
            rulePatches: [
              {
                rule_id: PREBUILT_RULE_ID,
                query: '*:*',
                index: ['my-index'],
                tags: ['custom-tag'],
              },
            ],
            newRuleAssets: [NEW_PREBUILT_RULE_ASSET],
            cleanUpCurrentRuleAssets: true,
          });
          visitRulesUpgradeTable();
          openPrebuiltRuleUpgradeFlyoutFor(PREBUILT_RULE_ASSET['security-rule'].name);

          acceptFieldValue('kql_query');
          acceptFieldValue('data_source');
          acceptFieldValue('tags');

          // Enter a new rule name
          switchFieldToEditMode('name');
          typeRuleName('Custom rule name');
          saveFieldValue('name');

          // Upgrade the prebuilt rule
          cy.get(UPDATE_PREBUILT_RULE_BUTTON).click();

          assertRuleUpgradeSuccessToastShown([NEW_PREBUILT_RULE_ASSET]);
          assertRulesNotPresentInRuleUpdatesTable([NEW_PREBUILT_RULE_ASSET]);

          visitRulesManagementTable();
          expectRulesInTable(RULES_MANAGEMENT_TABLE, ['Custom rule name']);
        });
      });
    });

    describe('type change upgrade', () => {
      const PREBUILT_RULE_ID = 'test-prebuilt-rule';
      const PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
        ...getPrebuiltRuleMockOfType('query'),
        rule_id: PREBUILT_RULE_ID,
        version: 1,
        name: 'Custom Query Non-Customized Prebuilt Rule',
      });
      const NEW_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
        ...getPrebuiltRuleMockOfType('esql'),
        rule_id: PREBUILT_RULE_ID,
        version: 2,
        name: 'New ESQL Non-Customized Prebuilt Rule',
      });

      it('upgrades a customized prebuilt rule to a different rule type', () => {
        setUpRuleUpgrades({
          currentRuleAssets: [PREBUILT_RULE_ASSET],
          rulePatches: [],
          newRuleAssets: [NEW_PREBUILT_RULE_ASSET],
        });
        visitRulesUpgradeTable();
        openPrebuiltRuleUpgradeFlyoutFor(PREBUILT_RULE_ASSET['security-rule'].name);

        // Assert a warning message is shown
        cy.contains(UPDATE_PREBUILT_RULE_PREVIEW, 'Rule type change').should('be.visible');

        // Upgrade the prebuilt rule
        cy.get(UPDATE_PREBUILT_RULE_BUTTON).click();

        assertRuleUpgradeSuccessToastShown([NEW_PREBUILT_RULE_ASSET]);
        assertRulesNotPresentInRuleUpdatesTable([NEW_PREBUILT_RULE_ASSET]);

        visitRulesManagementTable();
        expectRulesInTable(RULES_MANAGEMENT_TABLE, [NEW_PREBUILT_RULE_ASSET['security-rule'].name]);

        goToRuleDetailsOf(NEW_PREBUILT_RULE_ASSET['security-rule'].name);

        cy.contains('ES|QL').should('exist');
      });

      it('upgrades a non-customized prebuilt rule to a different rule type', () => {
        setUpRuleUpgrades({
          currentRuleAssets: [PREBUILT_RULE_ASSET],
          rulePatches: [{ rule_id: PREBUILT_RULE_ID, description: 'Custom prebuilt rule' }],
          newRuleAssets: [NEW_PREBUILT_RULE_ASSET],
        });
        visitRulesUpgradeTable();
        openPrebuiltRuleUpgradeFlyoutFor(PREBUILT_RULE_ASSET['security-rule'].name);

        // Assert a warning message is shown
        cy.contains(UPDATE_PREBUILT_RULE_PREVIEW, 'Rule type change').should('be.visible');

        // Upgrade the prebuilt rule
        cy.get(UPDATE_PREBUILT_RULE_BUTTON).click();

        assertRuleUpgradeSuccessToastShown([NEW_PREBUILT_RULE_ASSET]);
        assertRulesNotPresentInRuleUpdatesTable([NEW_PREBUILT_RULE_ASSET]);

        visitRulesManagementTable();
        expectRulesInTable(RULES_MANAGEMENT_TABLE, [NEW_PREBUILT_RULE_ASSET['security-rule'].name]);

        goToRuleDetailsOf(NEW_PREBUILT_RULE_ASSET['security-rule'].name);

        cy.contains('ES|QL').should('exist');
      });
    });

    describe('"Update rule" button in Prebuilt Rule Upgrade Flyout', () => {
      it('is disabled when num of conflicts >= 1', () => {
        const PREBUILT_RULE_ID = 'test-prebuilt-rule';
        const PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
          rule_id: PREBUILT_RULE_ID,
          version: 2,
          name: 'Test prebuilt rule',
        });
        const NEW_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
          rule_id: PREBUILT_RULE_ID,
          version: 3,
          name: 'New test prebuilt rule',
        });

        setUpRuleUpgrades({
          currentRuleAssets: [PREBUILT_RULE_ASSET],
          rulePatches: [{ rule_id: PREBUILT_RULE_ID, name: 'Customized prebuilt rule' }],
          newRuleAssets: [NEW_PREBUILT_RULE_ASSET],
        });
        visitRulesUpgradeTable();
        openPrebuiltRuleUpgradeFlyoutFor('Customized prebuilt rule');

        cy.get(UPDATE_PREBUILT_RULE_BUTTON).should('be.disabled');

        saveFieldValue('name');

        cy.get(UPDATE_PREBUILT_RULE_BUTTON).should('be.enabled');
      });

      it('is disabled when num fields in edit mode >= 1', () => {
        const PREBUILT_RULE_ID = 'test-prebuilt-rule';
        const PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
          rule_id: PREBUILT_RULE_ID,
          version: 2,
          name: 'Test prebuilt rule',
        });
        const NEW_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
          rule_id: PREBUILT_RULE_ID,
          version: 3,
          name: 'New test prebuilt rule',
        });

        setUpRuleUpgrades({
          currentRuleAssets: [PREBUILT_RULE_ASSET],
          rulePatches: [],
          newRuleAssets: [NEW_PREBUILT_RULE_ASSET],
        });
        visitRulesUpgradeTable();
        openPrebuiltRuleUpgradeFlyoutFor(PREBUILT_RULE_ASSET['security-rule'].name);

        toggleFieldAccordion('name');
        switchFieldToEditMode('name');

        cy.get(UPDATE_PREBUILT_RULE_BUTTON).should('be.disabled');

        saveFieldValue('name');

        cy.get(UPDATE_PREBUILT_RULE_BUTTON).should('be.enabled');
      });

      it('is disabled when num of conflicts >= 1 and num fields in edit mode >= 1', () => {
        const PREBUILT_RULE_ID = 'test-prebuilt-rule';
        const PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
          rule_id: PREBUILT_RULE_ID,
          version: 2,
          name: 'Test prebuilt rule',
          tags: ['tag-a'],
        });
        const NEW_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
          rule_id: PREBUILT_RULE_ID,
          version: 3,
          name: 'New test prebuilt rule',
          tags: ['tag-b'],
        });

        setUpRuleUpgrades({
          currentRuleAssets: [PREBUILT_RULE_ASSET],
          rulePatches: [{ rule_id: PREBUILT_RULE_ID, name: 'Customized prebuilt rule' }],
          newRuleAssets: [NEW_PREBUILT_RULE_ASSET],
        });
        visitRulesUpgradeTable();
        openPrebuiltRuleUpgradeFlyoutFor('Customized prebuilt rule');

        toggleFieldAccordion('tags');
        switchFieldToEditMode('tags');

        cy.get(UPDATE_PREBUILT_RULE_BUTTON).should('be.disabled');

        // Resolve name field conflicts
        saveFieldValue('name');

        // Make sure the "Update rule" button is still disabled
        cy.get(UPDATE_PREBUILT_RULE_BUTTON).should('be.disabled');

        // Cancel tags field value unchanged
        cancelFieldValue('tags');

        cy.get(UPDATE_PREBUILT_RULE_BUTTON).should('be.enabled');
      });
    });
  }
);

const commonProperties: Partial<PrebuiltRuleAsset> = {
  author: ['Elastic', 'Another author'],
  building_block_type: 'default',
  severity: 'medium',
  severity_mapping: [
    {
      field: 'Ransomware.severity',
      value: '50',
      operator: 'equals',
      severity: 'high',
    },
  ],
  risk_score: 20,
  risk_score_mapping: [
    {
      field: 'Ransomware.child_processes.score',
      operator: 'equals',
      risk_score: 30,
      value: '',
    },
  ],
  references: ['https://www.example.com/1', 'https://www.example.com/2'],
  false_positives: ['False positive example 1', 'False positive example 2'],
  investigation_fields: {
    field_names: ['Ransomware.files.path', 'Target.dll.name'],
  },
  license: 'MIT',
  rule_name_override: 'Endpoint.policy.applied.name',
  threat: [
    {
      framework: 'MITRE ATT&CK',
      tactic: {
        id: 'TA0009',
        reference: 'https://attack.mitre.org/tactics/TA0009',
        name: 'Collection',
      },
      technique: [
        {
          id: 'T1557',
          reference: 'https://attack.mitre.org/techniques/T1557',
          name: 'Adversary-in-the-Middle',
          subtechnique: [
            {
              id: 'T1557.002',
              reference: 'https://attack.mitre.org/techniques/T1557/002',
              name: 'ARP Cache Poisoning',
            },
          ],
        },
      ],
    },
  ],
  timestamp_override: 'Target.process.start',
  tags: ['tag-a', 'tag-b'],
  related_integrations: [
    { package: 'endpoint', version: '^8.2.0' },
    { package: 'windows', version: '^1.5.0' },
  ],
  required_fields: [
    { name: 'event.type', type: 'keyword' },
    { name: 'file.extension', type: 'keyword' },
  ],
  timeline_id: '3e827bab-838a-469f-bd1e-5e19a2bff2fd',
  timeline_title: 'Alerts Involving a Single User Timeline',
  interval: '5m',
  from: 'now-360s',
  note: 'Investigation guide content',
  setup: 'Setup guide content',
};

const filters = [
  {
    meta: {
      disabled: false,
      negate: false,
      alias: null,
      index: 'security-solution-default',
      key: 'Endpoint.policy.applied.artifacts.global.identifiers.name',
      field: 'Endpoint.policy.applied.artifacts.global.identifiers.name',
      value: 'exists',
      type: 'exists',
    },
    query: {
      exists: {
        field: 'Endpoint.policy.applied.artifacts.global.identifiers.name',
      },
    },
    $state: { store: 'appState' },
  },
];

const queryProperties: Partial<PrebuiltRuleAsset> = {
  query: '_id : *',
  language: 'kuery',
  filters,
};

const CUSTOM_QUERY_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
  name: 'Custom query index pattern rule',
  rule_id: 'custom_query_index_pattern_rule',
  ...(commonProperties as Record<string, unknown>),
  ...queryProperties,
  type: 'query',
  index: ['winlogbeat-*', 'logs-endpoint.events.*'],
  alert_suppression: {
    group_by: [
      'Endpoint.policy.applied.artifacts.global.identifiers.name',
      'Endpoint.policy.applied.id',
    ],
    duration: { unit: 'm', value: 5 },
    missing_fields_strategy: 'suppress',
  },
});

const UPDATED_CUSTOM_QUERY_PREBUILT_RULE_ASSET = {
  ...CUSTOM_QUERY_PREBUILT_RULE_ASSET,
  ['security-rule']: {
    ...CUSTOM_QUERY_PREBUILT_RULE_ASSET['security-rule'],
    query: '_id : * and event.type: start',
    version: 2,
  },
};

const SAVED_QUERY_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
  name: 'Custom query data view rule',
  rule_id: 'custom_query_data_view_rule',
  ...(commonProperties as Record<string, unknown>),
  type: 'saved_query',
  data_view_id: 'my-test-data-view-id',
  saved_id: '',
  language: 'kuery',
  index: ['winlogbeat-*', 'logs-endpoint.events.*'],
  alert_suppression: {
    group_by: [
      'Endpoint.policy.applied.artifacts.global.identifiers.name',
      'Endpoint.policy.applied.id',
    ],
    duration: { unit: 'm', value: 5 },
    missing_fields_strategy: 'suppress',
  },
  query: '',
});

const UPDATED_SAVED_QUERY_PREBUILT_RULE_ASSET = {
  ...SAVED_QUERY_PREBUILT_RULE_ASSET,
  ['security-rule']: {
    ...SAVED_QUERY_PREBUILT_RULE_ASSET['security-rule'],
    alert_suppression: {
      group_by: ['Endpoint.policy.applied.id'],
      duration: { unit: 'm', value: 10 },
      missing_fields_strategy: 'suppress',
    },
    version: 2,
  },
} as typeof SAVED_QUERY_PREBUILT_RULE_ASSET;

const MACHINE_LEARNING_PREBUILT_RULE_ASSET = omit(
  createRuleAssetSavedObject({
    name: 'Machine learning rule',
    rule_id: 'machine_learning_rule',
    ...commonProperties,
    type: 'machine_learning',
    anomaly_threshold: 65,
    machine_learning_job_id: ['auth_high_count_logon_events', 'auth_high_count_logon_fails'],
    alert_suppression: {
      group_by: ['host.name'],
      duration: { unit: 'm', value: 5 },
      missing_fields_strategy: 'suppress',
    },
  }),
  ['security-rule.query', 'security-rule.language']
) as Omit<
  ReturnType<typeof createRuleAssetSavedObject>,
  'security-rule.query' | 'security-rule.language'
>;

const UPDATED_MACHINE_LEARNING_PREBUILT_RULE_ASSET = {
  ...MACHINE_LEARNING_PREBUILT_RULE_ASSET,
  ['security-rule']: {
    ...MACHINE_LEARNING_PREBUILT_RULE_ASSET['security-rule'],
    anomaly_threshold: 99,
    version: 2,
  },
};

const THRESHOLD_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
  name: 'Threshold index pattern rule',
  rule_id: 'threshold_index_pattern_rule',
  ...commonProperties,
  ...queryProperties,
  type: 'threshold',
  language: 'lucene',
  index: ['winlogbeat-*', 'logs-endpoint.events.*'],
  threshold: {
    field: [
      'Endpoint.policy.applied.artifacts.user.identifiers.name',
      'Endpoint.policy.applied.id',
    ],
    value: 200,
    cardinality: [{ field: 'Ransomware.score', value: 3 }],
  },
  alert_suppression: undefined,
});

const UPDATED_THRESHOLD_PREBUILT_RULE_ASSET = {
  ...THRESHOLD_PREBUILT_RULE_ASSET,
  ['security-rule']: {
    ...THRESHOLD_PREBUILT_RULE_ASSET['security-rule'],
    threshold: {
      field: ['Endpoint.policy.applied.artifacts.user.identifiers.name'],
      value: 999,
      cardinality: [{ field: 'Ransomware.score', value: 10 }],
    },
    version: 2,
  },
};

const EQL_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
  name: 'Event correlation index pattern rule',
  rule_id: 'eql_index_pattern_rule',
  ...commonProperties,
  type: 'eql',
  language: 'eql',
  query: 'process where process.name == "regsvr32.exe"',
  index: ['winlogbeat-*', 'logs-endpoint.events.*'],
  filters,
  alert_suppression: undefined,
});

const UPDATED_EQL_INDEX_PATTERN_RULE = {
  ...EQL_PREBUILT_RULE_ASSET,
  ['security-rule']: {
    ...EQL_PREBUILT_RULE_ASSET['security-rule'],
    query: 'process where process.name == "regsvr32.exe" and process.pid == 1234',
    version: 2,
  },
};

const THREAT_MATCH_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
  name: 'Threat match index pattern rule',
  rule_id: 'threat_match_index_pattern_rule',
  ...commonProperties,
  ...queryProperties,
  type: 'threat_match',
  language: 'lucene',
  index: ['winlogbeat-*', 'logs-endpoint.events.*'],
  filters,
  threat_query: '@timestamp >= "now-30d/d"',
  threat_mapping: [
    {
      entries: [
        {
          field: 'file.hash.md5',
          type: 'mapping',
          value: 'threat.indicator.file.hash.md5',
        },
      ],
    },
  ],
  threat_index: ['filebeat-*', 'logs-ti_*'],
  threat_filters: [
    {
      $state: { store: 'appState' },
      meta: {
        disabled: false,
        key: 'event.category',
        negate: false,
        params: { query: 'threat' },
        type: 'phrase',
        alias: null,
      },
      query: { match_phrase: { 'event.category': 'threat' } },
    },
  ],
  threat_language: 'kuery',
  threat_indicator_path: 'threat.indicator',
  alert_suppression: undefined,
});

const UPDATED_THREAT_MATCH_PREBUILT_RULE_ASSET = {
  ...THREAT_MATCH_PREBUILT_RULE_ASSET,
  ['security-rule']: {
    ...THREAT_MATCH_PREBUILT_RULE_ASSET['security-rule'],
    threat_query: '@timestamp >= "now-60d/d"',
    version: 2,
  },
};

const NEW_TERMS_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
  name: 'New terms index pattern rule',
  rule_id: 'new_terms_index_pattern_rule',
  ...commonProperties,
  ...queryProperties,
  type: 'new_terms',
  query: '_id: *',
  new_terms_fields: ['Endpoint.policy.applied.id', 'Memory_protection.unique_key_v1'],
  history_window_start: 'now-9d',
  index: ['apm-*-transaction*', 'auditbeat-*'],
  language: 'lucene',
  filters: [
    {
      meta: {
        disabled: false,
        negate: false,
        alias: null,
        index: 'security-solution-default',
        key: 'Endpoint.policy.applied.artifacts.global.identifiers.name',
        field: 'Endpoint.policy.applied.artifacts.global.identifiers.name',
        value: 'exists',
        type: 'exists',
      },
      query: {
        exists: {
          field: 'Endpoint.policy.applied.artifacts.global.identifiers.name',
        },
      },
      $state: { store: 'appState' },
    },
  ],
  alert_suppression: undefined,
});

const UPDATED_NEW_TERMS_PREBUILT_RULE_ASSET = {
  ...NEW_TERMS_PREBUILT_RULE_ASSET,
  ['security-rule']: {
    ...NEW_TERMS_PREBUILT_RULE_ASSET['security-rule'],
    new_terms_fields: ['Endpoint.policy.applied.id', 'Memory_protection.unique_key_v2'],
    history_window_start: 'now-10d',
    version: 2,
  },
};

const ESQL_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
  name: 'ESQL rule',
  rule_id: 'esql_rule',
  ...commonProperties,
  type: 'esql',
  language: 'esql',
  query: 'FROM .alerts-security.alerts-default | STATS count = COUNT(@timestamp) BY @timestamp',
  alert_suppression: {
    group_by: [
      'Endpoint.policy.applied.artifacts.global.identifiers.name',
      'Endpoint.policy.applied.id',
    ],
    duration: { unit: 'm', value: 5 },
    missing_fields_strategy: 'suppress',
  },
});

const UPDATED_ESQL_PREBUILT_RULE_ASSET = {
  ...ESQL_PREBUILT_RULE_ASSET,
  ['security-rule']: {
    ...ESQL_PREBUILT_RULE_ASSET['security-rule'],
    query:
      'FROM .alerts-security.alerts-default | STATS count = COUNT(@timestamp) BY @timestamp, event.category',
    version: 2,
  },
};
