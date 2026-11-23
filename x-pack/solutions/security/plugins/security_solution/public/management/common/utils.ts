/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { DISABLED_ARTIFACT_TAG } from '../../../common/endpoint/service/artifacts/constants';

export const ARTIFACT_ENABLED_STATUSES = ['enabled', 'disabled'] as const;
export type ArtifactEnabledStatus = (typeof ARTIFACT_ENABLED_STATUSES)[number];

export const isArtifactEnabledStatus = (value: unknown): value is ArtifactEnabledStatus =>
  ARTIFACT_ENABLED_STATUSES.includes(value as ArtifactEnabledStatus);

export const parseQueryFilterToKQL = (
  filter: string | undefined,
  fields: Readonly<string[]>
): string => {
  if (!filter) return '';
  const kuery = fields
    .map(
      (field) =>
        `exception-list-agnostic.attributes.${field}:(*${filter
          .trim()
          .replace(/([\)\(\<\>\}\{\"\:\\])/gm, '\\$&') // Escape problematic chars
          .replace(/\s/gm, '*')}*)`
    )
    .join(' OR ');

  return `(${kuery})`;
};

export const getPolicyQuery = (policyId: string): string => {
  if (policyId === 'global') return 'exception-list-agnostic.attributes.tags:"policy:all"';
  if (policyId === 'unassigned') return '(not exception-list-agnostic.attributes.tags:policy\\:*)';
  return `exception-list-agnostic.attributes.tags:"policy:${policyId}"`;
};

export const parsePoliciesToKQL = (
  includedPolicies: string[],
  excludedPolicies: string[] = []
): string => {
  if (isEmpty(includedPolicies) && isEmpty(excludedPolicies)) return '';

  const includedPoliciesKuery = includedPolicies.map(getPolicyQuery).join(' OR ');

  const excludedPoliciesKuery = excludedPolicies
    .map((policyId) => `not ${getPolicyQuery(policyId)}`)
    .join(' AND ');

  const kuery = [];

  if (includedPoliciesKuery) kuery.push(includedPoliciesKuery);
  if (excludedPoliciesKuery) kuery.push(excludedPoliciesKuery);

  return `(${kuery.join(' AND ')})`;
};

export const getEnabledStatusQuery = (enabledStatus: ArtifactEnabledStatus): string => {
  const disabledTagQuery = `exception-list-agnostic.attributes.tags:"${DISABLED_ARTIFACT_TAG}"`;
  return enabledStatus === 'disabled' ? disabledTagQuery : `not ${disabledTagQuery}`;
};

/**
 * Takes a list of policies (string[]), an optional enabled status and an existing kuery
 * (string) and returns an unified KQL with and AND
 * The policy list can also contain "unassigned" and "global".
 * @param policies string[] a list of policies ids.
 * @param excludedPolicies string[] a list of policies ids to exclude.
 * @param enabledStatus filters for enabled or disabled artifacts.
 * @param kuery string an existing KQL.
 */
export const parsePoliciesAndFilterToKql = ({
  policies = [],
  excludedPolicies = [],
  enabledStatus,
  kuery,
}: {
  policies?: string[];
  excludedPolicies?: string[];
  enabledStatus?: ArtifactEnabledStatus;
  kuery?: string;
}): string | undefined => {
  const filters: string[] = [];

  if (policies.length > 0 || excludedPolicies.length > 0) {
    filters.push(`(${parsePoliciesToKQL(policies, excludedPolicies)})`);
  }

  if (enabledStatus) {
    filters.push(`(${getEnabledStatusQuery(enabledStatus)})`);
  }

  if (filters.length === 0) {
    return kuery ? kuery : undefined;
  }

  return [...filters, ...(kuery ? [`(${kuery})`] : [])].join(' AND ');
};

/**
 * Counts the number of conditions added for a new Event filter or Trusted app
 * @param formFields
 * @returns number of fields
 */
export const getAddedFieldsCounts = (formFields: string[]): { [k: string]: number } =>
  formFields.reduce<{ [k: string]: number }>((allFields, field) => {
    if (field in allFields) {
      allFields[field]++;
    } else {
      allFields[field] = 1;
    }
    return allFields;
  }, {});

/**
 * Checks if conditions in Event filters or Trusted Apps forms have duplicate fields
 * @param formFields
 * @returns boolean
 */
export const computeHasDuplicateFields = (formFieldsMap: Record<string, number>): boolean =>
  Object.values(formFieldsMap).some((e) => e > 1);
