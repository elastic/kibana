/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreAttackDataClient } from './services/mitre_attack_data_client/mitre_attack_data_client_interface';

export type MitreAttackServerSetup = Record<string, never>;

export interface MitreAttackServerStart {
  /**
   * Returns the data client for querying indexed MITRE ATT&CK entities.
   * Present only when `xpack.mitreAttack.managedSourceEnabled` is true.
   */
  getMitreDataClient?: () => MitreAttackDataClient;
}
