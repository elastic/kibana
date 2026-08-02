/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BlastRadiusEntry, Feature } from '@kbn/significant-events-schema';

export const getFeatureDisplayName = (feature: Feature): string => {
  const propertyName = feature.properties?.name;
  if (typeof propertyName === 'string' && propertyName.length > 0) {
    return propertyName;
  }
  return feature.title ?? feature.id;
};

export const getBlastRadiusEntryChipName = (entry: BlastRadiusEntry): string => {
  switch (entry.type) {
    case 'dependency':
      return entry.target;
    case 'infrastructure':
      return entry.workloads?.[0] ?? entry.title ?? entry.stream_name;
    case 'entity':
      return entry.name;
  }
};

export const getBlastRadiusEntryChipKey = (entry: BlastRadiusEntry): string =>
  `${entry.type}:${entry.feature_id}:${getBlastRadiusEntryChipName(entry)}`;
