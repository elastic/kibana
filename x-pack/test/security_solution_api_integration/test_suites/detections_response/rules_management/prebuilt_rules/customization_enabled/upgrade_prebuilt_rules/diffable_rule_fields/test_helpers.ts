/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { isUndefined, omitBy } from 'lodash';
import type {
  PartialRuleDiff,
  RuleResponse,
  UpgradeConflictResolution,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { UpgradeConflictResolutionEnum } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { ModeEnum } from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  DEFAULT_RULE_UPDATE_VERSION,
  DEFAULT_TEST_RULE_ID,
  RuleUpgradeAssets,
  setUpRuleUpgrade,
} from '../../../../../utils/rules/prebuilt_rules/set_up_rule_upgrade';
import {
  fetchFirstPrebuiltRuleUpgradeReviewDiff,
  performUpgradePrebuiltRules,
} from '../../../../../utils';
import { FtrProviderContext } from '../../../../../../../ftr_provider_context';

export interface TestFieldRuleUpgradeAssets extends RuleUpgradeAssets {
  removeInstalledAssets?: boolean;
}

interface FieldDiffValueVersions {
  base: unknown;
  current: unknown;
  target: unknown;
  merged: unknown;
}

interface MissingHistoricalRuleVersionsFieldDiffValueVersions {
  current: unknown;
  target: unknown;
  merged: unknown;
}

interface TestFieldUpgradeReviewParams {
  ruleUpgradeAssets: TestFieldRuleUpgradeAssets;
  diffableRuleFieldName: string;
}

type ExpectedDiffOutcome =
  | {
      expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate;
    }
  | {
      expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate;
      expectedFieldDiffValues: FieldDiffValueVersions;
    }
  | {
      expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate;
      expectedFieldDiffValues: FieldDiffValueVersions;
    }
  | {
      expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate;
      expectedFieldDiffValues: FieldDiffValueVersions;
    }
  | {
      expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate;
      isSolvableConflict: boolean;
      expectedFieldDiffValues: FieldDiffValueVersions;
    }
  | {
      expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate;
    }
  | {
      expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate;
      expectedFieldDiffValues: MissingHistoricalRuleVersionsFieldDiffValueVersions;
      isMergableField?: boolean;
    };

/**
 * Creates a test to assert rule upgrade review endpoint returns an expected result.
 *
 * CAUTION: The function expected provided `ruleUpgradeAssets` defined according to the `expectedDiffOutcome`.
 * In the other words it means `ruleUpgradeAssets` should define a proper rule upgrade state for
 * a `fieldName` like non-customized field without upgrade or customized field with an upgrade resulting
 * in a conflict.
 */
