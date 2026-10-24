/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import type { MitreListParams } from '@kbn/security-mitre-attack-common';
import { MitreDataUnavailableError } from '@kbn/security-mitre-attack-common';
import type { MitreAttackDataClient } from './mitre_attack_data_client_interface';
import type { MitreAttackDataService } from '../mitre_attack_data_service';
import { getById } from './methods/get_by_id';
import { list } from './methods/list';

interface MitreAttackDataClientDeps {
  savedObjectsRepository: ISavedObjectsRepository;
  logger: Logger;
  dataService: Pick<
    MitreAttackDataService,
    'ensureInitialized' | 'reportEmptyWhileReady' | 'getStatus'
  >;
}

/** Every bundled framework has tactics, techniques and subtechniques; only a pinned version may legitimately match nothing. */
const expectsData = (params?: MitreListParams): boolean => !params?.frameworkVersion;

export const createMitreAttackDataClient = ({
  savedObjectsRepository,
  logger,
  dataService,
}: MitreAttackDataClientDeps): MitreAttackDataClient => ({
  getStatus: () => dataService.getStatus(),

  getById: async (id: string, opts?: Pick<MitreListParams, 'framework' | 'frameworkVersion'>) => {
    if (!(await dataService.ensureInitialized())) {
      throw new MitreDataUnavailableError('population_failed');
    }
    return getById({ savedObjectsRepository, logger, id, opts });
  },

  list: async (params?: MitreListParams) => {
    if (!(await dataService.ensureInitialized())) {
      throw new MitreDataUnavailableError('population_failed');
    }
    const collection = await list({ savedObjectsRepository, logger, params });
    const isEmpty =
      collection.tactics.length === 0 &&
      collection.techniques.length === 0 &&
      collection.subtechniques.length === 0;
    if (isEmpty && expectsData(params)) {
      dataService.reportEmptyWhileReady();
      throw new MitreDataUnavailableError('population_failed');
    }
    return collection;
  },
});
