/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { iocOfDetection, type SseDetection, type SseEventRef } from './derive_detections';

/** One bucket of events sharing a detection, or the "Other events" catch-all. */
export interface SseEventGroup {
  /** Absent for the "Other events" bucket. */
  detectionId?: string;
  label: string;
  events: SseEventRef[];
  total?: number;
}

/** Hunt-result fields old (pre-`detections[]`) payloads fall back to for a group's `total`. */
export interface GroupEventsHuntResult {
  tier1?: { counts?: { total_hits?: number } };
  tier2?: {
    behaviors?: ReadonlyArray<{ technique_id: string; execution?: { row_count?: number } }>;
  };
}

/** Rendered only in the browser, as the catch-all group heading, so it is translated here. */
const otherEventsLabel = (): string =>
  i18n.translate('xpack.alertzero.sseView.groups.otherEvents', { defaultMessage: 'Other events' });

const labelForDetection = (detection: SseDetection): string => {
  if (detection.kind === 'behavior') {
    const techniqueId = detection.technique_id ?? '';
    return detection.technique_name ? `${techniqueId} ${detection.technique_name}` : techniqueId;
  }
  const parsed = iocOfDetection(detection);
  return parsed ? `${parsed.type} ${parsed.value}` : detection.matched_on[0]?.value ?? '';
};

/**
 * Buckets `events[]` under the detection each one belongs to, so the UI can
 * render one event list per detection instead of one flat list.
 * Attribution prefers, in order: an explicit `matched.detection` id, an IOC
 * detection sharing the matched IOC's value, a behavior detection sharing the
 * matched technique id, else the "Other events" bucket.
 *
 * `huntResult` backstops a group's `total` for old payloads with events but no
 * `detections[]`: an IOC group falls back to `tier1.counts.total_hits`, a
 * behavior group to that technique's `execution.row_count`.
 */
export const groupEventsByDetection = (
  events: readonly SseEventRef[],
  detections: readonly SseDetection[],
  huntResult?: GroupEventsHuntResult
): SseEventGroup[] => {
  const detectionById = new Map(detections.map((detection) => [detection.id, detection]));
  const iocDetectionByValue = new Map<string, SseDetection>();
  const behaviorDetectionByTechnique = new Map<string, SseDetection>();
  for (const detection of detections) {
    if (detection.kind === 'ioc') {
      for (const matchedOn of detection.matched_on) {
        iocDetectionByValue.set(matchedOn.value, detection);
      }
    } else if (detection.technique_id) {
      behaviorDetectionByTechnique.set(detection.technique_id, detection);
    }
  }

  const groupsByKey = new Map<string, SseEventGroup>();
  const orderedGroups: SseEventGroup[] = [];
  const otherEvents: SseEventRef[] = [];

  const addToGroup = (key: string, create: () => SseEventGroup, event: SseEventRef): void => {
    const existing = groupsByKey.get(key);
    if (existing) {
      existing.events.push(event);
      return;
    }
    const group = create();
    group.events.push(event);
    groupsByKey.set(key, group);
    orderedGroups.push(group);
  };

  for (const event of events) {
    const matched = event.matched;

    const explicit = matched?.detection ? detectionById.get(matched.detection) : undefined;
    if (explicit) {
      addToGroup(
        explicit.id,
        () => ({
          detectionId: explicit.id,
          label: labelForDetection(explicit),
          events: [],
          total: explicit.total,
        }),
        event
      );
      continue;
    }

    const iocValue = matched?.ioc?.value;
    if (iocValue) {
      const detection = iocDetectionByValue.get(iocValue);
      if (detection) {
        addToGroup(
          detection.id,
          () => ({
            detectionId: detection.id,
            label: labelForDetection(detection),
            events: [],
            total: detection.total,
          }),
          event
        );
        continue;
      }
      addToGroup(
        `ioc:${iocValue}`,
        () => ({
          label: `${matched?.ioc?.type ?? 'indicator'} ${iocValue}`,
          events: [],
          total: huntResult?.tier1?.counts?.total_hits,
        }),
        event
      );
      continue;
    }

    const techniqueId = matched?.technique_id;
    if (techniqueId) {
      const detection = behaviorDetectionByTechnique.get(techniqueId);
      if (detection) {
        addToGroup(
          detection.id,
          () => ({
            detectionId: detection.id,
            label: labelForDetection(detection),
            events: [],
            total: detection.total,
          }),
          event
        );
        continue;
      }
      addToGroup(
        `behavior:${techniqueId}`,
        () => ({
          label: techniqueId,
          events: [],
          total: huntResult?.tier2?.behaviors?.find(
            (behavior) => behavior.technique_id === techniqueId
          )?.execution?.row_count,
        }),
        event
      );
      continue;
    }

    otherEvents.push(event);
  }

  if (otherEvents.length > 0) {
    orderedGroups.push({ label: otherEventsLabel(), events: otherEvents });
  }
  return orderedGroups;
};
