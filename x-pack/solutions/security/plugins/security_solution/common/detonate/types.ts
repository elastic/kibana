/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProtectionEventCode } from './constants';

/**
 * Severities carried by detection rules. Endpoint protection alerts have no rule severity, which
 * is why a detonation can produce alerts and still have no severity to show.
 */
export type DetonationSeverity = 'low' | 'medium' | 'high' | 'critical';

export const DETONATION_SEVERITY_ORDER: readonly DetonationSeverity[] = [
  'low',
  'medium',
  'high',
  'critical',
];

/** One row of the detonations table, derived from a single `tasks` document. */
export interface DetonationSummary {
  taskId: string;
  timestamp: string | null;
  sampleHash: string | null;
  sampleExtension: string | null;
  platform: string;
  osFamily: string | null;
  architecture: string | null;
  agentId: string | null;
  agentVersion: string | null;
  endpointAlertsCount: number;
  detectionAlertsCount: number;
  /** Malware families named by signature hits; empty when only behavior protections fired. */
  families: string[];
  /** Threat classes such as `Trojan` or `Infostealer`, from the same signature hits. */
  categories: string[];
  protections: ProtectionEventCode[];
  /** Highest detection-rule severity, or `null` when only endpoint protections fired. */
  highestSeverity: DetonationSeverity | null;
  source: string | null;
  tags: string[];
}

/** A single bar of the top-families chart. */
export interface MalwareFamilyCount {
  family: string;
  category: string;
  count: number;
}

/**
 * One bar of a breakdown chart. `key` is the raw value the bar filters on, so it stays stable
 * while the displayed label is localised.
 */
export interface BreakdownCount {
  key: string;
  count: number;
}

/**
 * Aggregate figures shown in the page header.
 *
 * Every figure is a total rather than a share of the detonations. A count of detonations that
 * produced alerts would read as a detection rate, and the shortfall is mostly samples that failed
 * to execute in the VM rather than protections that missed.
 */
export interface DetonationKpis {
  totalDetonations: number;
  namedFamilies: number;
  endpointAlerts: number;
  detectionAlerts: number;
}

/** Structured output requested from the LLM for a single detonation. */
export interface DetonationAiSummary {
  summary: string;
  iocs: Array<{ type: string; value: string }>;
  recommendedActions: string[];
}