export function testFieldUpgradeReview(
  params: TestFieldUpgradeReviewParams & ExpectedDiffOutcome,
  getService: FtrProviderContext['getService']
): void {
  const supertest = getService('supertest');
  const testName =
    params.expectedDiffOutcome === ThreeWayDiffOutcome.StockValueNoUpdate ||
    params.expectedDiffOutcome === ThreeWayDiffOutcome.MissingBaseNoUpdate
      ? 'does NOT return upgrade review'
      : 'returns upgrade review';

  it(testName, async () => {
    await setUpRuleUpgrade({
      assets: params.ruleUpgradeAssets,
      removeInstalledAssets: params.ruleUpgradeAssets.removeInstalledAssets ?? false,
      deps: {
        es: getService('es'),
        supertest,
        log: getService('log'),
      },
    });

    const diff = await fetchFirstPrebuiltRuleUpgradeReviewDiff(supertest);

    switch (params.expectedDiffOutcome) {
      case ThreeWayDiffOutcome.StockValueNoUpdate:
        expectAAAFieldDiff(diff, { diffableRuleFieldName: params.diffableRuleFieldName });
        break;

      case ThreeWayDiffOutcome.StockValueCanUpdate:
        expectAABFieldDiff(diff, {
          diffableRuleFieldName: params.diffableRuleFieldName,
          valueVersions: params.expectedFieldDiffValues,
        });
        break;

      case ThreeWayDiffOutcome.CustomizedValueNoUpdate:
        expectABAFieldDiff(diff, {
          diffableRuleFieldName: params.diffableRuleFieldName,
          valueVersions: params.expectedFieldDiffValues,
        });
        break;

      case ThreeWayDiffOutcome.CustomizedValueSameUpdate:
        expectABBFieldDiff(diff, {
          diffableRuleFieldName: params.diffableRuleFieldName,
          valueVersions: params.expectedFieldDiffValues,
        });
        break;

      case ThreeWayDiffOutcome.CustomizedValueCanUpdate:
        if (params.isSolvableConflict) {
          expectSolvableABCFieldDiff(diff, {
            diffableRuleFieldName: params.diffableRuleFieldName,
            valueVersions: params.expectedFieldDiffValues,
          });
        } else {
          expectNonSolvableABCFieldDiff(diff, {
            diffableRuleFieldName: params.diffableRuleFieldName,
            valueVersions: params.expectedFieldDiffValues,
          });
        }
        break;

      case ThreeWayDiffOutcome.MissingBaseNoUpdate:
        expectMissingBaseAAFieldDiff(diff, { diffableRuleFieldName: params.diffableRuleFieldName });
        break;

      case ThreeWayDiffOutcome.MissingBaseCanUpdate:
        expectMissingBaseABFieldDiff(diff, {
          diffableRuleFieldName: params.diffableRuleFieldName,
          valueVersions: params.expectedFieldDiffValues,
          isMergableField: params.isMergableField,
        });
        break;
    }
  });
}

interface TestFieldUpgradesToMergedValueParams {
  ruleUpgradeAssets: TestFieldRuleUpgradeAssets;
  onConflict?: UpgradeConflictResolution;
  diffableRuleFieldName: string;
  expectedFieldsAfterUpgrade: Partial<RuleResponse>;
}

/**
 * Creates a test to assert rule's `fieldName` upgrades to merged value.
 *
 * CAUTION: The function expected provided `ruleUpgradeAssets` defined according to the `expectedDiffOutcome`.
 * In the other words it means `ruleUpgradeAssets` should define a proper rule upgrade state for
 * a `fieldName` like non-customized field without upgrade or customized field with an upgrade resulting
 * in a conflict.
 *
 * `mergedValue` must be conformed with `ruleUpgradeAssets`.
 */
export function testFieldUpgradesToMergedValue(
  {
    ruleUpgradeAssets,
    onConflict = UpgradeConflictResolutionEnum.SKIP,
    diffableRuleFieldName,
    expectedFieldsAfterUpgrade,
  }: TestFieldUpgradesToMergedValueParams,
  getService: FtrProviderContext['getService']
): void {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const securitySolutionApi = getService('securitySolutionApi');

  const deps = {
    es,
    supertest,
    log,
    securitySolutionApi,
  };

  it('upgrades to MERGED value', async () => {
    await setUpRuleUpgrade({
      assets: ruleUpgradeAssets,
      removeInstalledAssets: ruleUpgradeAssets.removeInstalledAssets ?? false,
      deps,
    });

    const hasRuleFieldsToPatch = Object.keys(ruleUpgradeAssets.patch).length > 0;

    const response = await performUpgradePrebuiltRules(es, supertest, {
      mode: ModeEnum.SPECIFIC_RULES,
      on_conflict: onConflict,
      rules: [
        {
          rule_id: ruleUpgradeAssets.upgrade.rule_id ?? DEFAULT_TEST_RULE_ID,
          revision: hasRuleFieldsToPatch ? 1 : 0,
          version: ruleUpgradeAssets.upgrade.version ?? DEFAULT_RULE_UPDATE_VERSION,
          fields: {
            [diffableRuleFieldName]: {
              pick_version: 'MERGED',
            },
          },
        },
      ],
    });

    const upgradedRule = await securitySolutionApi.readRule({
      query: { rule_id: DEFAULT_TEST_RULE_ID },
    });

    expectRuleFields(response.results.updated[0], expectedFieldsAfterUpgrade);
    expectRuleFields(upgradedRule.body, expectedFieldsAfterUpgrade);
  });
}

