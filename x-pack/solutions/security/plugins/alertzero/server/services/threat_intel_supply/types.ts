/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ThreatIntelSupplyScope = 'deployment' | 'space';

export type ThreatIntelSupplyWorkflowKey = 'ingest' | 'enrich' | 'attribute';

export interface ThreatIntelSupplyWorkflowStatus {
  key: ThreatIntelSupplyWorkflowKey;
  workflowId: string;
  enabled: boolean;
  installed: boolean;
  scope: ThreatIntelSupplyScope;
  /** True when this space's Hunt is off but globals stay on for other spaces. */
  inUseElsewhere?: boolean;
}

export interface ThreatIntelSupplyHardGate {
  ok: boolean;
  reasonCodes: string[];
}

export interface ThreatIntelSupplyStatus {
  workflows: ThreatIntelSupplyWorkflowStatus[];
  hardGate: ThreatIntelSupplyHardGate;
  /**
   * True when Continuous Threat Hunt is enabled in this space but a required
   * TI workflow is missing or disabled.
   */
  drift: boolean;
  huntEnabled: boolean;
}
