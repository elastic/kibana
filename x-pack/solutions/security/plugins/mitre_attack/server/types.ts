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
  getMitreDataClient?: () => MitreAttackDataClient;
}

/**
 * Request handler context for the mitreAttack plugin.
 *
 * Shape differs from the start contract: the start contract encodes "flag off" as method absence
 * and always returns a client when present, since it is only built once start() has created one.
 * The request context always has the method because routes are registered in setup(), but it may
 * return undefined for a request arriving in the setup-to-start window.
 */
export interface MitreAttackApiRequestHandlerContext {
  getMitreDataClient: () => MitreAttackDataClient | undefined;
}

export type MitreAttackRequestHandlerContext = CustomRequestHandlerContext<{
  mitreAttack: MitreAttackApiRequestHandlerContext;
}>;