interface TestFieldUpgradesToResolvedValueParams {
  ruleUpgradeAssets: TestFieldRuleUpgradeAssets;
  diffableRuleFieldName: string;
  resolvedValue: unknown;
  expectedFieldsAfterUpgrade: Partial<RuleResponse>;
}

/**
 * Creates a test to assert rule's `fieldName` upgrades to a resolved value.
 *
 * Since `mergedValue` depends on the input data and a diff algorithm the function
 * expect `mergedValue` to be provided.
 *
 * CAUTION: The function expected provided `ruleUpgradeAssets` defined according to the `expectedDiffOutcome`.
 * In the other words it means `ruleUpgradeAssets` should define a proper rule upgrade state for
 * a `fieldName` like non-customized field without upgrade or customized field with an upgrade resulting
 * in a conflict.
 */
export function testFieldUpgradesToResolvedValue(
  {
    ruleUpgradeAssets,
    diffableRuleFieldName,
    resolvedValue,
    expectedFieldsAfterUpgrade,
  }: TestFieldUpgradesToResolvedValueParams,
  getService: FtrProviderContext['getService']
): void {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const securitySolutionApi = getService('securitySolutionApi');

  const deps = {
    es,
    supertest,
    log,
    securitySolutionApi,
  };

  it('upgrades to RESOLVED value', async () => {
    await setUpRuleUpgrade({
      assets: ruleUpgradeAssets,
      removeInstalledAssets: ruleUpgradeAssets.removeInstalledAssets ?? false,
      deps,
    });

    const hasRuleFieldsToPatch = Object.keys(ruleUpgradeAssets.patch).length > 0;

    const response = await performUpgradePrebuiltRules(deps.es, deps.supertest, {
      mode: ModeEnum.SPECIFIC_RULES,
      rules: [
        {
          rule_id: ruleUpgradeAssets.upgrade.rule_id ?? DEFAULT_TEST_RULE_ID,
          revision: hasRuleFieldsToPatch ? 1 : 0,
          version: ruleUpgradeAssets.upgrade.version ?? DEFAULT_RULE_UPDATE_VERSION,
          fields: {
            [diffableRuleFieldName]: {
              pick_version: 'RESOLVED',
              resolved_value: resolvedValue,
            },
          },
        },
      ],
    });

    const upgradedRule = await deps.securitySolutionApi.readRule({
      query: { rule_id: DEFAULT_TEST_RULE_ID },
    });

    expectRuleFields(response.results.updated[0], expectedFieldsAfterUpgrade);
    expectRuleFields(upgradedRule.body, expectedFieldsAfterUpgrade);
  });
}

interface FieldAbsenceAssertParams {
  diffableRuleFieldName: string;
}

/**
 * Asserts provided non-customized `diffableRuleFieldName` isn't presented
 * in the diff (`AAA` diff case)
 */
function expectAAAFieldDiff(
  ruleDiff: PartialRuleDiff,
  fieldAssertParams: FieldAbsenceAssertParams
): void {
  expect(ruleDiff).toMatchObject({
    num_fields_with_updates: 1, // counts version field
    num_fields_with_conflicts: 0,
    num_fields_with_non_solvable_conflicts: 0,
  });
  expect(ruleDiff.fields).not.toMatchObject({
    [fieldAssertParams.diffableRuleFieldName]: expect.anything(),
  });
}

interface FieldAssertParams {
  diffableRuleFieldName: string;
  valueVersions: FieldDiffValueVersions;
}

/**
 * Asserts provided non-customized `diffableRuleFieldName` doesn't have a conflict
 * and ready for upgrade (`AAB` diff case)
 */
