/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertUnreachable } from '../../../../../../../common/utility_types';
import { invariant } from '../../../../../../../common/utils/invariant';

import type {
  AllThreeWayFieldsDiff,
  DiffableAllFields,
  DiffableCommonFields,
  DiffableCustomQueryFields,
  DiffableEqlFields,
  DiffableEsqlFields,
  DiffableMachineLearningFields,
  DiffableNewTermsFields,
  DiffableRule,
  DiffableSavedQueryFields,
  DiffableThreatMatchFields,
  DiffableThresholdFields,
  CommonThreeWayFieldsDiff,
  CustomQueryThreeWayFieldsDiff,
  EqlThreeWayFieldsDiff,
  EsqlThreeWayFieldsDiff,
  MachineLearningThreeWayFieldsDiff,
  NewTermsThreeWayFieldsDiff,
  ThreeWayRuleFieldsDiff,
  SavedQueryThreeWayFieldsDiff,
  ThreatMatchThreeWayFieldsDiff,
  ThresholdThreeWayFieldsDiff,
} from '../../../../../../../common/api/detection_engine/prebuilt_rules';

import type { ThreeWayFieldsDiffAlgorithmsFor } from '../../../../../../../common/api/detection_engine/prebuilt_rules/model/diff/three_way_diff/three_way_fields_diff';
import type { ThreeVersionsOf } from '../../../../../../../common/api/detection_engine/prebuilt_rules/model/diff/three_way_diff/three_way_diff';
import { MissingVersion } from '../../../../../../../common/api/detection_engine/prebuilt_rules/model/diff/three_way_diff/three_way_diff';
import { calculateFieldsDiffFor } from './diff_calculation_helpers';
import {
  dataSourceDiffAlgorithm,
  multiLineStringDiffAlgorithm,
  numberDiffAlgorithm,
  simpleDiffAlgorithm,
  singleLineStringDiffAlgorithm,
  kqlQueryDiffAlgorithm,
  eqlQueryDiffAlgorithm,
  esqlQueryDiffAlgorithm,
  ruleTypeDiffAlgorithm,
  forceTargetVersionDiffAlgorithm,
} from './three_way_diff_algorithms';
import {
  ScalarArrayDiffMissingBaseVersionStrategy,
  createScalarArrayDiffAlgorithm,
} from './three_way_diff_algorithms/scalar_array_diff_algorithm';

const BASE_TYPE_ERROR = `Base version can't be of different rule type`;
const TARGET_TYPE_ERROR = `Target version can't be of different rule type`;

/**
 * Calculates a three-way diff per each top-level rule field.
 * Returns an object which keys are equal to rule's field names and values are
 * three-way diffs calculated for those fields.
 */
