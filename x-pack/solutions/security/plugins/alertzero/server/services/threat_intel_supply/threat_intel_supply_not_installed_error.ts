/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class ThreatIntelSupplyNotInstalledError extends Error {
  public readonly code = 'supply_not_installed' as const;

  constructor(workflowId: string) {
    super(`Threat intel supply workflow "${workflowId}" is not installed`);
    this.name = 'ThreatIntelSupplyNotInstalledError';
  }
}
