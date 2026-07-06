/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getOriginalAlertIds } from '@kbn/elastic-assistant-common';

const FIELD_ALERT_IDS = 'kibana.alert.attack_discovery.alert_ids' as const;
const FIELD_REPLACEMENTS = 'kibana.alert.attack_discovery.replacements' as const;

const EMPTY_REPLACEMENTS: Record<string, string> = {};

/**
 * Returns the de-obfuscated, de-duplicated original alert IDs for the attack represented by `hit`.
 * Reads alert_ids and replacements from the flattened hit, applies `getOriginalAlertIds` to reverse
 * any anonymization replacements, then dedupes so the related-alerts count isn't over-counted.
 */
export const useAttackAlertIds = (hit: DataTableRecord): string[] => {
  const alertIds = useMemo(() => {
    const value = hit.flattened[FIELD_ALERT_IDS];
    if (!value) return [] as string[];
    const arr = Array.isArray(value) ? value : [value];
    return arr as string[];
  }, [hit]);

  const replacements = useMemo(() => {
    const value = hit.flattened[FIELD_REPLACEMENTS];
    if (!value || typeof value === 'string' || Array.isArray(value)) {
      return EMPTY_REPLACEMENTS;
    }
    return value as Record<string, string>;
  }, [hit]);

  return useMemo(
    () => [...new Set(getOriginalAlertIds({ alertIds, replacements }))],
    [alertIds, replacements]
  );
};
