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

export function threatField({ getService }: FtrProviderContext): void {
  describe('"threat"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticA',
                id: 'tacticA',
                reference: 'reference',
              },
            },
          ],
        },
        patch: {},
        upgrade: {
          type: 'query',
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticA',
                id: 'tacticA',
                reference: 'reference',
              },
            },
          ],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat',
          resolvedValue: [
            {
              framework: 'something',
              tactic: {
                name: 'resolved',
                id: 'resolved',
                reference: 'reference',
              },
            },
          ],
          expectedFieldsAfterUpgrade: {
            threat: [
              {
                framework: 'something',
                tactic: {
                  name: 'resolved',
                  id: 'resolved',
                  reference: 'reference',
                },
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
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticA',
                id: 'tacticA',
                reference: 'reference',
              },
            },
          ],
        },
        patch: {},
        upgrade: {
          type: 'query',
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticB',
                id: 'tacticB',
                reference: 'reference',
              },
            },
          ],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticA',
                  id: 'tacticA',
                  reference: 'reference',
                },
              },
            ],
            current: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticA',
                  id: 'tacticA',
                  reference: 'reference',
                },
              },
            ],
            target: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticB',
                  id: 'tacticB',
                  reference: 'reference',
                },
              },
            ],
            merged: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticB',
                  id: 'tacticB',
                  reference: 'reference',
                },
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat',
          expectedFieldsAfterUpgrade: {
            threat: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticB',
                  id: 'tacticB',
                  reference: 'reference',
                },
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat',
          resolvedValue: [
            {
              framework: 'something',
              tactic: {
                name: 'resolved',
                id: 'resolved',
                reference: 'reference',
              },
            },
          ],
          expectedFieldsAfterUpgrade: {
            threat: [
              {
                framework: 'something',
                tactic: {
                  name: 'resolved',
                  id: 'resolved',
                  reference: 'reference',
                },
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
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticA',
                id: 'tacticA',
                reference: 'reference',
              },
            },
          ],
        },
        patch: {
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticB',
                id: 'tacticB',
                reference: 'reference',
              },
            },
          ],
        },
        upgrade: {
          type: 'query',
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticA',
                id: 'tacticA',
                reference: 'reference',
              },
            },
          ],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticA',
                  id: 'tacticA',
                  reference: 'reference',
                },
              },
            ],
            current: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticB',
                  id: 'tacticB',
                  reference: 'reference',
                },
              },
            ],
            target: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticA',
                  id: 'tacticA',
                  reference: 'reference',
                },
              },
            ],
            merged: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticB',
                  id: 'tacticB',
                  reference: 'reference',
                },
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat',
          expectedFieldsAfterUpgrade: {
            threat: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticB',
                  id: 'tacticB',
                  reference: 'reference',
                },
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat',
          resolvedValue: [
            {
              framework: 'something',
              tactic: {
                name: 'resolved',
                id: 'resolved',
                reference: 'reference',
              },
            },
          ],
          expectedFieldsAfterUpgrade: {
            threat: [
              {
                framework: 'something',
                tactic: {
                  name: 'resolved',
                  id: 'resolved',
                  reference: 'reference',
                },
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
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticA',
                id: 'tacticA',
                reference: 'reference',
              },
            },
          ],
        },
        patch: {
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticB',
                id: 'tacticB',
                reference: 'reference',
              },
            },
          ],
        },
        upgrade: {
          type: 'query',
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticB',
                id: 'tacticB',
                reference: 'reference',
              },
            },
          ],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticA',
                  id: 'tacticA',
                  reference: 'reference',
                },
              },
            ],
            current: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticB',
                  id: 'tacticB',
                  reference: 'reference',
                },
              },
            ],
            target: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticB',
                  id: 'tacticB',
                  reference: 'reference',
                },
              },
            ],
            merged: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticB',
                  id: 'tacticB',
                  reference: 'reference',
                },
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat',
          expectedFieldsAfterUpgrade: {
            threat: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticB',
                  id: 'tacticB',
                  reference: 'reference',
                },
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat',
          resolvedValue: [
            {
              framework: 'something',
              tactic: {
                name: 'resolved',
                id: 'resolved',
                reference: 'reference',
              },
            },
          ],
          expectedFieldsAfterUpgrade: {
            threat: [
              {
                framework: 'something',
                tactic: {
                  name: 'resolved',
                  id: 'resolved',
                  reference: 'reference',
                },
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
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticA',
                id: 'tacticA',
                reference: 'reference',
              },
            },
          ],
        },
        patch: {
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticB',
                id: 'tacticB',
                reference: 'reference',
              },
            },
          ],
        },
        upgrade: {
          type: 'query',
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticC',
                id: 'tacticC',
                reference: 'reference',
              },
            },
          ],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticA',
                  id: 'tacticA',
                  reference: 'reference',
                },
              },
            ],
            current: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticB',
                  id: 'tacticB',
                  reference: 'reference',
                },
              },
            ],
            target: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticC',
                  id: 'tacticC',
                  reference: 'reference',
                },
              },
            ],
            merged: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticB',
                  id: 'tacticB',
                  reference: 'reference',
                },
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat',
          resolvedValue: [
            {
              framework: 'something',
              tactic: {
                name: 'resolved',
                id: 'resolved',
                reference: 'reference',
              },
            },
          ],
          expectedFieldsAfterUpgrade: {
            threat: [
              {
                framework: 'something',
                tactic: {
                  name: 'resolved',
                  id: 'resolved',
                  reference: 'reference',
                },
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
            threat: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticA',
                  id: 'tacticA',
                  reference: 'reference',
                },
              },
            ],
          },
          patch: {
            threat: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticB',
                  id: 'tacticB',
                  reference: 'reference',
                },
              },
            ],
          },
          upgrade: {
            type: 'query',
            threat: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticB',
                  id: 'tacticB',
                  reference: 'reference',
                },
              },
            ],
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threat',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threat',
            resolvedValue: [
              {
                framework: 'something',
                tactic: {
                  name: 'resolved',
                  id: 'resolved',
                  reference: 'reference',
                },
              },
            ],
            expectedFieldsAfterUpgrade: {
              threat: [
                {
                  framework: 'something',
                  tactic: {
                    name: 'resolved',
                    id: 'resolved',
                    reference: 'reference',
                  },
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
            threat: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticA',
                  id: 'tacticA',
                  reference: 'reference',
                },
              },
            ],
          },
          patch: {
            threat: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticB',
                  id: 'tacticB',
                  reference: 'reference',
                },
              },
            ],
          },
          upgrade: {
            type: 'query',
            threat: [
              {
                framework: 'something',
                tactic: {
                  name: 'tacticC',
                  id: 'tacticC',
                  reference: 'reference',
                },
              },
            ],
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threat',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: [
                {
                  framework: 'something',
                  tactic: {
                    name: 'tacticB',
                    id: 'tacticB',
                    reference: 'reference',
                  },
                },
              ],
              target: [
                {
                  framework: 'something',
                  tactic: {
                    name: 'tacticC',
                    id: 'tacticC',
                    reference: 'reference',
                  },
                },
              ],
              merged: [
                {
                  framework: 'something',
                  tactic: {
                    name: 'tacticC',
                    id: 'tacticC',
                    reference: 'reference',
                  },
                },
              ],
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threat',
            resolvedValue: [
              {
                framework: 'something',
                tactic: {
                  name: 'resolved',
                  id: 'resolved',
                  reference: 'reference',
                },
              },
            ],
            expectedFieldsAfterUpgrade: {
              threat: [
                {
                  framework: 'something',
                  tactic: {
                    name: 'resolved',
                    id: 'resolved',
                    reference: 'reference',
                  },
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