export const calculateThreeWayRuleFieldsDiff = (
  ruleVersions: ThreeVersionsOf<DiffableRule>,
  isRuleCustomized: boolean = false
): ThreeWayRuleFieldsDiff => {
  const commonFieldsDiff = calculateCommonFieldsDiff(ruleVersions, isRuleCustomized);
  const { base_version, current_version, target_version } = ruleVersions;
  const hasBaseVersion = base_version !== MissingVersion;

  const isRuleTypeDifferentInTargetVersion = current_version.type !== target_version.type;
  const isRuleTypeDifferentInBaseVersion = hasBaseVersion
    ? current_version.type !== base_version.type
    : false;

  if (isRuleTypeDifferentInTargetVersion || isRuleTypeDifferentInBaseVersion) {
    // If rule type has been changed by Elastic in the target version (can happen)
    // or by user in the current version (should never happen), we can't calculate the diff
    // only for fields of a single rule type, and need to calculate it for all fields
    // of all the rule types we have.
    // TODO: Try to get rid of "as" casting
    return calculateAllFieldsDiff(
      {
        base_version: base_version as DiffableAllFields | MissingVersion,
        current_version: current_version as DiffableAllFields,
        target_version: target_version as DiffableAllFields,
      },
      isRuleCustomized
    ) as ThreeWayRuleFieldsDiff;
  }

  switch (current_version.type) {
    case 'query': {
      if (hasBaseVersion) {
        invariant(base_version.type === 'query', BASE_TYPE_ERROR);
      }
      invariant(target_version.type === 'query', TARGET_TYPE_ERROR);
      return {
        ...commonFieldsDiff,
        ...calculateCustomQueryFieldsDiff(
          { base_version, current_version, target_version },
          isRuleCustomized
        ),
      };
    }
    case 'saved_query': {
      if (hasBaseVersion) {
        invariant(base_version.type === 'saved_query', BASE_TYPE_ERROR);
      }
      invariant(target_version.type === 'saved_query', TARGET_TYPE_ERROR);
      return {
        ...commonFieldsDiff,
        ...calculateSavedQueryFieldsDiff(
          { base_version, current_version, target_version },
          isRuleCustomized
        ),
      };
    }
    case 'eql': {
      if (hasBaseVersion) {
        invariant(base_version.type === 'eql', BASE_TYPE_ERROR);
      }
      invariant(target_version.type === 'eql', TARGET_TYPE_ERROR);
      return {
        ...commonFieldsDiff,
        ...calculateEqlFieldsDiff(
          { base_version, current_version, target_version },
          isRuleCustomized
        ),
      };
    }
    case 'threat_match': {
      if (hasBaseVersion) {
        invariant(base_version.type === 'threat_match', BASE_TYPE_ERROR);
      }
      invariant(target_version.type === 'threat_match', TARGET_TYPE_ERROR);
      return {
        ...commonFieldsDiff,
        ...calculateThreatMatchFieldsDiff(
          { base_version, current_version, target_version },
          isRuleCustomized
        ),
      };
    }
    case 'threshold': {
      if (hasBaseVersion) {
        invariant(base_version.type === 'threshold', BASE_TYPE_ERROR);
      }
      invariant(target_version.type === 'threshold', TARGET_TYPE_ERROR);
      return {
        ...commonFieldsDiff,
        ...calculateThresholdFieldsDiff(
          { base_version, current_version, target_version },
          isRuleCustomized
        ),
      };
    }
    case 'machine_learning': {
      if (hasBaseVersion) {
        invariant(base_version.type === 'machine_learning', BASE_TYPE_ERROR);
      }
      invariant(target_version.type === 'machine_learning', TARGET_TYPE_ERROR);
      return {
        ...commonFieldsDiff,
        ...calculateMachineLearningFieldsDiff(
          { base_version, current_version, target_version },
          isRuleCustomized
        ),
      };
    }
    case 'new_terms': {
      if (hasBaseVersion) {
        invariant(base_version.type === 'new_terms', BASE_TYPE_ERROR);
      }
      invariant(target_version.type === 'new_terms', TARGET_TYPE_ERROR);
      return {
        ...commonFieldsDiff,
        ...calculateNewTermsFieldsDiff(
          { base_version, current_version, target_version },
          isRuleCustomized
        ),
      };
    }
    case 'esql': {
      if (hasBaseVersion) {
        invariant(base_version.type === 'esql', BASE_TYPE_ERROR);
      }
      invariant(target_version.type === 'esql', TARGET_TYPE_ERROR);
      return {
        ...commonFieldsDiff,
        ...calculateEsqlFieldsDiff(
          { base_version, current_version, target_version },
          isRuleCustomized
        ),
      };
    }
    default: {
      return assertUnreachable(current_version, 'Unhandled rule type');
    }
  }
};

const calculateCommonFieldsDiff = (
  ruleVersions: ThreeVersionsOf<DiffableCommonFields>,
  isRuleCustomized: boolean
): CommonThreeWayFieldsDiff => {
  return calculateFieldsDiffFor(ruleVersions, commonFieldsDiffAlgorithms, isRuleCustomized);
};

