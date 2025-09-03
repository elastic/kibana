/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ThreeWayDiffOutcome } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { FtrProviderContext } from '../../../../../../../../ftr_provider_context';
import type { TestFieldRuleUpgradeAssets } from '../test_helpers';
import {
  testFieldUpgradeReview,
  testFieldUpgradesToMergedValue,
  testFieldUpgradesToResolvedValue,
} from '../test_helpers';

export function timelineTemplateField({ getService }: FtrProviderContext): void {
  describe('"timeline_template"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          timeline_id: 'A',
          timeline_title: 'timelineA',
        },
        patch: {},
        upgrade: {
          type: 'query',
          timeline_id: 'A',
          timeline_title: 'timelineA',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timeline_template',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timeline_template',
          resolvedValue: { timeline_id: 'resolved', timeline_title: 'timelineResolved' },
          expectedFieldsAfterUpgrade: {
            timeline_id: 'resolved',
            timeline_title: 'timelineResolved',
          },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          timeline_id: 'A',
          timeline_title: 'timelineA',
        },
        patch: {},
        upgrade: {
          type: 'query',
          timeline_id: 'B',
          timeline_title: 'timelineB',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timeline_template',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: { timeline_id: 'A', timeline_title: 'timelineA' },
            current: { timeline_id: 'A', timeline_title: 'timelineA' },
            target: { timeline_id: 'B', timeline_title: 'timelineB' },
            merged: { timeline_id: 'B', timeline_title: 'timelineB' },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timeline_template',
          expectedFieldsAfterUpgrade: { timeline_id: 'B', timeline_title: 'timelineB' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timeline_template',
          resolvedValue: { timeline_id: 'resolved', timeline_title: 'timelineResolved' },
          expectedFieldsAfterUpgrade: {
            timeline_id: 'resolved',
            timeline_title: 'timelineResolved',
          },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          timeline_id: 'A',
          timeline_title: 'timelineA',
        },
        patch: {
          timeline_id: 'B',
          timeline_title: 'timelineB',
        },
        upgrade: {
          type: 'query',
          timeline_id: 'A',
          timeline_title: 'timelineA',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timeline_template',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: { timeline_id: 'A', timeline_title: 'timelineA' },
            current: { timeline_id: 'B', timeline_title: 'timelineB' },
            target: { timeline_id: 'A', timeline_title: 'timelineA' },
            merged: { timeline_id: 'B', timeline_title: 'timelineB' },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timeline_template',
          expectedFieldsAfterUpgrade: { timeline_id: 'B', timeline_title: 'timelineB' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timeline_template',
          resolvedValue: { timeline_id: 'resolved', timeline_title: 'timelineResolved' },
          expectedFieldsAfterUpgrade: {
            timeline_id: 'resolved',
            timeline_title: 'timelineResolved',
          },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          timeline_id: 'A',
          timeline_title: 'timelineA',
        },
        patch: {
          timeline_id: 'B',
          timeline_title: 'timelineB',
        },
        upgrade: {
          type: 'query',
          timeline_id: 'B',
          timeline_title: 'timelineB',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timeline_template',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: { timeline_id: 'A', timeline_title: 'timelineA' },
            current: { timeline_id: 'B', timeline_title: 'timelineB' },
            target: { timeline_id: 'B', timeline_title: 'timelineB' },
            merged: { timeline_id: 'B', timeline_title: 'timelineB' },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timeline_template',
          expectedFieldsAfterUpgrade: { timeline_id: 'B', timeline_title: 'timelineB' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timeline_template',
          resolvedValue: { timeline_id: 'resolved', timeline_title: 'timelineResolved' },
          expectedFieldsAfterUpgrade: {
            timeline_id: 'resolved',
            timeline_title: 'timelineResolved',
          },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          timeline_id: 'A',
          timeline_title: 'timelineA',
        },
        patch: {
          timeline_id: 'B',
          timeline_title: 'timelineB',
        },
        upgrade: {
          type: 'query',
          timeline_id: 'C',
          timeline_title: 'timelineC',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timeline_template',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: { timeline_id: 'A', timeline_title: 'timelineA' },
            current: { timeline_id: 'B', timeline_title: 'timelineB' },
            target: { timeline_id: 'C', timeline_title: 'timelineC' },
            merged: { timeline_id: 'B', timeline_title: 'timelineB' },
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timeline_template',
          resolvedValue: { timeline_id: 'resolved', timeline_title: 'timelineResolved' },
          expectedFieldsAfterUpgrade: {
            timeline_id: 'resolved',
            timeline_title: 'timelineResolved',
          },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            timeline_id: 'A',
            timeline_title: 'timelineA',
          },
          patch: {
            timeline_id: 'B',
            timeline_title: 'timelineB',
          },
          upgrade: {
            type: 'query',
            timeline_id: 'B',
            timeline_title: 'timelineB',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'timeline_template',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'timeline_template',
            resolvedValue: { timeline_id: 'resolved', timeline_title: 'timelineResolved' },
            expectedFieldsAfterUpgrade: {
              timeline_id: 'resolved',
              timeline_title: 'timelineResolved',
            },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            timeline_id: 'A',
            timeline_title: 'timelineA',
          },
          patch: {
            timeline_id: 'B',
            timeline_title: 'timelineB',
          },
          upgrade: {
            type: 'query',
            timeline_id: 'C',
            timeline_title: 'timelineC',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'timeline_template',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: { timeline_id: 'B', timeline_title: 'timelineB' },
              target: { timeline_id: 'C', timeline_title: 'timelineC' },
              merged: { timeline_id: 'C', timeline_title: 'timelineC' },
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'timeline_template',
            resolvedValue: { timeline_id: 'resolved', timeline_title: 'timelineResolved' },
            expectedFieldsAfterUpgrade: {
              timeline_id: 'resolved',
              timeline_title: 'timelineResolved',
            },
          },
          getService
        );
      });
    });
  });
}
