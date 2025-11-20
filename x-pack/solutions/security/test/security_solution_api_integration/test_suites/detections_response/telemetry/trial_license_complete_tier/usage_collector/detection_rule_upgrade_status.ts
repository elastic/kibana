/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import { customizeRule, getStats } from '../../../utils';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  deleteAllPrebuiltRuleAssets,
  getPrebuiltRulesStatus,
  createRuleAssetSavedObject,
  createPrebuiltRuleAssetSavedObjects,
  installPrebuiltRules,
} from '../../../utils';

/**
 * Test suite for detection rule upgrade status telemetry.
 *
 * This suite tests the telemetry metrics for upgradeable prebuilt rules,
 * verifying that the system correctly tracks:
 * - Total number of upgradeable rules
 * - Number of customized vs non-customized rules
 * - Number of enabled vs disabled rules
 */
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI Prebuilt Rules status', () => {
    describe('snapshot telemetry for upgradeable rules', () => {
      // Test constants
      const RULES_COUNT = 4;
      const INITIAL_TELEMETRY_STATE = {
        total: 0,
        customized: 0,
        enabled: 0,
        disabled: 0,
      };

      beforeEach(async () => {
        await deleteAllPrebuiltRuleAssets(es, log);
        await deleteAllRules(supertest, log);
      });

      /**
       * Creates a set of rule asset saved objects for testing.
       * Each rule has a unique ID and version number.
       */
      const getRuleAssetSavedObjects = () => [
        createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1 }),
        createRuleAssetSavedObject({ rule_id: 'rule-2', version: 2 }),
        createRuleAssetSavedObject({ rule_id: 'rule-3', version: 3 }),
        createRuleAssetSavedObject({ rule_id: 'rule-4', version: 4 }),
      ];

      /**
       * Sets up the initial test environment with prebuilt rules.
       * This includes creating rule assets and installing them.
       */
      const setupInitialRules = async () => {
        const ruleAssetSavedObjects = getRuleAssetSavedObjects();
        await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);
        await installPrebuiltRules(es, supertest);
        return ruleAssetSavedObjects;
      };

      /**
       * Creates upgradeable rules by incrementing versions and verifies the setup.
       * @param ruleAssetSavedObjects - Array of rule assets to make upgradeable
       * @param ruleIndices - Indices of rules to make upgradeable
       * @returns The number of upgradeable rules created
       */
      const createUpgradeableRules = async (
        ruleAssetSavedObjects: any[],
        ruleIndices: number[]
      ) => {
        // Clear previous rule assets to reset telemetry state
        await deleteAllPrebuiltRuleAssets(es, log);

        // Verify initial telemetry state is clean
        const initialStats = await getStats(supertest, log);
        expect(initialStats?.detection_rules.elastic_detection_rule_upgrade_status).toEqual(
          INITIAL_TELEMETRY_STATE
        );

        // Increment versions for specified rules to make them upgradeable
        ruleIndices.forEach((index) => {
          ruleAssetSavedObjects[index]['security-rule'].version += 1;
        });

        // Recreate rule assets with new versions
        await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);

        // Verify prebuilt rules status shows correct upgrade count
        const { stats } = await getPrebuiltRulesStatus(es, supertest);
        expect(stats).toMatchObject({
          num_prebuilt_rules_installed: RULES_COUNT,
          num_prebuilt_rules_to_install: 0,
          num_prebuilt_rules_to_upgrade: ruleIndices.length,
          num_prebuilt_rules_total_in_package: RULES_COUNT,
        });

        return ruleIndices.length;
      };

      /**
       * Verifies the final telemetry stats match expected values.
       * @param expectedStats - Expected telemetry statistics
       */
      const verifyTelemetryStats = async (expectedStats: {
        total: number;
        customized: number;
        enabled: number;
        disabled: number;
      }) => {
        const telemetryStats = await getStats(supertest, log);
        expect(telemetryStats?.detection_rules.elastic_detection_rule_upgrade_status).toEqual(
          expectedStats
        );
      };

      /**
       * Test Case 1: Upgradeable disabled non-customized rules
       *
       * This test verifies that telemetry correctly reports stats for rules that are:
       * - Upgradeable (newer version available)
       * - Disabled (default state after installation)
       * - Non-customized (no modifications from original prebuilt rule)
       *
       * Expected telemetry: total=2, customized=0, enabled=0, disabled=2
       */
      it('should return stats for upgradeable disabled non-customized rules', async () => {
        // Set up initial rules environment
        const ruleAssetSavedObjects = await setupInitialRules();

        // Create 2 upgradeable rules (rule-1 and rule-2) and verify setup
        await createUpgradeableRules(ruleAssetSavedObjects, [0, 1]);

        // Verify final telemetry shows 2 disabled, non-customized upgradeable rules
        await verifyTelemetryStats({
          total: 2,
          customized: 0,
          enabled: 0,
          disabled: 2,
        });
      });

      /**
       * Test Case 2: Upgradeable disabled customized rules
       *
       * This test verifies that telemetry correctly reports stats for rules that include:
       * - One customized rule (rule-1): upgradeable, disabled, and customized
       * - One non-customized rule (rule-2): upgradeable, disabled, and non-customized
       *
       * Expected telemetry: total=2, customized=1, enabled=0, disabled=2
       */
      it('should return stats for upgradeable disabled customized rule and upgradeable disabled non-customized rule', async () => {
        // Set up initial rules environment
        const ruleAssetSavedObjects = await setupInitialRules();

        // Customize rule-1 with custom name and description (remains disabled)
        await customizeRule(detectionsApi, 'rule-1', {
          name: 'Customized Rule Name',
          description: 'This is a customized rule description',
        });

        // Create 2 upgradeable rules (rule-1 customized, rule-2 non-customized)
        await createUpgradeableRules(ruleAssetSavedObjects, [0, 1]);

        // Verify telemetry shows 1 customized and 1 non-customized disabled rule
        await verifyTelemetryStats({
          total: 2,
          customized: 1,
          enabled: 0,
          disabled: 2,
        });
      });

      /**
       * Test Case 3: Mixed scenario - enabled customized and disabled non-customized rules
       *
       * This test verifies that telemetry correctly reports stats for a mixed scenario:
       * - One customized rule (rule-1): upgradeable, enabled, and customized
       * - One non-customized rule (rule-2): upgradeable, disabled, and non-customized
       *
       * This validates that the telemetry system independently tracks both:
       * - Customization status (customized vs non-customized)
       * - Enablement status (enabled vs disabled)
       *
       * Expected telemetry: total=2, customized=1, enabled=1, disabled=1
       */
      it('should return stats for upgradeable enabled customized rule and upgradeable disabled non-customized rule', async () => {
        // Set up initial rules environment
        const ruleAssetSavedObjects = await setupInitialRules();

        // Customize and enable rule-1
        await customizeRule(detectionsApi, 'rule-1', {
          name: 'Customized Enabled Rule',
          description: 'This is a customized and enabled rule',
          enabled: true,
        });

        // Create 2 upgradeable rules (rule-1 customized+enabled, rule-2 non-customized+disabled)
        await createUpgradeableRules(ruleAssetSavedObjects, [0, 1]);

        // Verify telemetry shows mixed states: 1 enabled+customized, 1 disabled+non-customized
        await verifyTelemetryStats({
          total: 2,
          customized: 1,
          enabled: 1,
          disabled: 1,
        });
      });

      /**
       * Test Case 4: Edge case - No upgradeable rules
       *
       * This test verifies that telemetry correctly reports zero stats when
       * all rules are up-to-date (no upgrades available).
       *
       * Expected telemetry: total=0, customized=0, enabled=0, disabled=0
       */
      it('should return zero stats when no rules are upgradeable', async () => {
        // Set up initial rules environment
        const ruleAssetSavedObjects = await setupInitialRules();

        // Customize and enable one rule
        await customizeRule(detectionsApi, 'rule-1', {
          name: 'Customized Rule',
          enabled: true,
        });

        // Clear rule assets but DON'T increment versions (no upgrades available)
        await deleteAllPrebuiltRuleAssets(es, log);
        await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);

        // Verify no upgradeable rules exist
        const { stats } = await getPrebuiltRulesStatus(es, supertest);
        expect(stats).toMatchObject({
          num_prebuilt_rules_installed: RULES_COUNT,
          num_prebuilt_rules_to_install: 0,
          num_prebuilt_rules_to_upgrade: 0,
          num_prebuilt_rules_total_in_package: RULES_COUNT,
        });

        // Verify telemetry shows no upgradeable rules
        await verifyTelemetryStats({
          total: 0,
          customized: 0,
          enabled: 0,
          disabled: 0,
        });
      });

      /**
       * Test Case 5: All upgradeable rules are enabled and customized
       *
       * This test verifies telemetry when multiple rules are both enabled and customized.
       *
       * Expected telemetry: total=3, customized=3, enabled=3, disabled=0
       */
      it('should return stats for multiple upgradeable enabled customized rules', async () => {
        // Set up initial rules environment
        const ruleAssetSavedObjects = await setupInitialRules();

        // Customize and enable multiple rules
        await customizeRule(detectionsApi, 'rule-1', {
          name: 'Customized Enabled Rule 1',
          enabled: true,
        });
        await customizeRule(detectionsApi, 'rule-2', {
          name: 'Customized Enabled Rule 2',
          enabled: true,
        });
        await customizeRule(detectionsApi, 'rule-3', {
          name: 'Customized Enabled Rule 3',
          enabled: true,
        });

        // Create 3 upgradeable rules (all customized and enabled)
        await createUpgradeableRules(ruleAssetSavedObjects, [0, 1, 2]);

        // Verify telemetry shows all rules as enabled and customized
        await verifyTelemetryStats({
          total: 3,
          customized: 3,
          enabled: 3,
          disabled: 0,
        });
      });

      /**
       * Test Case 6: All upgradeable rules are enabled but non-customized
       *
       * This test verifies telemetry when rules are enabled but not customized.
       *
       * Expected telemetry: total=2, customized=0, enabled=2, disabled=0
       */
      it('should return stats for upgradeable enabled non-customized rules', async () => {
        // Set up initial rules environment
        const ruleAssetSavedObjects = await setupInitialRules();

        // Enable rules without customizing them (using minimal rule update)
        await supertest
          .patch(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-1`)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: 'rule-1', enabled: true })
          .expect(200);

        await supertest
          .patch(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-2`)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: 'rule-2', enabled: true })
          .expect(200);

        // Create 2 upgradeable rules (enabled but non-customized)
        await createUpgradeableRules(ruleAssetSavedObjects, [0, 1]);

        // Verify telemetry shows enabled but non-customized rules
        await verifyTelemetryStats({
          total: 2,
          customized: 0,
          enabled: 2,
          disabled: 0,
        });
      });

      /**
       * Test Case 7: Comprehensive scenario with all possible states
       *
       * This test verifies telemetry with all 4 rules in different states:
       * - rule-1: enabled + customized
       * - rule-2: enabled + non-customized
       * - rule-3: disabled + customized
       * - rule-4: disabled + non-customized
       *
       * Expected telemetry: total=4, customized=2, enabled=2, disabled=2
       */
      it('should return stats for comprehensive mixed scenario with all rule states', async () => {
        // Set up initial rules environment
        const ruleAssetSavedObjects = await setupInitialRules();

        // rule-1: enabled + customized
        await customizeRule(detectionsApi, 'rule-1', {
          name: 'Enabled Customized Rule',
          enabled: true,
        });

        // rule-2: enabled + non-customized
        await supertest
          .patch(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-2`)
          .set('kbn-xsrf', 'true')
          .send({
            rule_id: 'rule-2',
            enabled: true,
          })
          .expect(200);

        // rule-3: disabled + customized
        await customizeRule(detectionsApi, 'rule-3', {
          name: 'Disabled Customized Rule',
          // enabled: false is default
        });

        // rule-4: disabled + non-customized (default state)

        // Make all 4 rules upgradeable
        await createUpgradeableRules(ruleAssetSavedObjects, [0, 1, 2, 3]);

        // Verify comprehensive telemetry stats
        await verifyTelemetryStats({
          total: 4,
          customized: 2, // rule-1 and rule-3
          enabled: 2, // rule-1 and rule-2
          disabled: 2, // rule-3 and rule-4
        });
      });

      /**
       * Test Case 8: Single upgradeable customized enabled rule
       *
       * This test verifies telemetry with only one upgradeable rule
       * that is both customized and enabled.
       *
       * Expected telemetry: total=1, customized=1, enabled=1, disabled=0
       */
      it('should return stats for single upgradeable enabled customized rule', async () => {
        // Set up initial rules environment
        const ruleAssetSavedObjects = await setupInitialRules();

        // Customize and enable only one rule
        await customizeRule(detectionsApi, 'rule-1', {
          name: 'Single Customized Enabled Rule',
          description: 'The only upgradeable rule',
          enabled: true,
        });

        // Create only 1 upgradeable rule
        await createUpgradeableRules(ruleAssetSavedObjects, [0]);

        // Verify telemetry shows single rule stats
        await verifyTelemetryStats({
          total: 1,
          customized: 1,
          enabled: 1,
          disabled: 0,
        });
      });
    });
  });
};
