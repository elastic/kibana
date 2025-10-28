/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { PrebuiltRuleAsset } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules';
import { customizeRule, getStats } from '../../../utils';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  deleteAllPrebuiltRuleAssets,
  createRuleAssetSavedObject,
  createPrebuiltRuleAssetSavedObjects,
  installPrebuiltRules,
} from '../../../utils';
import { deleteAllRules } from '../../../../../config/services/detections_response';

/**
 * Test suite for detection rule customization status telemetry.
 *
 * This suite tests the telemetry metrics for prebuilt rules,
 * verifying that the system correctly tracks telemetry for rule customizations.
 */
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');
  describe('@ess @serverless @skipInServerlessMKI Snapshot telemetry for customization status', () => {
    const ZERO_COUNTS = {
      alert_suppression: 0,
      anomaly_threshold: 0,
      data_view_id: 0,
      description: 0,
      filters: 0,
      from: 0,
      index: 0,
      interval: 0,
      investigation_fields: 0,
      name: 0,
      new_terms_fields: 0,
      note: 0,
      query: 0,
      risk_score: 0,
      severity: 0,
      setup: 0,
      tags: 0,
      threat_query: 0,
      threshold: 0,
      timeline_id: 0,
    } as const;

    beforeEach(async () => {
      await deleteAllPrebuiltRuleAssets(es, log);
      await deleteAllRules(supertest, log);
    });

    const defaultRuleParams = {
      description: 'some description',
      name: 'Query with a rule id',
      query: 'user.name: root or user.name: admin',
      severity: 'high',
      type: 'query',
      risk_score: 42,
      language: 'kuery',
      rule_id: 'some-random-id',
      version: 1,
      author: [],
      license: 'Elastic License v2',
      index: ['index-1', 'index-2'],
      interval: '100m',
    };

    const getRuleAssetSavedObjects = () => [
      createRuleAssetSavedObject({
        ...PrebuiltRuleAsset.parse(defaultRuleParams),
        rule_id: 'rule-1',
      }),
      createRuleAssetSavedObject({
        ...PrebuiltRuleAsset.parse(defaultRuleParams),
        rule_id: 'rule-2',
      }),
      createRuleAssetSavedObject({
        ...PrebuiltRuleAsset.parse(defaultRuleParams),
        rule_id: 'rule-3',
      }),
    ];

    const setupInitialRules = async () => {
      const ruleAssetSavedObjects = getRuleAssetSavedObjects();
      await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);
      await installPrebuiltRules(es, supertest);
      return ruleAssetSavedObjects;
    };

    const getCustomizationStatus = async () => {
      const stats = await getStats(supertest, log);
      return stats?.detection_rules?.elastic_detection_rule_customization_status ?? ZERO_COUNTS;
    };

    it('returns zeroed customization status when there are no customizations', async () => {
      await setupInitialRules();

      const status = await getCustomizationStatus();
      expect(status).toEqual(ZERO_COUNTS);
    });

    it('aggregates per-field customization counts across multiple rules', async () => {
      await setupInitialRules();

      await customizeRule(detectionsApi, 'rule-1', {
        ...defaultRuleParams,
        rule_id: 'rule-1',
        tags: ['a', 'b'],
      });

      await customizeRule(detectionsApi, 'rule-2', {
        ...defaultRuleParams,
        rule_id: 'rule-2',
        severity: 'low',
      });

      // rule-3: no customization (control)

      const status = await getCustomizationStatus();

      const expected = {
        ...ZERO_COUNTS,
        tags: 1,
        severity: 1,
      };

      expect(status).toEqual(expected);
    });

    it('counts multiple customizations of the same field on the same rule as a single customized field', async () => {
      await setupInitialRules();

      await customizeRule(detectionsApi, 'rule-1', {
        ...defaultRuleParams,
        rule_id: 'rule-1',
        tags: ['a', 'b'],
      });
      await customizeRule(detectionsApi, 'rule-1', {
        ...defaultRuleParams,
        rule_id: 'rule-1',
        tags: ['a', 'b', 'c'],
      });
      await customizeRule(detectionsApi, 'rule-1', {
        ...defaultRuleParams,
        rule_id: 'rule-1',
        tags: ['a', 'b', 'c', 'd'],
      });

      await customizeRule(detectionsApi, 'rule-2', {
        ...defaultRuleParams,
        rule_id: 'rule-2',
        tags: ['x', 'y'],
      });
      await customizeRule(detectionsApi, 'rule-2', {
        ...defaultRuleParams,
        rule_id: 'rule-2',
        tags: ['x', 'y', 'z'],
      });

      const status = await getCustomizationStatus();

      const expected = {
        ...ZERO_COUNTS,
        tags: 2,
      };

      expect(status).toEqual(expected);
    });
  });
};
