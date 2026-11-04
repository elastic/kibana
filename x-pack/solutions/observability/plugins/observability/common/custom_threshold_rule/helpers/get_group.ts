/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { flattenObject } from '@kbn/object-utils';
import { ALERT_GROUP, ALERT_GROUP_FIELD, ALERT_GROUP_VALUE } from '@kbn/rule-data-utils';
import type { Group } from '../../typings';

const isScalarGroupValue = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

export const getGroupsFromGroupingObject = (grouping: unknown): Group[] => {
  if (grouping == null || typeof grouping !== 'object' || Array.isArray(grouping)) {
    return [];
  }

  const flattened = flattenObject(grouping as Record<string, unknown>);

  return Object.entries(flattened).flatMap(([field, value]) =>
    isScalarGroupValue(value) ? [{ field, value: String(value) }] : []
  );
};

/*
 * groupFieldName
 * In some cases, like AAD indices, the field name for group value is different from group.field,
 * in AAD case, it is ALERT_GROUP_VALUE (`kibana.alert.group.value`). groupFieldName allows
 * passing a different field name to be used in the query.
 */
export const getGroupQueries = (
  groups?: Group[],
  groupFieldName?: string
): QueryDslQueryContainer[] => {
  return (
    (groups &&
      groups.map((group) => ({
        match_phrase: {
          [groupFieldName || group.field]: group.value,
        },
      }))) ||
    []
  );
};

export const getGroupFilters = (groups?: Group[], groupFieldName?: string): Filter[] => {
  return getGroupQueries(groups, groupFieldName).map((query) => ({ meta: {}, query }));
};

export const getGroups = (fields: string[] = [], values: string[] = []): Group[] => {
  return fields.map((_, index) => ({
    field: fields[index],
    value: values[index],
  }));
};

const acceptedGroupValue = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
};

const acceptedGroupValues = (value: unknown): string[] => {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((item) => {
    const accepted = acceptedGroupValue(item);
    return accepted ? [accepted] : [];
  });
};

const acceptedGroupField = (value: unknown): string | undefined => {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
};

/** Reads nested or flattened `kibana.alert.group` fields into group pairs. */
export const getGroupsFromAlertFields = (fields: Record<string, unknown>): Group[] => {
  const raw = fields[ALERT_GROUP];
  if (Array.isArray(raw)) {
    return raw.flatMap((item) => {
      if (item === null || typeof item !== 'object' || Array.isArray(item)) {
        return [];
      }
      const group = item as { field?: unknown; value?: unknown };
      const field = acceptedGroupField(group.field);
      const value = acceptedGroupValues(group.value)[0];
      return field && value ? [{ field, value }] : [];
    });
  }

  const groupFields = acceptedGroupValues(fields[ALERT_GROUP_FIELD]);
  const groupValues = acceptedGroupValues(fields[ALERT_GROUP_VALUE]);
  if (groupFields.length === 0 || groupFields.length !== groupValues.length) {
    return [];
  }
  return getGroups(groupFields, groupValues).filter((group) => group.field && group.value);
};
