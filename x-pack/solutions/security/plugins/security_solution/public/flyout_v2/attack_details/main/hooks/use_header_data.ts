/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { getOriginalAlertIds } from '@kbn/elastic-assistant-common';

const EMPTY_REPLACEMENTS: Record<string, string> = {};
const EMPTY_ASSIGNEES: string[] = [];

/**
 * Centralized hook for Attack header data only.
 *
 * Reads typed fields directly off the resolved `AttackDiscoveryAlert` so
 * consumers no longer need to know how to dereference `hit.flattened` /
 * `hit.raw`.
 */
export const useHeaderData = (attack: AttackDiscoveryAlert) => {
  const title = attack.title;
  const timestamp = attack.timestamp;
  const alertIds = attack.alertIds;

  // Remove duplicated alert IDs for the update status action
  const nonDuplicatedAlertIds = useMemo(() => [...new Set(alertIds)], [alertIds]);

  const replacements = attack.replacements ?? EMPTY_REPLACEMENTS;
  const assignees = attack.assignees ?? EMPTY_ASSIGNEES;

  const originalAlertIds = useMemo(
    () => getOriginalAlertIds({ alertIds, replacements }),
    [alertIds, replacements]
  );

  return useMemo(
    () => ({
      title,
      timestamp,
      alertIds: nonDuplicatedAlertIds,
      alertsCount: alertIds.length,
      replacements,
      assignees,
      originalAlertIds,
    }),
    [
      title,
      timestamp,
      nonDuplicatedAlertIds,
      alertIds.length,
      replacements,
      assignees,
      originalAlertIds,
    ]
  );
};
