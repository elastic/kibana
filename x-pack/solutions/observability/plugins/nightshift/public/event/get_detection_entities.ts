/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BlastRadiusEntry,
  Feature,
  LifecycleDetection,
  SignalEntry,
  SignificantEvent,
} from '@kbn/significant-events-schema';
import { getBlastRadiusEntryChipName, getFeatureDisplayName } from '../common/blast_radius_display';

export interface DetectionEntityRef {
  key: string;
  label: string;
  streamName: string;
  feature?: Feature;
  isStreamFallback?: boolean;
}

const featureMatchesCausal = (feature: Feature, featureId: string): boolean =>
  feature.uuid === featureId || feature.id === featureId;

const findFeatureForEntry = (features: Feature[], featureId: string): Feature | undefined =>
  features.find((candidate) => featureMatchesCausal(candidate, featureId));

const resolveBlastRadiusEntityLabel = (
  entry: BlastRadiusEntry,
  feature: Feature | undefined
): string => {
  if (feature) {
    return getFeatureDisplayName(feature);
  }
  return getBlastRadiusEntryChipName(entry);
};

const pushBlastRadiusEntities = (
  event: SignificantEvent,
  features: Feature[],
  pushEntity: (entity: DetectionEntityRef) => void
): void => {
  for (const entry of event.blast_radius ?? []) {
    const feature = findFeatureForEntry(features, entry.feature_id);
    const streamName = feature?.stream_name ?? entry.stream_name;

    pushEntity({
      key: `${entry.type}:${entry.feature_id}`,
      label: resolveBlastRadiusEntityLabel(entry, feature),
      streamName,
      feature,
    });
  }
};

export const toStreamFallbackFeature = (
  streamName: string,
  label: string = streamName
): Feature => ({
  uuid: streamName,
  id: label,
  stream_name: streamName,
  type: 'entity',
  description: '',
  properties: {},
  confidence: 0,
  title: label,
});

export const getDetectionEntities = (
  event: SignificantEvent,
  detection: LifecycleDetection,
  features: Feature[]
): DetectionEntityRef[] => {
  const streamName = detection.stream_name;
  if (!streamName) {
    return [];
  }

  const streamFeatures = features.filter((feature) => feature.stream_name === streamName);
  const entities: DetectionEntityRef[] = [];
  const seen = new Set<string>();

  const pushEntity = (entity: DetectionEntityRef) => {
    if (seen.has(entity.key)) {
      return;
    }
    seen.add(entity.key);
    entities.push(entity);
  };

  for (const causal of event.causal_features ?? []) {
    if (causal.stream_name && causal.stream_name !== streamName) {
      continue;
    }

    const feature = streamFeatures.find((candidate) =>
      featureMatchesCausal(candidate, causal.feature_id)
    );

    if (feature) {
      pushEntity({
        key: feature.uuid,
        label: getFeatureDisplayName(feature),
        streamName: feature.stream_name,
        feature,
      });
      continue;
    }

    if (causal.name) {
      pushEntity({
        key: causal.feature_id,
        label: causal.name,
        streamName: causal.stream_name ?? streamName,
      });
    }
  }

  if (entities.length > 0) {
    return entities;
  }

  pushBlastRadiusEntities(event, features, pushEntity);

  if (entities.length > 0) {
    return entities;
  }

  pushEntity({
    key: streamName,
    label: streamName,
    streamName,
    isStreamFallback: true,
  });

  return entities;
};

export const resolveEntityFeature = (entity: DetectionEntityRef): Feature =>
  entity.feature ?? toStreamFallbackFeature(entity.streamName, entity.label);

export const enrichEntityFeature = (
  entity: DetectionEntityRef,
  feature: Feature,
  signal?: SignalEntry
): Feature => {
  if (entity.feature) {
    return feature;
  }

  const evidence = [
    `stream_name = ${feature.stream_name}`,
    ...(signal?.evidence?.esql_query ? [signal.evidence.esql_query] : []),
  ];

  return {
    ...feature,
    description: signal?.description ?? feature.description,
    evidence,
  };
};