const commonFieldsDiffAlgorithms: ThreeWayFieldsDiffAlgorithmsFor<DiffableCommonFields> = {
  rule_id: simpleDiffAlgorithm,
  /**
   * `version` shouldn't have a conflict. It always get target value automatically.
   * Diff has informational purpose.
   */
  version: forceTargetVersionDiffAlgorithm,
  name: singleLineStringDiffAlgorithm,
  tags: createScalarArrayDiffAlgorithm({
    missingBaseVersionStrategy: ScalarArrayDiffMissingBaseVersionStrategy.UseTarget,
  }),
  description: multiLineStringDiffAlgorithm,
  severity: singleLineStringDiffAlgorithm,
  severity_mapping: simpleDiffAlgorithm,
  risk_score: numberDiffAlgorithm,
  risk_score_mapping: simpleDiffAlgorithm,
  references: createScalarArrayDiffAlgorithm({
    missingBaseVersionStrategy: ScalarArrayDiffMissingBaseVersionStrategy.UseTarget,
  }),
  false_positives: simpleDiffAlgorithm,
  threat: simpleDiffAlgorithm,
  note: multiLineStringDiffAlgorithm,
  setup: multiLineStringDiffAlgorithm,
  related_integrations: simpleDiffAlgorithm,
  required_fields: simpleDiffAlgorithm,
  rule_schedule: simpleDiffAlgorithm,
  max_signals: numberDiffAlgorithm,
  rule_name_override: simpleDiffAlgorithm,
  timestamp_override: simpleDiffAlgorithm,
  timeline_template: simpleDiffAlgorithm,
  building_block: simpleDiffAlgorithm,
  investigation_fields: simpleDiffAlgorithm,
};

const calculateCustomQueryFieldsDiff = (
  ruleVersions: ThreeVersionsOf<DiffableCustomQueryFields>,
  isRuleCustomized: boolean
): CustomQueryThreeWayFieldsDiff => {
  return calculateFieldsDiffFor(ruleVersions, customQueryFieldsDiffAlgorithms, isRuleCustomized);
};

const customQueryFieldsDiffAlgorithms: ThreeWayFieldsDiffAlgorithmsFor<DiffableCustomQueryFields> =
  {
    type: ruleTypeDiffAlgorithm,
    kql_query: kqlQueryDiffAlgorithm,
    data_source: dataSourceDiffAlgorithm,
    alert_suppression: simpleDiffAlgorithm,
  };

const calculateSavedQueryFieldsDiff = (
  ruleVersions: ThreeVersionsOf<DiffableSavedQueryFields>,
  isRuleCustomized: boolean
): SavedQueryThreeWayFieldsDiff => {
  return calculateFieldsDiffFor(ruleVersions, savedQueryFieldsDiffAlgorithms, isRuleCustomized);
};

const savedQueryFieldsDiffAlgorithms: ThreeWayFieldsDiffAlgorithmsFor<DiffableSavedQueryFields> = {
  type: ruleTypeDiffAlgorithm,
  kql_query: kqlQueryDiffAlgorithm,
  data_source: dataSourceDiffAlgorithm,
  alert_suppression: simpleDiffAlgorithm,
};

const calculateEqlFieldsDiff = (
  ruleVersions: ThreeVersionsOf<DiffableEqlFields>,
  isRuleCustomized: boolean
): EqlThreeWayFieldsDiff => {
  return calculateFieldsDiffFor(ruleVersions, eqlFieldsDiffAlgorithms, isRuleCustomized);
};

const eqlFieldsDiffAlgorithms: ThreeWayFieldsDiffAlgorithmsFor<DiffableEqlFields> = {
  type: ruleTypeDiffAlgorithm,
  eql_query: eqlQueryDiffAlgorithm,
  data_source: dataSourceDiffAlgorithm,
  alert_suppression: simpleDiffAlgorithm,
};

const calculateEsqlFieldsDiff = (
  ruleVersions: ThreeVersionsOf<DiffableEsqlFields>,
  isRuleCustomized: boolean
): EsqlThreeWayFieldsDiff => {
  return calculateFieldsDiffFor(ruleVersions, esqlFieldsDiffAlgorithms, isRuleCustomized);
};

const esqlFieldsDiffAlgorithms: ThreeWayFieldsDiffAlgorithmsFor<DiffableEsqlFields> = {
  type: ruleTypeDiffAlgorithm,
  esql_query: esqlQueryDiffAlgorithm,
  alert_suppression: simpleDiffAlgorithm,
};

const calculateThreatMatchFieldsDiff = (
  ruleVersions: ThreeVersionsOf<DiffableThreatMatchFields>,
  isRuleCustomized: boolean
): ThreatMatchThreeWayFieldsDiff => {
  return calculateFieldsDiffFor(ruleVersions, threatMatchFieldsDiffAlgorithms, isRuleCustomized);
};

