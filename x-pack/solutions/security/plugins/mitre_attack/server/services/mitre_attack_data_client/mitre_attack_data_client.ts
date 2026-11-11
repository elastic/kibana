/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import type { MitreListParams } from '@kbn/security-mitre-attack-common';
import { DEFAULT_MITRE_FRAMEWORK } from '@kbn/security-mitre-attack-common';
import type { MitreAttackDataClient } from './mitre_attack_data_client_interface';
import type { MitreAttackDataService } from '../mitre_attack_data_service';
import { getById } from './methods/get_by_id';
import { list } from './methods/list';
import { getEmptyMitreEntityCollection } from '../utils';

interface MitreAttackDataClientDeps {
  savedObjectsRepository: ISavedObjectsRepository;
  logger: Logger;
  dataService: Pick<MitreAttackDataService, 'ensureInitialized'>;
}

export const createMitreAttackDataClient = ({
  savedObjectsRepository,
  logger,
  dataService,
}: MitreAttackDataClientDeps): MitreAttackDataClient => ({
  getById: async (id: string, opts?: Pick<MitreListParams, 'framework' | 'frameworkVersion'>) => {
    if (!(await dataService.ensureInitialized())) {
      return undefined;
    }
    return getById({ savedObjectsRepository, logger, id, opts });
  },

  list: async (params?: MitreListParams) => {
    if (!(await dataService.ensureInitialized())) {
      return getEmptyMitreEntityCollection(params?.framework ?? DEFAULT_MITRE_FRAMEWORK);
    }
    return list({ savedObjectsRepository, logger, params });
  },
});
