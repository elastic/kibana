/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { Filter } from '@kbn/es-query';
import type { ThreatMapping } from '@kbn/securitysolution-io-ts-alerting-types';
import type { PrebuiltRuleAsset } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules';
import type { ReviewRuleUpgradeResponseBody } from '@kbn/security-solution-plugin/common/api/detection_engine/prebuilt_rules/review_rule_upgrade/review_rule_upgrade_route';
import type { Threshold } from '@kbn/security-solution-plugin/common/api/detection_engine/model/rule_schema';
import { AlertSuppression } from '@kbn/security-solution-plugin/common/api/detection_engine/model/rule_schema';

import { createRuleAssetSavedObject } from '../../../../helpers/rules';
import {
  INSTALL_PREBUILT_RULE_BUTTON,
  INSTALL_PREBUILT_RULE_PREVIEW,
  UPDATE_PREBUILT_RULE_PREVIEW,
  UPDATE_PREBUILT_RULE_BUTTON,
  PER_FIELD_DIFF_WRAPPER,
  PER_FIELD_DIFF_DEFINITION_SECTION,
} from '../../../../screens/alerts_detection_rules';
import { RULE_MANAGEMENT_PAGE_BREADCRUMB } from '../../../../screens/breadcrumbs';
import {
  installPrebuiltRuleAssets,
  createAndInstallMockedPrebuiltRules,
  preventPrebuiltRulesPackageInstallation,
} from '../../../../tasks/api_calls/prebuilt_rules';
import { createSavedQuery, deleteSavedQueries } from '../../../../tasks/api_calls/saved_queries';
import { fetchMachineLearningModules } from '../../../../tasks/api_calls/machine_learning';
import { resetRulesTableState } from '../../../../tasks/common';
import { login } from '../../../../tasks/login';
import {
  assertRuleInstallationSuccessToastShown,
  assertRulesNotPresentInAddPrebuiltRulesTable,
  assertRulesNotPresentInRuleUpdatesTable,
  assertRulesPresentInInstalledRulesTable,
  assertRuleUpgradeSuccessToastShown,
  clickAddElasticRulesButton,
  clickRuleUpdatesTab,
} from '../../../../tasks/prebuilt_rules';
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
  closeRulePreview,
  openRuleInstallPreview,
  openRuleUpdatePreview,
  selectPreviewTab,
} from '../../../../tasks/prebuilt_rules_preview';
import { visitRulesManagementTable } from '../../../../tasks/rules_management';
import {
  deleteAlertsAndRules,
  deleteDataView,
  postDataView,
} from '../../../../tasks/api_calls/common';
import { enableRules, waitForRulesToFinishExecution } from '../../../../tasks/api_calls/rules';

const PREVIEW_TABS = {
  OVERVIEW: 'Overview',
  JSON_VIEW: 'JSON view',
  UPDATES: 'Updates', // Currently open by default on upgrade
};

