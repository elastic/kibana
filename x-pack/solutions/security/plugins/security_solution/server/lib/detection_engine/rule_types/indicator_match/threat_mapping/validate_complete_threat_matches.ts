/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalsQueryMap } from './get_signals_map_from_threat_index';
import type { ThreatMapping } from '../../../../../../common/api/detection_engine/model/rule_schema';

/**
 * Validates that events have complete threat matches based on the threat mapping configuration.
 *
 * This function prevents false positive alerts that can occur when partial matches are incorrectly
 * treated as complete matches.
 *
 *
 * Example threat mapping:
 * [
 *   {
 *     entries: [
 *       { field: "user.name", value: "threat.indicator.user.name" },
 *       { field: "host.name", value: "threat.indicator.host.name" }
 *     ]
 *   },
 *   {
 *     entries: [
 *       { field: "source.ip", value: "threat.indicator.source.ip" },
 *     ]
 *   }
 * ]
 *
 * This represents:
 * (user.name matches threat.indicator.user.name AND host.name matches threat.indicator.host.name)
 * OR (source.ip matches threat.indicator.source.ip)
 *
 * VALIDATION LOGIC:
 * For each event, we check if ANY AND group is completely satisfied:
 * 1. Iterate through each AND group in the threat mapping
 * 2. For each AND group, verify that ALL required field mappings are present in the matched queries
 * 3. If ANY AND group is completely satisfied, the signal is valid
 * 4. If NO AND group is completely satisfied, the signal is invalid (filtered out)
 *
 * @param signalsQueryMap - Map of signal IDs to their matched threat queries
 * @param threatMapping - The threat mapping configuration defining AND/OR logic
 * @returns Object containing valid events and list of invalid signal IDs
 */
export const validateCompleteThreatMatches = (
  signalsQueryMap: SignalsQueryMap,
  threatMapping: ThreatMapping
): { validEvents: SignalsQueryMap; invalidIds: string[] } => {
  const validEvents: SignalsQueryMap = new Map();
  const invalidIds: string[] = [];

  signalsQueryMap.forEach((threatQueries, signalId) => {
    const hasCompleteMatch = threatMapping.some((andGroup) => {
      return andGroup.entries.every((entry) =>
        threatQueries.some(
          (threatQuery) => threatQuery.field === entry.field && threatQuery.value === entry.value
        )
      );
    });

    if (hasCompleteMatch) {
      validEvents.set(signalId, threatQueries);
    } else {
      invalidIds.push(signalId);
    }
  });

  return { validEvents, invalidIds };
};
