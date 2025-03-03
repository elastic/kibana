/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  DiffableCommonFields,
  NON_UPGRADEABLE_DIFFABLE_FIELDS,
  type DiffableCustomQueryFields,
  type DiffableEqlFields,
  type DiffableEsqlFields,
  type DiffableMachineLearningFields,
  type DiffableNewTermsFields,
  type DiffableSavedQueryFields,
  type DiffableThreatMatchFields,
  type DiffableThresholdFields,
  type RuleFieldsDiff,
} from '../../../../../common/api/detection_engine';

export type NonUpgradeableDiffableFields = (typeof NON_UPGRADEABLE_DIFFABLE_FIELDS)[number];

export type UpgradeableDiffableFields = Exclude<keyof RuleFieldsDiff, NonUpgradeableDiffableFields>;

export type UpgradeableCommonFields = Exclude<
  keyof DiffableCommonFields,
  NonUpgradeableDiffableFields
>;

export type UpgradeableCustomQueryFields = Exclude<
  keyof DiffableCustomQueryFields,
  NonUpgradeableDiffableFields
>;

export type UpgradeableSavedQueryFields = Exclude<
  keyof DiffableSavedQueryFields,
  NonUpgradeableDiffableFields
>;

export type UpgradeableEqlFields = Exclude<keyof DiffableEqlFields, NonUpgradeableDiffableFields>;

export type UpgradeableEsqlFields = Exclude<keyof DiffableEsqlFields, NonUpgradeableDiffableFields>;

export type UpgradeableThreatMatchFields = Exclude<
  keyof DiffableThreatMatchFields,
  NonUpgradeableDiffableFields
>;

export type UpgradeableThresholdFields = Exclude<
  keyof DiffableThresholdFields,
  NonUpgradeableDiffableFields
>;

export type UpgradeableMachineLearningFields = Exclude<
  keyof DiffableMachineLearningFields,
  NonUpgradeableDiffableFields
>;

export type UpgradeableNewTermsFields = Exclude<
  keyof DiffableNewTermsFields,
  NonUpgradeableDiffableFields
>;

export const COMMON_FIELD_NAMES = DiffableCommonFields.keyof().options;

export function isCommonFieldName(fieldName: string): fieldName is keyof DiffableCommonFields {
  return (COMMON_FIELD_NAMES as string[]).includes(fieldName);
}

export function isNonUpgradeableFieldName(
  fieldName: string
): fieldName is NonUpgradeableDiffableFields {
  return (NON_UPGRADEABLE_DIFFABLE_FIELDS as Readonly<string[]>).includes(fieldName);
}
