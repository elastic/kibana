/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAttackDetailsContext } from '../context';
import { getField } from '../../document_details/shared/utils';

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
 * Centralized hook for Attack header data only
 */
export const useHeaderData = () => {
  const { getFieldsData } = useAttackDetailsContext();

  const title = useMemo(() => getField(getFieldsData(FIELD_ATTACK_TITLE)) ?? '', [getFieldsData]);
  const timestamp = useMemo(() => getField(getFieldsData(FIELD_TIMESTAMP)), [getFieldsData]);
  const alertIds = useMemo(
    () => normalizeToStringArray(getFieldsData(FIELD_ALERT_IDS)),
    [getFieldsData]
  );

  // Remove duplicated alert IDs for the update status action
  const nonDuplicatedAlertIds = useMemo(() => [...new Set(alertIds)], [alertIds]);

  const replacements = useMemo(() => {
    const value = getFieldsData(FIELD_REPLACEMENTS);

    if (!value || typeof value === 'string' || Array.isArray(value)) {
      return EMPTY_REPLACEMENTS;
    }

    return value;
  }, [getFieldsData]);

  return useMemo(
    () => ({
      title,
      timestamp,
      alertIds: nonDuplicatedAlertIds,
      alertsCount: alertIds.length,
      replacements,
    }),
    [title, timestamp, nonDuplicatedAlertIds, alertIds.length, replacements]
  );
};
