/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { TimelineNonEcsData } from '@kbn/timelines-plugin/common';

/**
 * Recursively flattens a nested object into TimelineNonEcsData format.
 * Handles ECS structure where values can be arrays (e.g. host.name: ['value']).
 */
function flattenToTimelineNonEcsData(obj: unknown, prefix = ''): TimelineNonEcsData[] {
  const result: TimelineNonEcsData[] = [];

  if (obj == null) {
    return result;
  }

  if (Array.isArray(obj)) {
    const values = obj.filter(
      (v): v is string | number => typeof v === 'string' || typeof v === 'number'
    );
    if (values.length > 0 && prefix) {
      result.push({ field: prefix, value: values.map(String) });
    }
    return result;
  }

  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
    for (const key of Object.keys(obj)) {
      if (key !== '__proto__' && key !== 'constructor') {
        const value = (obj as Record<string, unknown>)[key];
        const fieldName = prefix ? `${prefix}.${key}` : key;

        if (value != null && typeof value === 'object' && !Array.isArray(value)) {
          result.push(...flattenToTimelineNonEcsData(value, fieldName));
        } else if (Array.isArray(value)) {
          const values = value.filter(
            (v): v is string | number => typeof v === 'string' || typeof v === 'number'
          );
          if (values.length > 0) {
            result.push({ field: fieldName, value: values.map(String) });
          }
        } else if (typeof value === 'string' || typeof value === 'number') {
          result.push({ field: fieldName, value: [String(value)] });
        }
      }
    }
  }

  return result;
}

/**
 * Merges timeline data with ECS data so entity identifier utils have access to all fields.
 * Data from the `data` array takes precedence over ECS for overlapping fields.
 */
export const mergeTimelineDataWithEcs = (
  data: TimelineNonEcsData[] | undefined,
  ecsData: Ecs | undefined
): TimelineNonEcsData[] => {
  if (!ecsData) {
    return data ?? [];
  }

  const dataFieldSet = new Set((data ?? []).map((d) => d.field));
  const ecsFlat = flattenToTimelineNonEcsData(ecsData);

  const merged: TimelineNonEcsData[] = [...(data ?? [])];

  for (const item of ecsFlat) {
    if (!dataFieldSet.has(item.field)) {
      dataFieldSet.add(item.field);
      merged.push(item);
    }
  }

  return merged;
};
