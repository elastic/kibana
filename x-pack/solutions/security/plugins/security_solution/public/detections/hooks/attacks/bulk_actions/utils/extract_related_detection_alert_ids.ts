/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineItem } from '@kbn/timelines-plugin/common';

import { ALERT_ATTACK_DISCOVERY_ALERT_IDS } from '../constants';

/**
 * Extracts all unique related alert IDs from attacks.
 * Each attack may reference multiple alerts via the ALERT_ATTACK_DISCOVERY_ALERT_IDS field.
 *
 * @param alertItems - Array of TimelineItem representing attacks
 * @returns Array of unique alert IDs extracted from all attacks
 */
export const extractRelatedDetectionAlertIds = (alertItems: TimelineItem[]): string[] => {
  const allRelatedIds: string[] = [];

  for (const item of alertItems) {
    const fieldData = item.data.find((data) => data.field === ALERT_ATTACK_DISCOVERY_ALERT_IDS);
    if (fieldData?.value && Array.isArray(fieldData.value)) {
      allRelatedIds.push(...fieldData.value);
    }
  }

  // Return unique IDs
  return Array.from(new Set(allRelatedIds));
};
