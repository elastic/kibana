/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  LifecycleDetection,
  SignificantEvent,
  SignalEntry,
} from '@kbn/significant-events-schema';

const sourcesAlign = (
  detectionSourceId: string | undefined,
  signalSourceId: string | undefined
): boolean => {
  if (detectionSourceId == null && signalSourceId == null) {
    return true;
  }
  if (detectionSourceId == null || signalSourceId == null) {
    return false;
  }
  return detectionSourceId === signalSourceId;
};

const signalMatchesDetection = (signal: SignalEntry, detection: LifecycleDetection): boolean => {
  if (signal.type !== 'detection') {
    return false;
  }

  const { metadata } = signal;

  if (metadata.detection_id != null && detection.detection_id != null) {
    return (
      metadata.detection_id === detection.detection_id &&
      sourcesAlign(detection.source_id, signal.source_id)
    );
  }

  if (metadata.detection_id != null || detection.detection_id != null) {
    return false;
  }

  if (
    detection.rule_uuid != null &&
    metadata.rule_uuid === detection.rule_uuid &&
    sourcesAlign(detection.source_id, signal.source_id)
  ) {
    return true;
  }

  if (
    detection.rule_name != null &&
    metadata.rule_name === detection.rule_name &&
    sourcesAlign(detection.source_id, signal.source_id)
  ) {
    return true;
  }

  return false;
};

export const findDetectionSignal = (
  detection: LifecycleDetection,
  events: ReadonlyArray<Pick<SignificantEvent, 'signals'>> | undefined
): SignalEntry | undefined => {
  for (let index = (events?.length ?? 0) - 1; index >= 0; index--) {
    const event = events?.[index];
    if (!event) {
      continue;
    }
    for (const signal of event.signals ?? []) {
      if (signal.type !== 'detection') {
        continue;
      }
      if (signalMatchesDetection(signal, detection)) {
        return signal;
      }
    }
  }

  return undefined;
};
