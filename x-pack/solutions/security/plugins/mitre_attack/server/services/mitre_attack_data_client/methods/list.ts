/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import type {
  MitreEntity,
  MitreTactic,
  MitreTechnique,
  MitreSubtechnique,
  MitreEntityCollection,
  MitreListParams,
} from '@kbn/security-mitre-attack-common';
import {
  DEFAULT_MITRE_FRAMEWORK,
  DEFAULT_MITRE_ENTITY_STATUS,
} from '@kbn/security-mitre-attack-common';
import { MITRE_ATTACK_ENTITY_SO_TYPE } from '../../../saved_objects';
import { buildKqlFilter, getEmptyMitreEntityCollection } from '../../utils';
import { resolveLatestVersion } from '../resolve_latest_version';
import { validateMitreEntity } from '../../mitre_entity_validation';

interface ListArgs {
  savedObjectsRepository: ISavedObjectsRepository;
  logger: Logger;
  params?: MitreListParams;
}

export const list = async ({
  savedObjectsRepository,
  logger,
  params,
}: ListArgs): Promise<MitreEntityCollection> => {
  const framework = params?.framework ?? DEFAULT_MITRE_FRAMEWORK;
  const status = params?.status ?? DEFAULT_MITRE_ENTITY_STATUS;
  const types = params?.types;

  let frameworkVersion = params?.frameworkVersion;
  if (frameworkVersion === undefined) {
    frameworkVersion = await resolveLatestVersion({ savedObjectsRepository, logger, framework });
    if (frameworkVersion === undefined) {
      return getEmptyMitreEntityCollection(framework);
    }
  }

  // Fetch all entities in a single page. Each MITRE enterprise dataset has less than 1000 entities
  // (873 for ATT&CK enterprise 19.1). 10,000 is a generous ceiling for future versions and frameworks.
  const findResponse = await savedObjectsRepository.find<MitreEntity>({
    type: MITRE_ATTACK_ENTITY_SO_TYPE,
    namespaces: ['*'],
    perPage: 10000,
    sortField: 'id',
    sortOrder: 'asc',
    filter: buildKqlFilter({ framework, frameworkVersion, types, status }),
  });

  const tactics: MitreTactic[] = [];
  const techniques: MitreTechnique[] = [];
  const subtechniques: MitreSubtechnique[] = [];

  for (const so of findResponse.saved_objects) {
    const entity = validateMitreEntity(so.attributes);
    switch (entity.type) {
      case 'tactic':
        tactics.push(entity);
        break;
      case 'technique':
        techniques.push(entity);
        break;
      case 'subtechnique':
        subtechniques.push(entity);
        break;
    }
  }

  return { framework, frameworkVersion, tactics, techniques, subtechniques };
};
