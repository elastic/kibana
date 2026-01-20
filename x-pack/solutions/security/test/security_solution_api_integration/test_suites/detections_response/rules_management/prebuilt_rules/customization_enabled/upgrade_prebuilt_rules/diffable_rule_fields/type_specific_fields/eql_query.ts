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

export function eqlQueryField({ getService }: FtrProviderContext): void {
  describe('"eql_query"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'eql',
          query: 'any where true',
          language: 'eql',
        },
        patch: {},
        upgrade: {
          type: 'eql',
          query: 'any where true',
          language: 'eql',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'eql_query',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'eql_query',
          resolvedValue: {
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
            filters: [],
          },
          expectedFieldsAfterUpgrade: {
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
          },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'eql',
          query: 'any where true',
          language: 'eql',
        },
        patch: {},
        upgrade: {
          type: 'eql',
          query: 'process where process.name == "regsvr32.exe"',
          language: 'eql',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'eql_query',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: {
              query: 'any where true',
              language: 'eql',
              filters: [],
            },
            current: {
              query: 'any where true',
              language: 'eql',
              filters: [],
            },
            target: {
              query: 'process where process.name == "regsvr32.exe"',
              language: 'eql',
              filters: [],
            },
            merged: {
              query: 'process where process.name == "regsvr32.exe"',
              language: 'eql',
              filters: [],
            },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'eql_query',
          expectedFieldsAfterUpgrade: {
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'eql_query',
          resolvedValue: {
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
            filters: [],
          },
          expectedFieldsAfterUpgrade: {
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
          },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'eql',
          query: 'any where true',
          language: 'eql',
        },
        patch: {
          query: 'process where process.name == "regsvr32.exe"',
        },
        upgrade: {
          type: 'eql',
          query: 'any where true',
          language: 'eql',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'eql_query',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: {
              query: 'any where true',
              language: 'eql',
              filters: [],
            },
            current: {
              query: 'process where process.name == "regsvr32.exe"',
              language: 'eql',
              filters: [],
            },
            target: {
              query: 'any where true',
              language: 'eql',
              filters: [],
            },
            merged: {
              query: 'process where process.name == "regsvr32.exe"',
              language: 'eql',
              filters: [],
            },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'eql_query',
          expectedFieldsAfterUpgrade: {
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'eql_query',
          resolvedValue: {
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
            filters: [],
          },
          expectedFieldsAfterUpgrade: {
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
          },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'eql',
          query: 'any where true',
          language: 'eql',
        },
        patch: {
          query: 'process where process.name == "regsvr32.exe"',
        },
        upgrade: {
          type: 'eql',
          query: 'process where process.name == "regsvr32.exe"',
          language: 'eql',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'eql_query',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: {
              query: 'any where true',
              language: 'eql',
              filters: [],
            },
            current: {
              query: 'process where process.name == "regsvr32.exe"',
              language: 'eql',
              filters: [],
            },
            target: {
              query: 'process where process.name == "regsvr32.exe"',
              language: 'eql',
              filters: [],
            },
            merged: {
              query: 'process where process.name == "regsvr32.exe"',
              language: 'eql',
              filters: [],
            },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'eql_query',
          expectedFieldsAfterUpgrade: {
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'eql_query',
          resolvedValue: {
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
            filters: [],
          },
          expectedFieldsAfterUpgrade: {
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
          },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'eql',
          query: 'any where true',
          language: 'eql',
        },
        patch: {
          query: 'host where host.name == "something"',
        },
        upgrade: {
          type: 'eql',
          query: 'process where process.name == "regsvr32.exe"',
          language: 'eql',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'eql_query',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: {
              query: 'any where true',
              language: 'eql',
              filters: [],
            },
            current: {
              query: 'host where host.name == "something"',
              language: 'eql',
              filters: [],
            },
            target: {
              query: 'process where process.name == "regsvr32.exe"',
              language: 'eql',
              filters: [],
            },
            merged: {
              query: 'host where host.name == "something"',
              language: 'eql',
              filters: [],
            },
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'eql_query',
          resolvedValue: {
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
            filters: [],
          },
          expectedFieldsAfterUpgrade: {
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
          },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'eql',
            query: 'any where true',
            language: 'eql',
          },
          patch: {
            query: 'host where host.name == "something"',
          },
          upgrade: {
            type: 'eql',
            query: 'host where host.name == "something"',
            language: 'eql',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'eql_query',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'eql_query',
            resolvedValue: {
              query: 'process where process.name == "regsvr32.exe"',
              language: 'eql',
              filters: [],
            },
            expectedFieldsAfterUpgrade: {
              query: 'process where process.name == "regsvr32.exe"',
              language: 'eql',
            },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'eql',
            query: 'any where true',
            language: 'eql',
          },
          patch: {
            query: 'host where host.name == "something"',
          },
          upgrade: {
            type: 'eql',
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'eql_query',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: {
                query: 'host where host.name == "something"',
                language: 'eql',
                filters: [],
              },
              target: {
                query: 'process where process.name == "regsvr32.exe"',
                language: 'eql',
                filters: [],
              },
              merged: {
                query: 'process where process.name == "regsvr32.exe"',
                language: 'eql',
                filters: [],
              },
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'eql_query',
            resolvedValue: {
              query: 'process where process.name == "regsvr32.exe"',
              language: 'eql',
              filters: [],
            },
            expectedFieldsAfterUpgrade: {
              query: 'process where process.name == "regsvr32.exe"',
              language: 'eql',
            },
          },
          getService
        );
      });
    });
  });
}
