/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MitreEntity,
  MitreEntityCollection,
  MitreListParams,
} from '@kbn/security-mitre-attack-common';
import type { MitreDataStatus } from '../mitre_attack_data_service';

/** Read-only interface for querying indexed MITRE ATT&CK data. */
export interface MitreAttackDataClient {
  /**
   * Returns the entity matching the given MITRE ID. Defaults to latest version and
   * `enterprise` framework. Returns `undefined` when not found.
   * Throws `MitreDataUnavailableError` when managed data population has failed.
   */
  getById(
    id: string,
    opts?: Pick<MitreListParams, 'framework' | 'frameworkVersion'>
  ): Promise<MitreEntity | undefined>;

  /**
   * Fetches all matching entities. Defaults to latest version and `enterprise` framework.
   * Throws `MitreDataUnavailableError` when managed data population has failed.
   */
  list(params?: MitreListParams): Promise<MitreEntityCollection>;

  /** Returns the current initialization/population status of the managed MITRE data. */
  getStatus(): MitreDataStatus;
}
