/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import _ from 'lodash';
import type { Matcher, MonitoringLabel } from '../../../../../../common/api/entity_analytics';

/**
 * Generates monitoring labels for a document based on a set of matchers.
 *
 * @param source - Identifier of the data source (e.g., "integration.okta") to include in each label.
 * @param matchers - A list of matchers describing which fields and values indicate privileged status.
 * @param document - The source document to evaluate.
 * @returns An array of MonitoringLabel objects, one per matched field/value.
 *
 * @example
 * const matchers = [{
 *   fields: ['user.roles'],
 *   values: ['Super Administrator', 'Application Administrator']
 * }];
 *
 * const doc = {
 *   user: {
 *     roles: ['Super Administrator', 'Some Other Role']
 *   }
 * };
 *
 * // Result
 * generateMonitoringLabels('integration.okta', matchers, doc) =>
 * [
 *   { field: 'user.roles', value: 'Super Administrator', source: 'integration.okta' }
 * ]
 *
 */
export const generateMonitoringLabels = (
  source: string,
  matchers: Matcher[] = [],
  document: object
): MonitoringLabel[] =>
  removeDuplicateLabels(
    matchers.flatMap((matcher) => applyValuesMatcher(source, matcher, document))
  );

const applyValuesMatcher = (
  source: string,
  matcher: Matcher,
  document: object
): MonitoringLabel[] => {
  return matcher.fields.flatMap((field) => {
    const fieldValue = _.get(document, field, []);

    return []
      .concat(fieldValue) // coerce to array for uniform processing of single vs multi-valued fields
      .map((value) => String(value))
      .filter((value) => matcher.values.includes(value))
      .map((value) => ({
        field,
        value,
        source,
      }));
  });
};

const removeDuplicateLabels = (labels: MonitoringLabel[]): MonitoringLabel[] => {
  return _.uniqBy(labels, (label) => label.field + label.value); // source will be the same for all
};
