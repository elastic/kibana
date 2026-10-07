/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class ThreatIntelSupplyHuntDisabledError extends Error {
  public readonly code = 'hunt_not_enabled' as const;

  constructor() {
    super('Threat intel supply Restore requires Continuous Threat Hunt to be enabled');
    this.name = 'ThreatIntelSupplyHuntDisabledError';
  }
}
