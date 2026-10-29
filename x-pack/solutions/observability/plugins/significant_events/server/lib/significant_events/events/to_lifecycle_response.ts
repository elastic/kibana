/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CHANGE_POINT_TYPES,
  type ChangePointType,
  type Detection,
  type EventDeactivation,
  type LifecycleDetection,
  type LifecycleEvent,
  type SignificantEvent,
  type SignificantEventResponse,
} from '@kbn/significant-events-schema';

export const hasChangePointType = (hit: Detection): boolean => hit.change_point_type != null;

const parseChangePointType = (value: string | undefined): ChangePointType | undefined => {
  if (!value) {
    return undefined;
  }
  return CHANGE_POINT_TYPES.includes(value as ChangePointType)
    ? (value as ChangePointType)
    : undefined;
};

/** A stored detection as the lifecycle lists it; what the detection lacks comes from `fallback`. */
export const toLifecycleDetection = (
  hit: Detection,
  fallback: { rule_name?: string; source_id?: string } = {}
): LifecycleDetection | undefined => {
  const changePointType = parseChangePointType(hit.change_point_type);
  return changePointType
    ? {
        detection_id: hit.detection_id,
        rule_name: hit.rule_name ?? fallback.rule_name ?? hit.rule_uuid,
        rule_uuid: hit.rule_uuid,
        source_id: hit.source_id ?? fallback.source_id,
        change_point_type: changePointType,
        '@timestamp': hit['@timestamp'],
      }
    : undefined;
};

export const collectEmbeddedDetections = (
  events: SignificantEvent[]
): Array<Omit<LifecycleDetection, '@timestamp'>> => {
  const seen = new Set<string>();
  const result: Array<Omit<LifecycleDetection, '@timestamp'>> = [];

  for (const event of events) {
    for (const signal of event.signals ?? []) {
      if (signal.type !== 'detection') continue;
      const { detection_id, rule_name, change_point_type } = signal.metadata;
      const parsedChangePointType = parseChangePointType(change_point_type);
      if (!detection_id || !rule_name || !parsedChangePointType || seen.has(detection_id)) {
        continue;
      }
      seen.add(detection_id);
      result.push({
        detection_id,
        rule_name,
        source_id: signal.source_id,
        change_point_type: parsedChangePointType,
      });
    }
  }

  return result;
};

/**
 * Marks the version each operator deactivation produced. That version only copies the previous
 * note, so the operator's reason, when given, replaces it. `events` must be oldest first, as
 * `findByEventId` returns them: each version is compared with the one before it.
 */
export const toLifecycleEvents = (
  events: SignificantEventResponse[],
  deactivations: EventDeactivation[]
): LifecycleEvent[] => {
  const reasonsByEpisode = new Map(
    deactivations.map(({ episode_id: episodeId, reason }) => [episodeId, reason])
  );
  return events.map((event, index) => {
    const { episode_id: episodeId } = event;
    const becameInactive =
      index > 0 && events[index - 1].status !== 'inactive' && event.status === 'inactive';
    const reason = becameInactive && episodeId ? reasonsByEpisode.get(episodeId) : undefined;
    if (reason === undefined) return event;
    return { ...event, deactivated: true, ...(reason ? { assessment_note: reason } : {}) };
  });
};
