/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
