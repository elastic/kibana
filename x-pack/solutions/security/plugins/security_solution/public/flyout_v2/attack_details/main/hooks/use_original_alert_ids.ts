/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getOriginalAlertIds } from '@kbn/elastic-assistant-common';
import type { DataTableRecord } from '@kbn/discover-utils';
import { normalizeToStringArray } from './use_header_data';

const FIELD_ALERT_IDS = 'kibana.alert.attack_discovery.alert_ids' as const;
const FIELD_REPLACEMENTS = 'kibana.alert.attack_discovery.replacements' as const;

const EMPTY_REPLACEMENTS: Record<string, string> = {};

/**
 * Returns all original alert IDs for the current attack from the hit fields.
 */
export const useOriginalAlertIds = (hit: DataTableRecord): string[] => {
  const alertIds = useMemo(
    () =>
      normalizeToStringArray(
        hit.flattened[FIELD_ALERT_IDS] as string | string[] | null | undefined
      ),
    [hit]
  );

  const replacements = useMemo(() => {
    const value = hit.flattened[FIELD_REPLACEMENTS];
    if (!value || typeof value === 'string' || Array.isArray(value)) {
      return EMPTY_REPLACEMENTS;
    }
    return value as Record<string, string>;
  }, [hit]);

  return useMemo(() => getOriginalAlertIds({ alertIds, replacements }), [alertIds, replacements]);
};
