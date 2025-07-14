/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalIdToMatchedQueriesMap } from './get_signals_map_from_threat_index';
import type { ThreatMapping } from '../../../../../../common/api/detection_engine/model/rule_schema';
import type { ThreatMatchNamedQuery } from './types';

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
 * Example of SignalIdToMatchedQueriesMap:
 * {
 *   "eventId1": [
 *     { field: "user.name", value: "threat.indicator.user.name", queryType: "mq", id: "threatId1", index: "threatIndex1" },
 *     { field: "host.name", value: "threat.indicator.host.name", queryType: "mq", id: "threatId2", index: "threatIndex2" }
 *   ],
 *   "eventId2": [
 *     { field: "source.ip", value: "threat.indicator.source.ip", queryType: "mq", id: "threatId1", index: "threatIndex1" }
 *   ]
 * }
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
 * @param signalIdToMatchedQueriesMap - Map of signal IDs to their matched threat queries
 * @param threatMapping - The threat mapping configuration defining AND/OR logic
 * @returns Object containing valid events and list of invalid signal IDs
 */
export const validateCompleteThreatMatches = (
  signalIdToMatchedQueriesMap: SignalIdToMatchedQueriesMap,
  threatMapping: ThreatMapping
): { matchedEvents: SignalIdToMatchedQueriesMap; skippedIds: string[] } => {
  const matchedEvents: SignalIdToMatchedQueriesMap = new Map();
  const skippedIds: string[] = [];

  signalIdToMatchedQueriesMap.forEach((threatQueries, signalId) => {
    const allMatchedThreatQueriesSet = new Set<ThreatMatchNamedQuery>();
    threatMapping.forEach((andGroup) => {
      const matchedThreatQueriesForAndGroup: ThreatMatchNamedQuery[] = [];
      const hasMatchForAndGroup = andGroup.entries.every((entry) => {
        const filteredThreatQueries = threatQueries.filter(
          (threatQuery) => threatQuery.field === entry.field && threatQuery.value === entry.value
        );

        if (filteredThreatQueries.length > 0) {
          matchedThreatQueriesForAndGroup.push(...filteredThreatQueries);
          return true;
        }

        return false;
      });

      if (hasMatchForAndGroup) {
        matchedThreatQueriesForAndGroup.forEach((threatQuery) =>
          allMatchedThreatQueriesSet.add(threatQuery)
        );
      }

      return hasMatchForAndGroup;
    });

    if (allMatchedThreatQueriesSet.size > 0) {
      matchedEvents.set(signalId, Array.from(allMatchedThreatQueriesSet));
    } else {
      skippedIds.push(signalId);
    }
  });

  return { matchedEvents, skippedIds };
};
