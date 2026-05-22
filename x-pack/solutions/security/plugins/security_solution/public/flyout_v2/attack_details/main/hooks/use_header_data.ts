/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';

const FIELD_ATTACK_TITLE = 'kibana.alert.attack_discovery.title' as const;
const FIELD_TIMESTAMP = '@timestamp' as const;
const FIELD_ALERT_IDS = 'kibana.alert.attack_discovery.alert_ids' as const;
const FIELD_REPLACEMENTS = 'kibana.alert.attack_discovery.replacements' as const;

const EMPTY_REPLACEMENTS = {};

/**
 * Normalize a value into a string array
 */
export const normalizeToStringArray = (value: string | string[] | null | undefined): string[] => {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

/**
 * Centralized hook for Attack header data only.
 *
 * Reads fields directly off the `DataTableRecord` `flattened` map. Scalar
 * fields go through `getFieldValue` (which unwraps single-element arrays);
 * fields the legacy flyout treated as arrays (alert ids, replacements
 * object) are read raw from `hit.flattened` so the multi-value shape is
 * preserved.
 */
export const useHeaderData = (hit: DataTableRecord) => {
  const title = useMemo(
    () => (getFieldValue(hit, FIELD_ATTACK_TITLE) as string | undefined) ?? '',
    [hit]
  );
  const timestamp = useMemo(() => getFieldValue(hit, FIELD_TIMESTAMP) as string | undefined, [hit]);
  const alertIds = useMemo(
    () =>
      normalizeToStringArray(
        hit.flattened[FIELD_ALERT_IDS] as string | string[] | null | undefined
      ),
    [hit]
  );

  // Remove duplicated alert IDs for the update status action
  const nonDuplicatedAlertIds = useMemo(() => [...new Set(alertIds)], [alertIds]);

  const replacements = useMemo(() => {
    const value = hit.flattened[FIELD_REPLACEMENTS];

    if (!value || typeof value === 'string' || Array.isArray(value)) {
      return EMPTY_REPLACEMENTS;
    }

    return value as Record<string, string>;
  }, [hit]);

  const assignees = useMemo(() => {
    const value = hit.flattened[ALERT_WORKFLOW_ASSIGNEE_IDS] as string[] | string | undefined;
    return normalizeToStringArray(value);
  }, [hit]);

  return useMemo(
    () => ({
      title,
      timestamp,
      alertIds: nonDuplicatedAlertIds,
      alertsCount: alertIds.length,
      replacements,
      assignees,
    }),
    [title, timestamp, nonDuplicatedAlertIds, alertIds.length, replacements, assignees]
  );
};
