/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * The live events a rule is in, shaped for the decision: the series a detection is joining, and the
 * series that a newer verdict supersedes. Pure; the reads are `RuleEventsClient`'s.
 */

import type { LiveRuleMembership } from '../lib/significant_events/events/rule_events_client';
import { trustedTime } from './classify_decide_row';

/**
 * The live series that a detection is joining: it arrives for a source the series covers while its
 * rule is in no live series. A member of any live series is judged by its own series instead, so
 * two members of different series on one source do not withdraw each other's skip.
 */
export const findJoinedSeries = ({
  detections,
  memberships,
}: {
  detections: ReadonlyArray<{ ruleUuid: string; sourceId: string | undefined }>;
  memberships: ReadonlyMap<string, readonly LiveRuleMembership[]>;
}): Set<string> => {
  const joined = new Set<string>();
  const allSeries = [...memberships.values()].flat();
  for (const { ruleUuid, sourceId } of detections) {
    if (sourceId === undefined) continue;
    if ((memberships.get(ruleUuid) ?? []).length > 0) continue;
    for (const { eventId, sourceIds } of allSeries) {
      if (eventId !== undefined && sourceIds.includes(sourceId)) {
        joined.add(eventId);
      }
    }
  }
  return joined;
};

/**
 * A rule the agent has since judged in a newer live series is not still waiting on the older one:
 * its newest verdict supersedes the rest. Only a verdict time that can be trusted (readable, not in
 * the future) supersedes or is superseded, so any doubt keeps every series and the agent decides.
 */
export const dropSupersededMemberships = ({
  memberships,
  now,
}: {
  memberships: readonly LiveRuleMembership[];
  now: number;
}): LiveRuleMembership[] => {
  const newest = Math.max(
    ...memberships.map(({ verifiedAt }) => trustedTime(verifiedAt, now) ?? -Infinity)
  );
  return memberships.filter(({ verifiedAt }) => {
    const time = trustedTime(verifiedAt, now);
    return time === undefined || time >= newest;
  });
};
