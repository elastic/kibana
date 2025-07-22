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

export function relatedIntegrationsField({ getService }: FtrProviderContext): void {
  describe('"related_integrations"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          related_integrations: [
            {
              package: 'packageA',
              version: '^1.0.0',
            },
          ],
        },
        patch: {},
        upgrade: {
          type: 'query',
          related_integrations: [
            {
              package: 'packageA',
              version: '^1.0.0',
            },
          ],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'related_integrations',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'related_integrations',
          resolvedValue: [
            {
              package: 'resolvedPackage',
              version: '^1.0.0',
            },
          ],
          expectedFieldsAfterUpgrade: {
            related_integrations: [
              {
                package: 'resolvedPackage',
                version: '^1.0.0',
              },
            ],
          },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          related_integrations: [
            {
              package: 'packageA',
              version: '^1.0.0',
            },
          ],
        },
        patch: {},
        upgrade: {
          type: 'query',
          related_integrations: [
            {
              package: 'packageA',
              version: '^2.0.0',
            },
            {
              package: 'packageB',
              version: '^2.0.0',
            },
          ],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'related_integrations',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: [
              {
                package: 'packageA',
                version: '^1.0.0',
              },
            ],
            current: [
              {
                package: 'packageA',
                version: '^1.0.0',
              },
            ],
            target: [
              {
                package: 'packageA',
                version: '^2.0.0',
              },
              {
                package: 'packageB',
                version: '^2.0.0',
              },
            ],
            merged: [
              {
                package: 'packageA',
                version: '^2.0.0',
              },
              {
                package: 'packageB',
                version: '^2.0.0',
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'related_integrations',
          expectedFieldsAfterUpgrade: {
            related_integrations: [
              {
                package: 'packageA',
                version: '^2.0.0',
              },
              {
                package: 'packageB',
                version: '^2.0.0',
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'related_integrations',
          resolvedValue: [
            {
              package: 'resolvedPackage',
              version: '^1.0.0',
            },
          ],
          expectedFieldsAfterUpgrade: {
            related_integrations: [
              {
                package: 'resolvedPackage',
                version: '^1.0.0',
              },
            ],
          },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          related_integrations: [
            {
              package: 'packageA',
              version: '^1.0.0',
            },
          ],
        },
        patch: {
          related_integrations: [
            {
              package: 'packageB',
              version: '^1.0.0',
            },
          ],
        },
        upgrade: {
          type: 'query',
          related_integrations: [
            {
              package: 'packageA',
              version: '^1.0.0',
            },
          ],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'related_integrations',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: [
              {
                package: 'packageA',
                version: '^1.0.0',
              },
            ],
            current: [
              {
                package: 'packageB',
                version: '^1.0.0',
              },
            ],
            target: [
              {
                package: 'packageA',
                version: '^1.0.0',
              },
            ],
            merged: [
              {
                package: 'packageB',
                version: '^1.0.0',
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'related_integrations',
          expectedFieldsAfterUpgrade: {
            related_integrations: [
              {
                package: 'packageB',
                version: '^1.0.0',
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'related_integrations',
          resolvedValue: [
            {
              package: 'resolvedPackage',
              version: '^1.0.0',
            },
          ],
          expectedFieldsAfterUpgrade: {
            related_integrations: [
              {
                package: 'resolvedPackage',
                version: '^1.0.0',
              },
            ],
          },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          related_integrations: [
            {
              package: 'packageA',
              version: '^1.0.0',
            },
          ],
        },
        patch: {
          related_integrations: [
            {
              package: 'packageB',
              version: '^1.0.0',
            },
          ],
        },
        upgrade: {
          type: 'query',
          related_integrations: [
            {
              package: 'packageB',
              version: '^1.0.0',
            },
          ],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'related_integrations',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: [
              {
                package: 'packageA',
                version: '^1.0.0',
              },
            ],
            current: [
              {
                package: 'packageB',
                version: '^1.0.0',
              },
            ],
            target: [
              {
                package: 'packageB',
                version: '^1.0.0',
              },
            ],
            merged: [
              {
                package: 'packageB',
                version: '^1.0.0',
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'related_integrations',
          expectedFieldsAfterUpgrade: {
            related_integrations: [
              {
                package: 'packageB',
                version: '^1.0.0',
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'related_integrations',
          resolvedValue: [
            {
              package: 'resolvedPackage',
              version: '^1.0.0',
            },
          ],
          expectedFieldsAfterUpgrade: {
            related_integrations: [
              {
                package: 'resolvedPackage',
                version: '^1.0.0',
              },
            ],
          },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          related_integrations: [
            {
              package: 'packageA',
              version: '^1.0.0',
            },
          ],
        },
        patch: {
          related_integrations: [
            {
              package: 'packageB',
              version: '^1.0.0',
            },
          ],
        },
        upgrade: {
          type: 'query',
          related_integrations: [
            {
              package: 'packageA',
              version: '^2.0.0',
            },
            {
              package: 'packageB',
              version: '^2.0.0',
            },
          ],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'related_integrations',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: [
              {
                package: 'packageA',
                version: '^1.0.0',
              },
            ],
            current: [
              {
                package: 'packageB',
                version: '^1.0.0',
              },
            ],
            target: [
              {
                package: 'packageA',
                version: '^2.0.0',
              },
              {
                package: 'packageB',
                version: '^2.0.0',
              },
            ],
            merged: [
              {
                package: 'packageB',
                version: '^1.0.0',
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'related_integrations',
          resolvedValue: [
            {
              package: 'resolvedPackage',
              version: '^1.0.0',
            },
          ],
          expectedFieldsAfterUpgrade: {
            related_integrations: [
              {
                package: 'resolvedPackage',
                version: '^1.0.0',
              },
            ],
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
            related_integrations: [
              {
                package: 'packageA',
                version: '^1.0.0',
              },
            ],
          },
          patch: {
            related_integrations: [
              {
                package: 'packageB',
                version: '^1.0.0',
              },
            ],
          },
          upgrade: {
            type: 'query',
            related_integrations: [
              {
                package: 'packageB',
                version: '^1.0.0',
              },
            ],
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'related_integrations',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'related_integrations',
            resolvedValue: [
              {
                package: 'resolvedPackage',
                version: '^1.0.0',
              },
            ],
            expectedFieldsAfterUpgrade: {
              related_integrations: [
                {
                  package: 'resolvedPackage',
                  version: '^1.0.0',
                },
              ],
            },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            related_integrations: [
              {
                package: 'packageA',
                version: '^1.0.0',
              },
            ],
          },
          patch: {
            related_integrations: [
              {
                package: 'packageB',
                version: '^1.0.0',
              },
            ],
          },
          upgrade: {
            type: 'query',
            related_integrations: [
              {
                package: 'packageA',
                version: '^2.0.0',
              },
              {
                package: 'packageB',
                version: '^2.0.0',
              },
            ],
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'related_integrations',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: [
                {
                  package: 'packageB',
                  version: '^1.0.0',
                },
              ],
              target: [
                {
                  package: 'packageA',
                  version: '^2.0.0',
                },
                {
                  package: 'packageB',
                  version: '^2.0.0',
                },
              ],
              merged: [
                {
                  package: 'packageA',
                  version: '^2.0.0',
                },
                {
                  package: 'packageB',
                  version: '^2.0.0',
                },
              ],
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'related_integrations',
            resolvedValue: [
              {
                package: 'resolvedPackage',
                version: '^1.0.0',
              },
            ],
            expectedFieldsAfterUpgrade: {
              related_integrations: [
                {
                  package: 'resolvedPackage',
                  version: '^1.0.0',
                },
              ],
            },
          },
          getService
        );
      });
    });
  });
}
