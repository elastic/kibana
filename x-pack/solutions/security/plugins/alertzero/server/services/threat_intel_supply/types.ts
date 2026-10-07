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

export class ThreatIntelSupplyNotInstalledError extends Error {
  public readonly code = 'supply_not_installed' as const;

  constructor(workflowId: string) {
    super(`Threat intel supply workflow "${workflowId}" is not installed`);
    this.name = 'ThreatIntelSupplyNotInstalledError';
  }
}

export class ThreatIntelSupplyHardGateError extends Error {
  public readonly code = 'hunt_supply_prerequisites_unmet' as const;
  public readonly reasonCodes: string[];

  constructor(reasonCodes: string[]) {
    super(
      `Hunt Watch supply prerequisites unmet: ${
        reasonCodes.length > 0 ? reasonCodes.join(', ') : 'unknown'
      }`
    );
    this.name = 'ThreatIntelSupplyHardGateError';
    this.reasonCodes = reasonCodes;
  }
}

export class ThreatIntelSupplyHuntDisabledError extends Error {
  public readonly code = 'hunt_not_enabled' as const;

  constructor() {
    super('Threat intel supply Restore requires Continuous Threat Hunt to be enabled');
    this.name = 'ThreatIntelSupplyHuntDisabledError';
  }
}
