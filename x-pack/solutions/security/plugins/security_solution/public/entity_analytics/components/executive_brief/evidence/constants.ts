/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EaCapability } from '../../../../../common/entity_analytics/executive_brief/evidence';

/** Display order of the "how it was found" chips. */
export const CAPABILITY_ORDER: readonly EaCapability[] = [
  'attack_discovery',
  'detections',
  'risk_scoring',
  'asset_criticality',
  'watchlists',
  'relationships',
  'entity_resolution',
  'hunting_leads',
  'cases',
];

export const CAPABILITY_LABEL: Record<EaCapability, string> = {
  attack_discovery: 'Attack Discovery',
  detections: 'Detections',
  risk_scoring: 'Risk scoring',
  asset_criticality: 'Asset criticality',
  watchlists: 'Watchlists',
  relationships: 'Relationships',
  entity_resolution: 'Entity resolution',
  hunting_leads: 'Hunting leads',
  cases: 'Cases',
};

export const CAPABILITY_ICON: Record<EaCapability, string> = {
  attack_discovery: 'bolt',
  detections: 'securitySignalDetected',
  risk_scoring: 'sortUp',
  asset_criticality: 'bullseye',
  watchlists: 'eye',
  relationships: 'link',
  entity_resolution: 'merge',
  hunting_leads: 'bulb',
  cases: 'casesApp',
};
