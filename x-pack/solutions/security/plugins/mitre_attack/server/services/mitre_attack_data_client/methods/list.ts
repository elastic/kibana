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
  MITRE_ATTACK_ENTITY_SO_TYPE,
} from '@kbn/security-mitre-attack-common';
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

  // Fetch all entities in a single page. A single framework version is well under 1000 entities
  // (873 for ATT&CK enterprise 19.2, ~213 for ATLAS 2026.8), and the filter below scopes the query
  // to one framework and version. 10,000 is a generous ceiling for future versions and frameworks.
  // Silent truncation would under-report entities, so a warning is logged below if it ever happens.
  const findResponse = await savedObjectsRepository.find<MitreEntity>({
    type: MITRE_ATTACK_ENTITY_SO_TYPE,
    namespaces: ['*'],
    perPage: 10000,
    sortField: 'name',
    sortOrder: 'asc',
    filter: buildKqlFilter({ framework, frameworkVersion, types, status }),
  });

  if (findResponse.total > findResponse.saved_objects.length) {
    logger.warn(
      `MITRE list for framework "${framework}" version "${frameworkVersion}" was truncated: received ${findResponse.saved_objects.length} of ${findResponse.total} entities. Paging is needed to return all entities.`
    );
  }

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

  // Tactic order follows matrix-position definition, techniques and subtechniques stay sorted by name as
  // they are also defined that way within MITRE
  tactics.sort((a, b) => a.position - b.position);

  return { framework, frameworkVersion, tactics, techniques, subtechniques };
};