function expectAABFieldDiff(ruleDiff: PartialRuleDiff, fieldAssertParams: FieldAssertParams): void {
  expect(ruleDiff).toMatchObject({
    num_fields_with_updates: 2, // counts <fieldName> + version field
    num_fields_with_conflicts: 0,
    num_fields_with_non_solvable_conflicts: 0,
  });
  expect(ruleDiff.fields).toMatchObject({
    [fieldAssertParams.diffableRuleFieldName]: omitBy(
      {
        base_version: fieldAssertParams.valueVersions.base,
        current_version: fieldAssertParams.valueVersions.current,
        target_version: fieldAssertParams.valueVersions.target,
        merged_version: fieldAssertParams.valueVersions.merged,
        diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        merge_outcome: ThreeWayMergeOutcome.Target,
        conflict: ThreeWayDiffConflict.NONE,
      },
      isUndefined
    ),
  });
}

/**
 * Asserts provided customized `diffableRuleFieldName` without an upgrade doesn't have a conflict
 * and ready for upgrade (`ABA` diff case)
 */
function expectABAFieldDiff(ruleDiff: PartialRuleDiff, fieldAssertParams: FieldAssertParams): void {
  expect(ruleDiff).toMatchObject({
    num_fields_with_updates: 1, // counts version field
    num_fields_with_conflicts: 0,
    num_fields_with_non_solvable_conflicts: 0,
  });
  expect(ruleDiff.fields).toMatchObject({
    [fieldAssertParams.diffableRuleFieldName]: omitBy(
      {
        base_version: fieldAssertParams.valueVersions.base,
        current_version: fieldAssertParams.valueVersions.current,
        target_version: fieldAssertParams.valueVersions.target,
        merged_version: fieldAssertParams.valueVersions.merged,
        diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
        merge_outcome: ThreeWayMergeOutcome.Current,
        conflict: ThreeWayDiffConflict.NONE,
      },
      isUndefined
    ),
  });
}

/**
 * Asserts provided customized `diffableRuleFieldName` with the matching update
 * doesn't have a conflict and is ready for upgrade (`ABB` diff case)
 */
function expectABBFieldDiff(ruleDiff: PartialRuleDiff, fieldAssertParams: FieldAssertParams): void {
  expect(ruleDiff).toMatchObject({
    num_fields_with_updates: 1, // counts version field
    num_fields_with_conflicts: 0,
    num_fields_with_non_solvable_conflicts: 0,
  });
  expect(ruleDiff.fields).toMatchObject({
    [fieldAssertParams.diffableRuleFieldName]: omitBy(
      {
        base_version: fieldAssertParams.valueVersions.base,
        current_version: fieldAssertParams.valueVersions.current,
        target_version: fieldAssertParams.valueVersions.target,
        merged_version: fieldAssertParams.valueVersions.merged,
        diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
        merge_outcome: ThreeWayMergeOutcome.Current,
        conflict: ThreeWayDiffConflict.NONE,
      },
      isUndefined
    ),
  });
}

/**
 * Asserts provided customized `diffableRuleFieldName` with an upgrade
 * has a solvable conflict (`ABC` diff case)
 */
function expectSolvableABCFieldDiff(
  ruleDiff: PartialRuleDiff,
  fieldAssertParams: FieldAssertParams
): void {
  expect(ruleDiff).toMatchObject({
    num_fields_with_updates: 2, // counts <diffableRuleFieldName> + version field
    num_fields_with_conflicts: 1,
    num_fields_with_non_solvable_conflicts: 0,
  });
  expect(ruleDiff.fields).toMatchObject({
    [fieldAssertParams.diffableRuleFieldName]: omitBy(
      {
        base_version: fieldAssertParams.valueVersions.base,
        current_version: fieldAssertParams.valueVersions.current,
        target_version: fieldAssertParams.valueVersions.target,
        merged_version: fieldAssertParams.valueVersions.merged,
        diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        merge_outcome: ThreeWayMergeOutcome.Merged,
        conflict: ThreeWayDiffConflict.SOLVABLE,
      },
      isUndefined
    ),
  });
}

