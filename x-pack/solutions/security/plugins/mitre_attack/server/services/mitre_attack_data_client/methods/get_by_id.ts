/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import type { MitreEntity, MitreListParams } from '@kbn/security-mitre-attack-common';
import { DEFAULT_MITRE_FRAMEWORK } from '@kbn/security-mitre-attack-common';
import { MITRE_ATTACK_ENTITY_SO_TYPE } from '../../../saved_objects';
import { buildSoId } from '../../utils';
import { resolveLatestVersion } from '../resolve_latest_version';
import { validateMitreEntity } from '../../mitre_entity_validation';

interface GetByIdArgs {
  savedObjectsRepository: ISavedObjectsRepository;
  logger: Logger;
  id: string;
  opts?: Pick<MitreListParams, 'framework' | 'frameworkVersion'>;
}

export const getById = async ({
  savedObjectsRepository,
  logger,
  id,
  opts,
}: GetByIdArgs): Promise<MitreEntity | undefined> => {
  const framework = opts?.framework ?? DEFAULT_MITRE_FRAMEWORK;
  let frameworkVersion = opts?.frameworkVersion;

  if (frameworkVersion === undefined) {
    frameworkVersion = await resolveLatestVersion({ savedObjectsRepository, logger, framework });
    if (frameworkVersion === undefined) {
      return undefined;
    }
  }

  const soId = buildSoId({ framework, frameworkVersion, id });

  try {
    const savedObject = await savedObjectsRepository.get<MitreEntity>(
      MITRE_ATTACK_ENTITY_SO_TYPE,
      soId
    );
    return validateMitreEntity(savedObject.attributes);
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return undefined;
    }
    throw error;
  }
};
