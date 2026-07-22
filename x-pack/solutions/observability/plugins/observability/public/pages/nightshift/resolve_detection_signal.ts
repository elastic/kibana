/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Discovery, LifecycleDetection, SignalEntry } from '@kbn/significant-events-schema';

const streamsAlign = (
  detectionStream: string | undefined,
  signalStream: string | undefined
): boolean => detectionStream == null || signalStream == null || detectionStream === signalStream;

const signalMatchesDetection = (signal: SignalEntry, detection: LifecycleDetection): boolean => {
  if (signal.type !== 'detection') {
    return false;
  }

  const { metadata } = signal;
  if (
    metadata.detection_id != null &&
    detection.detection_id != null &&
    metadata.detection_id !== detection.detection_id
  ) {
    return false;
  }

  if (
    metadata.detection_id != null &&
    metadata.detection_id === detection.detection_id &&
    streamsAlign(detection.stream_name, signal.stream_name)
  ) {
    return true;
  }

  if (
    detection.rule_uuid != null &&
    metadata.rule_uuid === detection.rule_uuid &&
    streamsAlign(detection.stream_name, signal.stream_name)
  ) {
    return true;
  }

  if (
    detection.rule_name != null &&
    metadata.rule_name === detection.rule_name &&
    streamsAlign(detection.stream_name, signal.stream_name)
  ) {
    return true;
  }

  return false;
};

export const findDetectionSignal = (
  detection: LifecycleDetection,
  sources: {
    discoveries?: Discovery[];
    eventSignals?: SignalEntry[];
  }
): SignalEntry | undefined => {
  const discoverySignals =
    sources.discoveries?.flatMap((discovery) => discovery.signals ?? []) ?? [];
  const seenDetectionIds = new Set<string>();

  for (const signal of discoverySignals) {
    if (signal.type !== 'detection') {
      continue;
    }
    const detectionId = signal.metadata.detection_id;
    if (detectionId) {
      seenDetectionIds.add(detectionId);
    }
    if (signalMatchesDetection(signal, detection)) {
      return signal;
    }
  }

  for (const signal of sources.eventSignals ?? []) {
    if (signal.type !== 'detection') {
      continue;
    }
    const detectionId = signal.metadata.detection_id;
    if (detectionId && seenDetectionIds.has(detectionId)) {
      continue;
    }
    if (signalMatchesDetection(signal, detection)) {
      return signal;
    }
  }

  return undefined;
};