const threatMatchFieldsDiffAlgorithms: ThreeWayFieldsDiffAlgorithmsFor<DiffableThreatMatchFields> =
  {
    type: ruleTypeDiffAlgorithm,
    kql_query: kqlQueryDiffAlgorithm,
    data_source: dataSourceDiffAlgorithm,
    threat_query: kqlQueryDiffAlgorithm,
    threat_index: createScalarArrayDiffAlgorithm({
      missingBaseVersionStrategy: ScalarArrayDiffMissingBaseVersionStrategy.UseTarget,
    }),
    threat_mapping: simpleDiffAlgorithm,
    threat_indicator_path: singleLineStringDiffAlgorithm,
    alert_suppression: simpleDiffAlgorithm,
  };

const calculateThresholdFieldsDiff = (
  ruleVersions: ThreeVersionsOf<DiffableThresholdFields>,
  isRuleCustomized: boolean
): ThresholdThreeWayFieldsDiff => {
  return calculateFieldsDiffFor(ruleVersions, thresholdFieldsDiffAlgorithms, isRuleCustomized);
};

const thresholdFieldsDiffAlgorithms: ThreeWayFieldsDiffAlgorithmsFor<DiffableThresholdFields> = {
  type: ruleTypeDiffAlgorithm,
  kql_query: kqlQueryDiffAlgorithm,
  data_source: dataSourceDiffAlgorithm,
  threshold: simpleDiffAlgorithm,
  alert_suppression: simpleDiffAlgorithm,
};

const calculateMachineLearningFieldsDiff = (
  ruleVersions: ThreeVersionsOf<DiffableMachineLearningFields>,
  isRuleCustomized: boolean
): MachineLearningThreeWayFieldsDiff => {
  return calculateFieldsDiffFor(
    ruleVersions,
    machineLearningFieldsDiffAlgorithms,
    isRuleCustomized
  );
};

const machineLearningFieldsDiffAlgorithms: ThreeWayFieldsDiffAlgorithmsFor<DiffableMachineLearningFields> =
  {
    type: ruleTypeDiffAlgorithm,
    machine_learning_job_id: simpleDiffAlgorithm,
    anomaly_threshold: numberDiffAlgorithm,
    alert_suppression: simpleDiffAlgorithm,
  };

const calculateNewTermsFieldsDiff = (
  ruleVersions: ThreeVersionsOf<DiffableNewTermsFields>,
  isRuleCustomized: boolean
): NewTermsThreeWayFieldsDiff => {
  return calculateFieldsDiffFor(ruleVersions, newTermsFieldsDiffAlgorithms, isRuleCustomized);
};

const newTermsFieldsDiffAlgorithms: ThreeWayFieldsDiffAlgorithmsFor<DiffableNewTermsFields> = {
  type: ruleTypeDiffAlgorithm,
  kql_query: kqlQueryDiffAlgorithm,
  data_source: dataSourceDiffAlgorithm,
  new_terms_fields: createScalarArrayDiffAlgorithm({
    missingBaseVersionStrategy: ScalarArrayDiffMissingBaseVersionStrategy.UseTarget,
  }),
  history_window_start: singleLineStringDiffAlgorithm,
  alert_suppression: simpleDiffAlgorithm,
};

const calculateAllFieldsDiff = (
  ruleVersions: ThreeVersionsOf<DiffableAllFields>,
  isRuleCustomized: boolean
): AllThreeWayFieldsDiff => {
  return calculateFieldsDiffFor(ruleVersions, allFieldsDiffAlgorithms, isRuleCustomized);
};

const allFieldsDiffAlgorithms: ThreeWayFieldsDiffAlgorithmsFor<DiffableAllFields> = {
  ...commonFieldsDiffAlgorithms,
  ...customQueryFieldsDiffAlgorithms,
  ...savedQueryFieldsDiffAlgorithms,
  ...eqlFieldsDiffAlgorithms,
  ...esqlFieldsDiffAlgorithms,
  ...threatMatchFieldsDiffAlgorithms,
  ...thresholdFieldsDiffAlgorithms,
  ...machineLearningFieldsDiffAlgorithms,
  ...newTermsFieldsDiffAlgorithms,
  type: ruleTypeDiffAlgorithm,
};