describe(
  'Detection rules, Prebuilt Rules Installation and Update workflow',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  () => {
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

    const CUSTOM_QUERY_INDEX_PATTERN_RULE = createRuleAssetSavedObject({
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

    const SAVED_QUERY_DATA_VIEW_RULE = createRuleAssetSavedObject({
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

    const MACHINE_LEARNING_RULE = omit(
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

    const THRESHOLD_RULE_INDEX_PATTERN = createRuleAssetSavedObject({
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

    const EQL_INDEX_PATTERN_RULE = createRuleAssetSavedObject({
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

    const THREAT_MATCH_INDEX_PATTERN_RULE = createRuleAssetSavedObject({
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

    const NEW_TERMS_INDEX_PATTERN_RULE = createRuleAssetSavedObject({
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

    const ESQL_RULE = createRuleAssetSavedObject({
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

    const RULE_WITHOUT_INVESTIGATION_AND_SETUP_GUIDES = createRuleAssetSavedObject({
      name: 'Rule with hidden tabs and sections',
      rule_id: 'rule_without_investigation_and_setup_guides',
    });

    const testDataView = {
      indexPattern: 'test-*',
      name: 'My test data view',
      id: 'my-test-data-view-id',
    };

    const testSavedQuery = {
      query: 'agent.id: *',
      name: 'My test saved query',
      filterKey: 'agent.hostname',
    };

    beforeEach(() => {
      preventPrebuiltRulesPackageInstallation();

      login();
      resetRulesTableState();
      deleteAlertsAndRules();

      visitRulesManagementTable();
    });

    describe('Installation of prebuilt rules', () => {
      const RULE_1 = createRuleAssetSavedObject({
        name: 'Test rule 1',
        rule_id: 'rule_1',
      });

      const RULE_2 = createRuleAssetSavedObject({
        name: 'Test rule 2',
        rule_id: 'rule_2',
      });

      beforeEach(() => {
        installPrebuiltRuleAssets([RULE_1, RULE_2]);
        cy.intercept('POST', '/internal/detection_engine/prebuilt_rules/installation/_perform').as(
          'installPrebuiltRules'
        );
      });

      describe('Basic functionality', () => {
        it('User can preview rules available for installation', () => {
          clickAddElasticRulesButton();

          openRuleInstallPreview(RULE_1['security-rule'].name);
          closeRulePreview();
        });

        it('User can install a rule using the rule preview', () => {
          clickAddElasticRulesButton();

          openRuleInstallPreview(RULE_1['security-rule'].name);
          cy.get(INSTALL_PREBUILT_RULE_BUTTON).click();
          cy.wait('@installPrebuiltRules');
          assertRuleInstallationSuccessToastShown([RULE_1]);

          // Go back to rules table and assert that the rules are installed
          cy.get(RULE_MANAGEMENT_PAGE_BREADCRUMB).click();
          assertRulesPresentInInstalledRulesTable([RULE_1]);

          clickAddElasticRulesButton();
          assertRulesNotPresentInAddPrebuiltRulesTable([RULE_1]);
        });

        it('Tabs and sections without content should be hidden in preview before installing', () => {
          installPrebuiltRuleAssets([RULE_WITHOUT_INVESTIGATION_AND_SETUP_GUIDES]);

          clickAddElasticRulesButton();

          openRuleInstallPreview(RULE_WITHOUT_INVESTIGATION_AND_SETUP_GUIDES['security-rule'].name);

          cy.get(INSTALL_PREBUILT_RULE_PREVIEW).contains('Investigation guide').should('not.exist');
          cy.get(INSTALL_PREBUILT_RULE_PREVIEW).contains('Setup guide').should('not.exist');
        });
      });

      describe('User can see correct rule information in preview before installing', () => {
        beforeEach(() => {
          deleteDataView(testDataView.id);
          postDataView(testDataView.indexPattern, testDataView.name, testDataView.id);

          deleteSavedQueries();
          createSavedQuery(testSavedQuery.name, testSavedQuery.query, testSavedQuery.filterKey)
            .its('body.id')
            .then((id: string) => {
              (SAVED_QUERY_DATA_VIEW_RULE['security-rule'] as { saved_id: string }).saved_id = id;

              installPrebuiltRuleAssets([
                CUSTOM_QUERY_INDEX_PATTERN_RULE,
                SAVED_QUERY_DATA_VIEW_RULE,
                MACHINE_LEARNING_RULE,
                THRESHOLD_RULE_INDEX_PATTERN,
                EQL_INDEX_PATTERN_RULE,
                THREAT_MATCH_INDEX_PATTERN_RULE,
                NEW_TERMS_INDEX_PATTERN_RULE,
                ESQL_RULE,
                RULE_WITHOUT_INVESTIGATION_AND_SETUP_GUIDES,
              ]);
            });

          fetchMachineLearningModules()
            .its('body')
            .then((mlModules) => {
              cy.wrap(mlModules).as('mlModules');
            });
        });

        it('Custom query rule properties', () => {
          clickAddElasticRulesButton();

          openRuleInstallPreview(CUSTOM_QUERY_INDEX_PATTERN_RULE['security-rule'].name);

          assertCommonPropertiesShown(commonProperties);

          const { index } = CUSTOM_QUERY_INDEX_PATTERN_RULE['security-rule'] as {
            index: string[];
          };
          assertIndexPropertyShown(index);

          const { query } = CUSTOM_QUERY_INDEX_PATTERN_RULE['security-rule'] as { query: string };
          assertCustomQueryPropertyShown(query);

          const { filters: queryFilters } = CUSTOM_QUERY_INDEX_PATTERN_RULE['security-rule'] as {
            filters: Filter[];
          };
          assertFiltersPropertyShown(queryFilters);

          const { alert_suppression: alertSuppression } = CUSTOM_QUERY_INDEX_PATTERN_RULE[
            'security-rule'
          ] as { alert_suppression: AlertSuppression };
          assertAlertSuppressionPropertiesShown(alertSuppression);

          closeRulePreview();

          openRuleInstallPreview(SAVED_QUERY_DATA_VIEW_RULE['security-rule'].name);

          const { data_view_id: dataViewId } = SAVED_QUERY_DATA_VIEW_RULE['security-rule'] as {
            data_view_id: string;
          };
          assertDataViewPropertiesShown(dataViewId, testDataView.indexPattern);

          assertSavedQueryPropertiesShown(
            testSavedQuery.query,
            testSavedQuery.filterKey,
            testSavedQuery.name
          );
        });

        it('Machine learning rule properties', function () {
          const {
            name,
            alert_suppression: alertSuppression,
            anomaly_threshold: anomalyThreshold,
            machine_learning_job_id: machineLearningJobIds,
          } = MACHINE_LEARNING_RULE['security-rule'] as {
            name: string;
            anomaly_threshold: number;
            machine_learning_job_id: string[];
            alert_suppression: AlertSuppression;
          };

          clickAddElasticRulesButton();
          openRuleInstallPreview(name);

          assertCommonPropertiesShown(commonProperties);

          assertMachineLearningPropertiesShown(
            anomalyThreshold,
            machineLearningJobIds,
            this.mlModules
          );

          assertAlertSuppressionPropertiesShown(alertSuppression);
        });

        it('Threshold rule properties', () => {
          clickAddElasticRulesButton();

          openRuleInstallPreview(THRESHOLD_RULE_INDEX_PATTERN['security-rule'].name);

          assertCommonPropertiesShown(commonProperties);

          const { threshold } = THRESHOLD_RULE_INDEX_PATTERN['security-rule'] as {
            threshold: Threshold;
          };
          assertThresholdPropertyShown(threshold);

          const { index } = THRESHOLD_RULE_INDEX_PATTERN['security-rule'] as { index: string[] };
          assertIndexPropertyShown(index);

          const { query } = THRESHOLD_RULE_INDEX_PATTERN['security-rule'] as { query: string };
          assertCustomQueryPropertyShown(query);

          const { filters: queryFilters } = THRESHOLD_RULE_INDEX_PATTERN['security-rule'] as {
            filters: Filter[];
          };
          assertFiltersPropertyShown(queryFilters);
        });

        it('EQL rule properties', () => {
          clickAddElasticRulesButton();

          openRuleInstallPreview(EQL_INDEX_PATTERN_RULE['security-rule'].name);

          assertCommonPropertiesShown(commonProperties);

          const { query } = EQL_INDEX_PATTERN_RULE['security-rule'] as { query: string };
          assertEqlQueryPropertyShown(query);

          const { filters: queryFilters } = EQL_INDEX_PATTERN_RULE['security-rule'] as {
            filters: Filter[];
          };
          assertFiltersPropertyShown(queryFilters);
        });

        it('Indicator match rule properties', () => {
          clickAddElasticRulesButton();

          openRuleInstallPreview(THREAT_MATCH_INDEX_PATTERN_RULE['security-rule'].name);

          assertCommonPropertiesShown(commonProperties);

          const {
            threat_index: threatIndex,
            threat_mapping: threatMapping,
            threat_filters: threatFilters,
            threat_query: threatQuery,
          } = THREAT_MATCH_INDEX_PATTERN_RULE['security-rule'] as {
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

          const { filters: queryFilters } = THREAT_MATCH_INDEX_PATTERN_RULE['security-rule'] as {
            filters: Filter[];
          };
          assertFiltersPropertyShown(queryFilters);

          const { index } = THREAT_MATCH_INDEX_PATTERN_RULE['security-rule'] as {
            index: string[];
          };
          assertIndexPropertyShown(index);

          const { query } = THREAT_MATCH_INDEX_PATTERN_RULE['security-rule'] as { query: string };
          assertCustomQueryPropertyShown(query);
        });

        it('New terms rule properties', () => {
          clickAddElasticRulesButton();

          openRuleInstallPreview(NEW_TERMS_INDEX_PATTERN_RULE['security-rule'].name);

          assertCommonPropertiesShown(commonProperties);

          const { new_terms_fields: newTermsFields } = NEW_TERMS_INDEX_PATTERN_RULE[
            'security-rule'
          ] as {
            new_terms_fields: string[];
          };
          assertNewTermsFieldsPropertyShown(newTermsFields);

          const { history_window_start: historyWindowStart } = NEW_TERMS_INDEX_PATTERN_RULE[
            'security-rule'
          ] as { history_window_start: string };
          assertWindowSizePropertyShown(historyWindowStart);

          const { filters: queryFilters } = NEW_TERMS_INDEX_PATTERN_RULE['security-rule'] as {
            filters: Filter[];
          };
          assertFiltersPropertyShown(queryFilters);

          const { index } = NEW_TERMS_INDEX_PATTERN_RULE['security-rule'] as { index: string[] };
          assertIndexPropertyShown(index);

          const { query } = NEW_TERMS_INDEX_PATTERN_RULE['security-rule'] as { query: string };
          assertCustomQueryPropertyShown(query);
        });

        it('ESQL rule properties', () => {
          clickAddElasticRulesButton();

          openRuleInstallPreview(ESQL_RULE['security-rule'].name);

          assertCommonPropertiesShown(commonProperties);

          const { query } = ESQL_RULE['security-rule'] as { query: string };
          assertEsqlQueryPropertyShown(query);

          const { alert_suppression: alertSuppression } = ESQL_RULE['security-rule'] as {
            alert_suppression: AlertSuppression;
          };
          assertAlertSuppressionPropertiesShown(alertSuppression);
        });
      });
    });

    describe('Upgrade of prebuilt rules', () => {
      const RULE_1_ID = 'rule_1';
      const RULE_2_ID = 'rule_2';
      const OUTDATED_RULE_1 = createRuleAssetSavedObject({
        name: 'Outdated rule 1',
        rule_id: RULE_1_ID,
        version: 1,
      });
      const UPDATED_RULE_1 = createRuleAssetSavedObject({
        name: 'Updated rule 1',
        rule_id: RULE_1_ID,
        version: 2,
      });
      const OUTDATED_RULE_2 = createRuleAssetSavedObject({
        name: 'Outdated rule 2',
        rule_id: RULE_2_ID,
        version: 1,
      });
      const UPDATED_RULE_2 = createRuleAssetSavedObject({
        name: 'Updated rule 2',
        rule_id: RULE_2_ID,
        version: 2,
      });
      beforeEach(() => {
        cy.intercept('POST', '/internal/detection_engine/prebuilt_rules/upgrade/_perform').as(
          'updatePrebuiltRules'
        );
        /* Create a new rule and install it */
        createAndInstallMockedPrebuiltRules([OUTDATED_RULE_1, OUTDATED_RULE_2]);
        /* Create a second version of the rule, making it available for update */
        installPrebuiltRuleAssets([UPDATED_RULE_1, UPDATED_RULE_2]);

        visitRulesManagementTable();
      });

      describe('Basic functionality', () => {
        it('User can preview rules available for upgrade', () => {
          clickRuleUpdatesTab();

          openRuleUpdatePreview(OUTDATED_RULE_1['security-rule'].name);
          cy.get(UPDATE_PREBUILT_RULE_BUTTON).click();
          cy.wait('@updatePrebuiltRules');

          assertRuleUpgradeSuccessToastShown([OUTDATED_RULE_1]);
          cy.get(RULE_MANAGEMENT_PAGE_BREADCRUMB).click();

          assertRulesNotPresentInRuleUpdatesTable([OUTDATED_RULE_1]);
        });

        it('User can upgrade a rule using the rule preview', () => {
          clickRuleUpdatesTab();

          openRuleUpdatePreview(OUTDATED_RULE_1['security-rule'].name);
          closeRulePreview();
        });

        it('Tabs and sections without content should be hidden in preview before upgrading', () => {
          const UPDATED_RULE_WITHOUT_INVESTIGATION_AND_SETUP_GUIDES = {
            ...RULE_WITHOUT_INVESTIGATION_AND_SETUP_GUIDES,
            ['security-rule']: {
              ...RULE_WITHOUT_INVESTIGATION_AND_SETUP_GUIDES['security-rule'],
              version: 2,
            },
          };

          createAndInstallMockedPrebuiltRules([RULE_WITHOUT_INVESTIGATION_AND_SETUP_GUIDES]);

          installPrebuiltRuleAssets([UPDATED_RULE_WITHOUT_INVESTIGATION_AND_SETUP_GUIDES]);

          cy.reload();

          clickRuleUpdatesTab();

          openRuleUpdatePreview(
            UPDATED_RULE_WITHOUT_INVESTIGATION_AND_SETUP_GUIDES['security-rule'].name
          );
          cy.get(UPDATE_PREBUILT_RULE_PREVIEW).contains('Investigation guide').should('not.exist');
          cy.get(UPDATE_PREBUILT_RULE_PREVIEW).contains('Setup guide').should('not.exist');
        });
      });

      describe('User can see correct rule information in preview before upgrading', () => {
        const UPDATED_CUSTOM_QUERY_INDEX_PATTERN_RULE = {
          ...CUSTOM_QUERY_INDEX_PATTERN_RULE,
          ['security-rule']: {
            ...CUSTOM_QUERY_INDEX_PATTERN_RULE['security-rule'],
            query: '_id : * and event.type: start',
            version: 2,
          },
        };

        const UPDATED_SAVED_QUERY_DATA_VIEW_RULE = {
          ...SAVED_QUERY_DATA_VIEW_RULE,
          ['security-rule']: {
            ...SAVED_QUERY_DATA_VIEW_RULE['security-rule'],
            alert_suppression: {
              group_by: ['Endpoint.policy.applied.id'],
              duration: { unit: 'm', value: 10 },
              missing_fields_strategy: 'suppress',
            },
            version: 2,
          },
        } as typeof SAVED_QUERY_DATA_VIEW_RULE;

        const UPDATED_MACHINE_LEARNING_RULE = {
          ...MACHINE_LEARNING_RULE,
          ['security-rule']: {
            ...MACHINE_LEARNING_RULE['security-rule'],
            anomaly_threshold: 99,
            version: 2,
          },
        };

        const UPDATED_THRESHOLD_RULE_INDEX_PATTERN = {
          ...THRESHOLD_RULE_INDEX_PATTERN,
          ['security-rule']: {
            ...THRESHOLD_RULE_INDEX_PATTERN['security-rule'],
            threshold: {
              field: ['Endpoint.policy.applied.artifacts.user.identifiers.name'],
              value: 999,
              cardinality: [{ field: 'Ransomware.score', value: 10 }],
            },
            version: 2,
          },
        };

        const UPDATED_EQL_INDEX_PATTERN_RULE = {
          ...EQL_INDEX_PATTERN_RULE,
          ['security-rule']: {
            ...EQL_INDEX_PATTERN_RULE['security-rule'],
            query: 'process where process.name == "regsvr32.exe" and process.pid == 1234',
            version: 2,
          },
        };

        const UPDATED_THREAT_MATCH_INDEX_PATTERN_RULE = {
          ...THREAT_MATCH_INDEX_PATTERN_RULE,
          ['security-rule']: {
            ...THREAT_MATCH_INDEX_PATTERN_RULE['security-rule'],
            threat_query: '@timestamp >= "now-60d/d"',
            version: 2,
          },
        };

        const UPDATED_NEW_TERMS_INDEX_PATTERN_RULE = {
          ...NEW_TERMS_INDEX_PATTERN_RULE,
          ['security-rule']: {
            ...NEW_TERMS_INDEX_PATTERN_RULE['security-rule'],
            new_terms_fields: ['Endpoint.policy.applied.id', 'Memory_protection.unique_key_v2'],
            history_window_start: 'now-10d',
            version: 2,
          },
        };

        const UPDATED_ESQL_RULE = {
          ...ESQL_RULE,
          ['security-rule']: {
            ...ESQL_RULE['security-rule'],
            query:
              'FROM .alerts-security.alerts-default | STATS count = COUNT(@timestamp) BY @timestamp, event.category',
            version: 2,
          },
        };

        beforeEach(() => {
          deleteDataView(testDataView.id);
          postDataView(testDataView.indexPattern, testDataView.name, testDataView.id);

          deleteSavedQueries();
          createSavedQuery(testSavedQuery.name, testSavedQuery.query, testSavedQuery.filterKey)
            .its('body.id')
            .then((id: string) => {
              (
                UPDATED_SAVED_QUERY_DATA_VIEW_RULE['security-rule'] as { saved_id: string }
              ).saved_id = id;

              createAndInstallMockedPrebuiltRules([
                CUSTOM_QUERY_INDEX_PATTERN_RULE,
                SAVED_QUERY_DATA_VIEW_RULE,
                MACHINE_LEARNING_RULE,
                THRESHOLD_RULE_INDEX_PATTERN,
                EQL_INDEX_PATTERN_RULE,
                THREAT_MATCH_INDEX_PATTERN_RULE,
                NEW_TERMS_INDEX_PATTERN_RULE,
                ESQL_RULE,
              ]);

              installPrebuiltRuleAssets([
                UPDATED_CUSTOM_QUERY_INDEX_PATTERN_RULE,
                UPDATED_SAVED_QUERY_DATA_VIEW_RULE,
                UPDATED_MACHINE_LEARNING_RULE,
                UPDATED_THRESHOLD_RULE_INDEX_PATTERN,
                UPDATED_EQL_INDEX_PATTERN_RULE,
                UPDATED_THREAT_MATCH_INDEX_PATTERN_RULE,
                UPDATED_NEW_TERMS_INDEX_PATTERN_RULE,
                UPDATED_ESQL_RULE,
              ]);

              cy.reload();
            });

          fetchMachineLearningModules()
            .its('body')
            .then((mlModules) => {
              cy.wrap(mlModules).as('mlModules');
            });
        });

        it('Custom query rule properties', () => {
          clickRuleUpdatesTab();

          openRuleUpdatePreview(UPDATED_CUSTOM_QUERY_INDEX_PATTERN_RULE['security-rule'].name);
          selectPreviewTab(PREVIEW_TABS.OVERVIEW);

          const { index } = UPDATED_CUSTOM_QUERY_INDEX_PATTERN_RULE['security-rule'] as {
            index: string[];
          };
          assertIndexPropertyShown(index);

          const { query } = UPDATED_CUSTOM_QUERY_INDEX_PATTERN_RULE['security-rule'] as {
            query: string;
          };
          assertCustomQueryPropertyShown(query);

          const { filters: queryFilters } = UPDATED_CUSTOM_QUERY_INDEX_PATTERN_RULE[
            'security-rule'
          ] as {
            filters: Filter[];
          };
          assertFiltersPropertyShown(queryFilters);

          const { alert_suppression: alertSuppression } = UPDATED_CUSTOM_QUERY_INDEX_PATTERN_RULE[
            'security-rule'
          ] as { alert_suppression: AlertSuppression };
          assertAlertSuppressionPropertiesShown(alertSuppression);

          closeRulePreview();

          openRuleUpdatePreview(UPDATED_SAVED_QUERY_DATA_VIEW_RULE['security-rule'].name);
          selectPreviewTab(PREVIEW_TABS.OVERVIEW);

          const { data_view_id: dataViewId } = UPDATED_SAVED_QUERY_DATA_VIEW_RULE[
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

        it('Machine learning rule properties', function () {
          clickRuleUpdatesTab();

          openRuleUpdatePreview(UPDATED_MACHINE_LEARNING_RULE['security-rule'].name);
          selectPreviewTab(PREVIEW_TABS.OVERVIEW);

          assertCommonPropertiesShown(commonProperties);

          const {
            anomaly_threshold: anomalyThreshold,
            machine_learning_job_id: machineLearningJobIds,
          } = UPDATED_MACHINE_LEARNING_RULE['security-rule'] as {
            anomaly_threshold: number;
            machine_learning_job_id: string[];
          };
          assertMachineLearningPropertiesShown(
            anomalyThreshold,
            machineLearningJobIds,
            this.mlModules
          );
        });

        it('Threshold rule properties', () => {
          clickRuleUpdatesTab();

          openRuleUpdatePreview(UPDATED_THRESHOLD_RULE_INDEX_PATTERN['security-rule'].name);
          selectPreviewTab(PREVIEW_TABS.OVERVIEW);

          assertCommonPropertiesShown(commonProperties);

          const { threshold } = UPDATED_THRESHOLD_RULE_INDEX_PATTERN['security-rule'] as {
            threshold: Threshold;
          };
          assertThresholdPropertyShown(threshold);

          const { index } = UPDATED_THRESHOLD_RULE_INDEX_PATTERN['security-rule'] as {
            index: string[];
          };
          assertIndexPropertyShown(index);

          const { query } = UPDATED_THRESHOLD_RULE_INDEX_PATTERN['security-rule'] as {
            query: string;
          };
          assertCustomQueryPropertyShown(query);

          const { filters: queryFilters } = UPDATED_THRESHOLD_RULE_INDEX_PATTERN[
            'security-rule'
          ] as {
            filters: Filter[];
          };
          assertFiltersPropertyShown(queryFilters);
        });

        it('EQL rule properties', () => {
          clickRuleUpdatesTab();

          openRuleUpdatePreview(UPDATED_EQL_INDEX_PATTERN_RULE['security-rule'].name);
          selectPreviewTab(PREVIEW_TABS.OVERVIEW);

          assertCommonPropertiesShown(commonProperties);

          const { query } = UPDATED_EQL_INDEX_PATTERN_RULE['security-rule'] as { query: string };
          assertEqlQueryPropertyShown(query);

          const { filters: queryFilters } = UPDATED_EQL_INDEX_PATTERN_RULE['security-rule'] as {
            filters: Filter[];
          };
          assertFiltersPropertyShown(queryFilters);
        });

        it('Indicator match rule properties', () => {
          clickRuleUpdatesTab();

          openRuleUpdatePreview(UPDATED_THREAT_MATCH_INDEX_PATTERN_RULE['security-rule'].name);
          selectPreviewTab(PREVIEW_TABS.OVERVIEW);

          assertCommonPropertiesShown(commonProperties);

          const {
            threat_index: threatIndex,
            threat_mapping: threatMapping,
            threat_filters: threatFilters,
            threat_query: threatQuery,
          } = UPDATED_THREAT_MATCH_INDEX_PATTERN_RULE['security-rule'] as {
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

          const { filters: queryFilters } = UPDATED_THREAT_MATCH_INDEX_PATTERN_RULE[
            'security-rule'
          ] as {
            filters: Filter[];
          };
          assertFiltersPropertyShown(queryFilters);

          const { index } = UPDATED_THREAT_MATCH_INDEX_PATTERN_RULE['security-rule'] as {
            index: string[];
          };
          assertIndexPropertyShown(index);

          const { query } = UPDATED_THREAT_MATCH_INDEX_PATTERN_RULE['security-rule'] as {
            query: string;
          };
          assertCustomQueryPropertyShown(query);
        });

        it('New terms rule properties', () => {
          clickRuleUpdatesTab();

          openRuleUpdatePreview(UPDATED_NEW_TERMS_INDEX_PATTERN_RULE['security-rule'].name);
          selectPreviewTab(PREVIEW_TABS.OVERVIEW);

          assertCommonPropertiesShown(commonProperties);

          const { new_terms_fields: newTermsFields } = UPDATED_NEW_TERMS_INDEX_PATTERN_RULE[
            'security-rule'
          ] as { new_terms_fields: string[] };
          assertNewTermsFieldsPropertyShown(newTermsFields);

          const { history_window_start: historyWindowStart } = UPDATED_NEW_TERMS_INDEX_PATTERN_RULE[
            'security-rule'
          ] as { history_window_start: string };
          assertWindowSizePropertyShown(historyWindowStart);

          const { filters: queryFilters } = UPDATED_NEW_TERMS_INDEX_PATTERN_RULE[
            'security-rule'
          ] as {
            filters: Filter[];
          };
          assertFiltersPropertyShown(queryFilters);

          const { index } = UPDATED_NEW_TERMS_INDEX_PATTERN_RULE['security-rule'] as {
            index: string[];
          };
          assertIndexPropertyShown(index);

          const { query } = UPDATED_NEW_TERMS_INDEX_PATTERN_RULE['security-rule'] as {
            query: string;
          };
          assertCustomQueryPropertyShown(query);
        });

        it('ESQL rule properties', () => {
          clickRuleUpdatesTab();

          openRuleUpdatePreview(UPDATED_ESQL_RULE['security-rule'].name);
          selectPreviewTab(PREVIEW_TABS.OVERVIEW);

          assertCommonPropertiesShown(commonProperties);

          const { query } = UPDATED_ESQL_RULE['security-rule'] as { query: string };
          assertEsqlQueryPropertyShown(query);

          const { alert_suppression: alertSuppression } = UPDATED_ESQL_RULE['security-rule'] as {
            alert_suppression: AlertSuppression;
          };
          assertAlertSuppressionPropertiesShown(alertSuppression);
        });
      });

      describe('Viewing rule changes in JSON diff view', () => {
        it('User can see changes in a side-by-side JSON diff view', () => {
          clickRuleUpdatesTab();

          openRuleUpdatePreview(OUTDATED_RULE_1['security-rule'].name);
          selectPreviewTab(PREVIEW_TABS.JSON_VIEW);

          cy.get(UPDATE_PREBUILT_RULE_PREVIEW).contains('Current rule').should('be.visible');
          cy.get(UPDATE_PREBUILT_RULE_PREVIEW).contains('Elastic update').should('be.visible');

          cy.get(UPDATE_PREBUILT_RULE_PREVIEW).contains('"version": 1').should('be.visible');
          cy.get(UPDATE_PREBUILT_RULE_PREVIEW).contains('"version": 2').should('be.visible');

          cy.get(UPDATE_PREBUILT_RULE_PREVIEW)
            .contains('"name": "Outdated rule 1"')
            .should('be.visible');

          closeRulePreview();

          openRuleUpdatePreview(OUTDATED_RULE_2['security-rule'].name);
          selectPreviewTab(PREVIEW_TABS.JSON_VIEW);

          /* Make sure the JSON diff is displayed for the newly selected rule */
          cy.get(UPDATE_PREBUILT_RULE_PREVIEW)
            .contains('"name": "Outdated rule 2"')
            .should('be.visible');
          cy.get(UPDATE_PREBUILT_RULE_PREVIEW)
            .contains('"name": "Outdated rule 1"')
            .should('not.exist');
        });

        it('Dynamic properties should not be included in preview', () => {
          const dateBeforeRuleExecution = new Date();

          /* Enable a rule and wait for it to execute */
          enableRules({ names: [OUTDATED_RULE_1['security-rule'].name] });
          waitForRulesToFinishExecution(
            [OUTDATED_RULE_1['security-rule'].rule_id],
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
                (ruleInfo) => ruleInfo.rule_id === OUTDATED_RULE_1['security-rule'].rule_id
              );

              const enabled = executedRuleInfo?.current_rule?.enabled;
              expect(enabled).to.eql(true);

              const executionSummary = executedRuleInfo?.current_rule?.execution_summary;
              expect(executionSummary).to.not.eql(undefined);
            });

          /* Open the preview and check that dynamic properties are not shown in the diff */
          openRuleUpdatePreview(OUTDATED_RULE_1['security-rule'].name);

          cy.get(UPDATE_PREBUILT_RULE_PREVIEW).contains('enabled').should('not.exist');
          cy.get(UPDATE_PREBUILT_RULE_PREVIEW).contains('execution_summary').should('not.exist');
        });
      });

      describe('Viewing rule changes in per-field diff view', () => {
        it('User can see changes in a side-by-side per-field diff view', () => {
          clickRuleUpdatesTab();

          openRuleUpdatePreview(OUTDATED_RULE_1['security-rule'].name);
          assertSelectedPreviewTab(PREVIEW_TABS.UPDATES); // Should be open by default

          cy.get(UPDATE_PREBUILT_RULE_PREVIEW).contains('Current rule').should('be.visible');
          cy.get(UPDATE_PREBUILT_RULE_PREVIEW).contains('Elastic update').should('be.visible');

          cy.get(PER_FIELD_DIFF_WRAPPER).should('have.length', 2);

          /* Version should be the first field in the order */
          cy.get(PER_FIELD_DIFF_WRAPPER).first().contains('Version').should('be.visible');
          cy.get(PER_FIELD_DIFF_WRAPPER).first().contains('1').should('be.visible');
          cy.get(PER_FIELD_DIFF_WRAPPER).first().contains('2').should('be.visible');

          cy.get(PER_FIELD_DIFF_WRAPPER).last().contains('Name').should('be.visible');
          cy.get(PER_FIELD_DIFF_WRAPPER).last().contains('Outdated rule 1').should('be.visible');
          cy.get(PER_FIELD_DIFF_WRAPPER).last().contains('Updated rule 1').should('be.visible');
        });

        it('User can see changes when updated rule is a different rule type', () => {
          const OUTDATED_RULE_WITH_QUERY_TYPE = createRuleAssetSavedObject({
            name: 'Query rule',
            rule_id: 'rule_id',
            version: 1,
            type: 'query',
            language: 'kuery',
          });
          const UPDATED_RULE_WITH_EQL_TYPE = createRuleAssetSavedObject({
            language: 'eql',
            name: 'EQL rule',
            rule_id: 'rule_id',
            version: 2,
            type: 'eql',
          });
          /* Create a new rule and install it */
          createAndInstallMockedPrebuiltRules([OUTDATED_RULE_WITH_QUERY_TYPE]);
          /* Create a second version of the rule, making it available for update */
          installPrebuiltRuleAssets([UPDATED_RULE_WITH_EQL_TYPE]);

          cy.reload();
          clickRuleUpdatesTab();

          openRuleUpdatePreview(OUTDATED_RULE_WITH_QUERY_TYPE['security-rule'].name);
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
    });
  }
);
