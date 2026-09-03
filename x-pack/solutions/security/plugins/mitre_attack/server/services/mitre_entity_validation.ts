/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyZodError } from '@kbn/zod-helpers/v4';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import { mitreEntitySchema } from '@kbn/security-mitre-attack-common';
import type { MitreEntity } from '@kbn/security-mitre-attack-common';

/** Validates an array of unknown objects as MitreEntity values; throws BadRequestError on the first failure. */
export const validateMitreEntities = (entities: unknown[]): MitreEntity[] =>
  entities.map(validateMitreEntity);

/** Validates an unknown object as a MitreEntity; throws BadRequestError if validation fails. */
export const validateMitreEntity = (entity: unknown): MitreEntity => {
  const result = mitreEntitySchema.safeParse(entity);

  if (!result.success) {
    const asRecord =
      entity != null && typeof entity === 'object' ? (entity as Record<string, unknown>) : {};
    const entityName = typeof asRecord.name === 'string' ? asRecord.name : '(unknown name)';
    const entityId = typeof asRecord.id === 'string' ? asRecord.id : '(unknown id)';
    throw new BadRequestError(
      `name: "${entityName}", id: "${entityId}" within the mitre-attack-entity saved object ` +
        `is not a valid MITRE ATT&CK entity. Expect the system ` +
        `to not work with MITRE ATT&CK data until this entity is fixed ` +
        `or the document is removed. Error is: ${stringifyZodError(result.error)}, ` +
        `Full entity contents are:\n${JSON.stringify(entity, null, 2)}`
    );
  }

  return result.data;
};
