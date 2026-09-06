/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomRequestHandlerContext } from '@kbn/core/server';
import type { MitreAttackDataClient } from './services/mitre_attack_data_client/mitre_attack_data_client_interface';

export type MitreAttackServerSetup = Record<string, never>;

export interface MitreAttackServerStart {
  /**
   * Returns the data client for querying indexed MITRE ATT&CK entities.
   * Present only when `xpack.mitreAttack.managedSourceEnabled` is true.
   */
  getMitreDataClient?: () => MitreAttackDataClient | undefined;
}

/**
 * Request handler context for the mitreAttack plugin.
 *
 * Shape differs from the start contract: the start contract encodes "flag off" as method absence
 * (getMitreDataClient is optional); the request context always has the method because routes are
 * only registered when the flag is on, but the method may return undefined during the
 * setup-to-start window before the data client is ready.
 */
export interface MitreAttackApiRequestHandlerContext {
  getMitreDataClient: () => MitreAttackDataClient | undefined;
}

export type MitreAttackRequestHandlerContext = CustomRequestHandlerContext<{
  mitreAttack: MitreAttackApiRequestHandlerContext;
}>;
