/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DataSourceType,
  ThreeWayDiffOutcome,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { FtrProviderContext } from '../../../../../../../../ftr_provider_context';
import type { TestFieldRuleUpgradeAssets } from '../test_helpers';
import {
  testFieldUpgradeReview,
  testFieldUpgradesToMergedValue,
  testFieldUpgradesToResolvedValue,
} from '../test_helpers';

export function dataSourceField({ getService }: FtrProviderContext): void {
  describe('"data_source" with index patterns', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          index: ['indexA'],
        },
        patch: {},
        upgrade: {
          type: 'query',
          index: ['indexA'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          resolvedValue: {
            type: DataSourceType.index_patterns,
            index_patterns: ['indexResolved'],
          },
          expectedFieldsAfterUpgrade: { index: ['indexResolved'] },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          index: ['indexA'],
        },
        patch: {},
        upgrade: {
          type: 'query',
          index: ['indexB'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: { type: DataSourceType.index_patterns, index_patterns: ['indexA'] },
            current: { type: DataSourceType.index_patterns, index_patterns: ['indexA'] },
            target: { type: DataSourceType.index_patterns, index_patterns: ['indexB'] },
            merged: { type: DataSourceType.index_patterns, index_patterns: ['indexB'] },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          expectedFieldsAfterUpgrade: { index: ['indexB'] },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          resolvedValue: {
            type: DataSourceType.index_patterns,
            index_patterns: ['indexResolved'],
          },
          expectedFieldsAfterUpgrade: { index: ['indexResolved'] },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          index: ['indexA'],
        },
        patch: {
          index: ['indexB'],
        },
        upgrade: {
          type: 'query',
          index: ['indexA'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: { type: DataSourceType.index_patterns, index_patterns: ['indexA'] },
            current: { type: DataSourceType.index_patterns, index_patterns: ['indexB'] },
            target: { type: DataSourceType.index_patterns, index_patterns: ['indexA'] },
            merged: { type: DataSourceType.index_patterns, index_patterns: ['indexB'] },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,

          diffableRuleFieldName: 'data_source',
          expectedFieldsAfterUpgrade: { index: ['indexB'] },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          resolvedValue: {
            type: DataSourceType.index_patterns,
            index_patterns: ['indexResolved'],
          },
          expectedFieldsAfterUpgrade: { index: ['indexResolved'] },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          index: ['indexA'],
        },
        patch: {
          index: ['indexB'],
        },
        upgrade: {
          type: 'query',
          index: ['indexB'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: { type: DataSourceType.index_patterns, index_patterns: ['indexA'] },
            current: { type: DataSourceType.index_patterns, index_patterns: ['indexB'] },
            target: { type: DataSourceType.index_patterns, index_patterns: ['indexB'] },
            merged: { type: DataSourceType.index_patterns, index_patterns: ['indexB'] },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          expectedFieldsAfterUpgrade: { index: ['indexB'] },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          resolvedValue: {
            type: DataSourceType.index_patterns,
            index_patterns: ['indexResolved'],
          },
          expectedFieldsAfterUpgrade: { index: ['indexResolved'] },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          index: ['indexA'],
        },
        patch: {
          index: ['indexB'],
        },
        upgrade: {
          type: 'query',
          index: ['indexA', 'indexC'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: true,
          expectedFieldDiffValues: {
            base: { type: DataSourceType.index_patterns, index_patterns: ['indexA'] },
            current: { type: DataSourceType.index_patterns, index_patterns: ['indexB'] },
            target: {
              type: DataSourceType.index_patterns,
              index_patterns: ['indexA', 'indexC'],
            },
            merged: {
              type: DataSourceType.index_patterns,
              index_patterns: ['indexB', 'indexC'],
            },
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          resolvedValue: {
            type: DataSourceType.index_patterns,
            index_patterns: ['indexResolved'],
          },
          expectedFieldsAfterUpgrade: { index: ['indexResolved'] },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            index: ['indexA'],
          },
          patch: {
            index: ['indexB'],
          },
          upgrade: {
            type: 'query',
            index: ['indexB'],
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'data_source',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'data_source',
            resolvedValue: {
              type: DataSourceType.index_patterns,
              index_patterns: ['indexResolved'],
            },
            expectedFieldsAfterUpgrade: { index: ['indexResolved'] },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            index: ['indexA'],
          },
          patch: {
            index: ['indexB'],
          },
          upgrade: {
            type: 'query',
            index: ['indexA', 'indexC'],
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'data_source',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: { type: DataSourceType.index_patterns, index_patterns: ['indexB'] },
              target: {
                type: DataSourceType.index_patterns,
                index_patterns: ['indexA', 'indexC'],
              },
              merged: {
                type: DataSourceType.index_patterns,
                index_patterns: ['indexA', 'indexC'],
              },
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'data_source',
            resolvedValue: {
              type: DataSourceType.index_patterns,
              index_patterns: ['indexResolved'],
            },
            expectedFieldsAfterUpgrade: { index: ['indexResolved'] },
          },
          getService
        );
      });
    });
  });

  describe('"data_source" with data view', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          data_view_id: 'dataViewA',
        },
        patch: {},
        upgrade: {
          type: 'query',
          data_view_id: 'dataViewA',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          resolvedValue: {
            type: DataSourceType.data_view,
            data_view_id: 'dataViewResolved',
          },
          expectedFieldsAfterUpgrade: { data_view_id: 'dataViewResolved' },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          data_view_id: 'dataViewA',
        },
        patch: {},
        upgrade: {
          type: 'query',
          data_view_id: 'dataViewB',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: { type: DataSourceType.data_view, data_view_id: 'dataViewA' },
            current: { type: DataSourceType.data_view, data_view_id: 'dataViewA' },
            target: { type: DataSourceType.data_view, data_view_id: 'dataViewB' },
            merged: { type: DataSourceType.data_view, data_view_id: 'dataViewB' },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          expectedFieldsAfterUpgrade: { data_view_id: 'dataViewB' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          resolvedValue: {
            type: DataSourceType.data_view,
            data_view_id: 'dataViewResolved',
          },
          expectedFieldsAfterUpgrade: { data_view_id: 'dataViewResolved' },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          data_view_id: 'dataViewA',
        },
        patch: {
          data_view_id: 'dataViewB',
        },
        upgrade: {
          type: 'query',
          data_view_id: 'dataViewA',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: { type: DataSourceType.data_view, data_view_id: 'dataViewA' },
            current: { type: DataSourceType.data_view, data_view_id: 'dataViewB' },
            target: { type: DataSourceType.data_view, data_view_id: 'dataViewA' },
            merged: { type: DataSourceType.data_view, data_view_id: 'dataViewB' },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,

          diffableRuleFieldName: 'data_source',
          expectedFieldsAfterUpgrade: { data_view_id: 'dataViewB' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          resolvedValue: {
            type: DataSourceType.data_view,
            data_view_id: 'dataViewResolved',
          },
          expectedFieldsAfterUpgrade: { data_view_id: 'dataViewResolved' },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          data_view_id: 'dataViewA',
        },
        patch: {
          data_view_id: 'dataViewB',
        },
        upgrade: {
          type: 'query',
          data_view_id: 'dataViewB',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: { type: DataSourceType.data_view, data_view_id: 'dataViewA' },
            current: { type: DataSourceType.data_view, data_view_id: 'dataViewB' },
            target: { type: DataSourceType.data_view, data_view_id: 'dataViewB' },
            merged: { type: DataSourceType.data_view, data_view_id: 'dataViewB' },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          expectedFieldsAfterUpgrade: { data_view_id: 'dataViewB' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          resolvedValue: {
            type: DataSourceType.data_view,
            data_view_id: 'dataViewResolved',
          },
          expectedFieldsAfterUpgrade: { data_view_id: 'dataViewResolved' },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          data_view_id: 'dataViewA',
        },
        patch: {
          data_view_id: 'dataViewB',
        },
        upgrade: {
          type: 'query',
          data_view_id: 'dataViewC',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: { type: DataSourceType.data_view, data_view_id: 'dataViewA' },
            current: { type: DataSourceType.data_view, data_view_id: 'dataViewB' },
            target: { type: DataSourceType.data_view, data_view_id: 'dataViewC' },
            merged: { type: DataSourceType.data_view, data_view_id: 'dataViewB' },
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'data_source',
          resolvedValue: {
            type: DataSourceType.data_view,
            data_view_id: 'dataViewResolved',
          },
          expectedFieldsAfterUpgrade: { data_view_id: 'dataViewResolved' },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            data_view_id: 'dataViewA',
          },
          patch: {
            data_view_id: 'dataViewB',
          },
          upgrade: {
            type: 'query',
            data_view_id: 'dataViewB',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'data_source',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'data_source',
            resolvedValue: {
              type: DataSourceType.data_view,
              data_view_id: 'dataViewResolved',
            },
            expectedFieldsAfterUpgrade: { data_view_id: 'dataViewResolved' },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            data_view_id: 'dataViewA',
          },
          patch: {
            data_view_id: 'dataViewB',
          },
          upgrade: {
            type: 'query',
            data_view_id: 'dataViewC',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'data_source',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: { type: DataSourceType.data_view, data_view_id: 'dataViewB' },
              target: { type: DataSourceType.data_view, data_view_id: 'dataViewC' },
              merged: { type: DataSourceType.data_view, data_view_id: 'dataViewC' },
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'data_source',
            resolvedValue: {
              type: DataSourceType.data_view,
              data_view_id: 'dataViewResolved',
            },
            expectedFieldsAfterUpgrade: { data_view_id: 'dataViewResolved' },
          },
          getService
        );
      });
    });
  });
}