/**
 * Asserts provided customized `diffableRuleFieldName` with an upgrade
 * has a non-solvable conflict (`ABC` diff case)
 */
function expectNonSolvableABCFieldDiff(
  ruleDiff: PartialRuleDiff,
  fieldAssertParams: FieldAssertParams
): void {
  expect(ruleDiff).toMatchObject({
    num_fields_with_updates: 2, // counts <diffableRuleFieldName> + version field
    num_fields_with_conflicts: 1,
    num_fields_with_non_solvable_conflicts: 1,
  });
  expect(ruleDiff.fields).toMatchObject({
    [fieldAssertParams.diffableRuleFieldName]: omitBy(
      {
        base_version: fieldAssertParams.valueVersions.base,
        current_version: fieldAssertParams.valueVersions.current,
        target_version: fieldAssertParams.valueVersions.target,
        merged_version: fieldAssertParams.valueVersions.merged,
        diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        merge_outcome: ThreeWayMergeOutcome.Current,
        conflict: ThreeWayDiffConflict.NON_SOLVABLE,
      },
      isUndefined
    ),
  });
}

/**
 * With historical versions missing
 * Asserts provided `diffableRuleFieldName` with an upgrade
 * has the matching upgrade (`-AA` diff case)
 */
function expectMissingBaseAAFieldDiff(
  ruleDiff: PartialRuleDiff,
  fieldAssertParams: FieldAbsenceAssertParams
): void {
  expect(ruleDiff).toMatchObject({
    num_fields_with_updates: 1, // counts version field
    num_fields_with_conflicts: 0,
    num_fields_with_non_solvable_conflicts: 0,
  });
  expect(ruleDiff.fields).not.toMatchObject({
    [fieldAssertParams.diffableRuleFieldName]: expect.anything(),
  });
}

interface MissingBaseFieldAssertParams {
  diffableRuleFieldName: string;
  valueVersions: MissingHistoricalRuleVersionsFieldDiffValueVersions;
  isMergableField?: boolean;
}

/**
 * With historical versions missing
 * Asserts provided `diffableRuleFieldName` with an upgrade
 * has an upgrade (`-AB` diff case)
 */
function expectMissingBaseABFieldDiff(
  ruleDiff: PartialRuleDiff,
  fieldAssertParams: MissingBaseFieldAssertParams
): void {
  expect(ruleDiff).toMatchObject({
    num_fields_with_updates: 2, // counts <diffableRuleFieldName> + version field
    num_fields_with_conflicts: 1,
    num_fields_with_non_solvable_conflicts: 0,
  });
  expect(ruleDiff.fields).toMatchObject({
    [fieldAssertParams.diffableRuleFieldName]: omitBy(
      {
        current_version: fieldAssertParams.valueVersions.current,
        target_version: fieldAssertParams.valueVersions.target,
        merged_version: fieldAssertParams.valueVersions.merged,
        diff_outcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
        merge_outcome: fieldAssertParams.isMergableField
          ? ThreeWayMergeOutcome.Merged
          : ThreeWayMergeOutcome.Target,
        conflict: ThreeWayDiffConflict.SOLVABLE,
      },
      isUndefined
    ),
  });
}

/**
 * Assertion helper to assert `fields` are presented in `maybeRule`.
 *
 * For any field's undefined value expectation is built to assert absence of the field.
 */
function expectRuleFields(maybeRule: Record<string, unknown>, fields: Partial<RuleResponse>): void {
  for (const [fieldName, value] of Object.entries(fields)) {
    if (value === undefined) {
      expect(maybeRule).not.toMatchObject({
        [fieldName]: expect.anything(),
      });
    } else {
      expect(maybeRule).toMatchObject({
        [fieldName]: value,
      });
    }
  }
}
