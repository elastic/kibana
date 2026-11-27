/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { VULNERABILITY_FIELDS, VULNERABILITY_GROUPING_OPTIONS } from '../../../common/constants';

/**
 * Structural shape accepted both by {@link GroupingQueryArgs.runtimeMappings}
 * and by the ES search request `runtime_mappings` parameter.
 */
type FixGroupRuntimeMappings = Record<string, { type: 'keyword'; script: { source: string } }>;

/** Joins the parts of a fix-group key; never appears inside ids, names or versions. */
export const FIX_GROUP_KEY_SEPARATOR = ' :: ';

/** Fixed-version part for findings whose vendor has not shipped a fix yet. */
export const FIX_GROUP_NO_FIX = 'NO_FIX';

const advisoryPackageScript = `
  if (!doc.containsKey('${VULNERABILITY_FIELDS.PACKAGE_NAME}') || doc['${VULNERABILITY_FIELDS.PACKAGE_NAME}'].empty) { return; }
  if (!doc.containsKey('${VULNERABILITY_FIELDS.ADVISORIES}') || doc['${VULNERABILITY_FIELDS.ADVISORIES}'].empty) { return; }
  def pkg = doc['${VULNERABILITY_FIELDS.PACKAGE_NAME}'].value;
  for (adv in doc['${VULNERABILITY_FIELDS.ADVISORIES}']) {
    emit(pkg + '${FIX_GROUP_KEY_SEPARATOR}' + adv);
  }
`;

const packageFixedScript = `
  if (!doc.containsKey('${VULNERABILITY_FIELDS.PACKAGE_NAME}') || doc['${VULNERABILITY_FIELDS.PACKAGE_NAME}'].empty) { return; }
  def pkg = doc['${VULNERABILITY_FIELDS.PACKAGE_NAME}'].value;
  def fixed = '${FIX_GROUP_NO_FIX}';
  if (doc.containsKey('${VULNERABILITY_FIELDS.PACKAGE_FIXED_VERSION}') && !doc['${VULNERABILITY_FIELDS.PACKAGE_FIXED_VERSION}'].empty) {
    fixed = doc['${VULNERABILITY_FIELDS.PACKAGE_FIXED_VERSION}'].value;
  }
  emit(pkg + '${FIX_GROUP_KEY_SEPARATOR}' + fixed);
`;

/**
 * Runtime mappings for the two fix-group composite keys. Scripts only run when
 * the request references the field, so including both mappings in every
 * vulnerabilities search costs nothing until a fix group is selected or
 * filtered on.
 */
export const getFixGroupRuntimeMappings = (): FixGroupRuntimeMappings => ({
  [VULNERABILITY_GROUPING_OPTIONS.FIX_GROUP_ADVISORY_PACKAGE]: {
    type: 'keyword',
    script: { source: advisoryPackageScript.trim() },
  },
  [VULNERABILITY_GROUPING_OPTIONS.FIX_GROUP_PACKAGE_FIXED]: {
    type: 'keyword',
    script: { source: packageFixedScript.trim() },
  },
});

/** Splits a fix-group bucket key into its `[first, second]` parts. */
export const splitFixGroupKey = (key: string): [string, string] | undefined => {
  if (!key) return undefined;
  const parts = key.split(FIX_GROUP_KEY_SEPARATOR);
  return parts.length === 2 ? [parts[0], parts[1]] : undefined;
};
