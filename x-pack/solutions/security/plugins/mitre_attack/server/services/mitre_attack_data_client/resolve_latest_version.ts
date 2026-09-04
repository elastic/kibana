/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import type { MitreEntity, MitreFramework } from '@kbn/security-mitre-attack-common';
import { MITRE_ATTACK_ENTITY_SO_TYPE } from '../../saved_objects';
import { buildKqlFilter } from '../utils';

interface ResolveLatestVersionArgs {
  savedObjectsRepository: ISavedObjectsRepository;
  logger: Logger;
  framework: MitreFramework;
}

/**
 * Resolves the newest framework version stored in the index by sorting on the
 * `framework_version` field descending (sort order is semver-correct for that field type).
 * Returns undefined when no documents exist for the given framework.
 */
export const resolveLatestVersion = async ({
  savedObjectsRepository,
  logger,
  framework,
}: ResolveLatestVersionArgs): Promise<string | undefined> => {
  const findResponse = await savedObjectsRepository.find<MitreEntity>({
    type: MITRE_ATTACK_ENTITY_SO_TYPE,
    namespaces: ['*'],
    filter: buildKqlFilter({ framework }),
    sortField: 'framework_version',
    sortOrder: 'desc',
    perPage: 1,
  });

  const first = findResponse.saved_objects[0];
  if (first == null) {
    logger.debug(
      `resolveLatestVersion: no documents found for framework '${framework}'. index may be empty`
    );
    return undefined;
  }

  return first.attributes.framework_version;
};
