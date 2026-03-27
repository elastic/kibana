/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { getFlattenedObject } from '@kbn/std';
import { ENTITY_ID_FIELD } from '../../../common/domain/definitions/common_fields';
import { getEuidSourceFields } from '../../../common/domain/euid';
import type { Entity } from '../../../common/domain/definitions/entity.gen';
import { getEntityDefinition } from '../../../common/domain/definitions/registry';
import type { EntityType } from '../../../common';
import type {
  EntityField,
  ManagedEntityDefinition,
} from '../../../common/domain/definitions/entity_schema';
import { HASH_ALG } from '../constants';
import { BadCRUDRequestError } from '../errors';

type CrudOperation = 'create' | 'update';

export function hashEuid(id: string): string {
  return createHash(HASH_ALG).update(id).digest('hex');
}

// validateDocIdentification checks provided and generated EUIDs. It
// picks validId, preferring generated over supplied ID.
export function validateDocIdentification(doc: Entity, generatedId: string | undefined): string {
  if (!doc.entity?.id && generatedId === undefined) {
    throw new BadCRUDRequestError(`Could not derive EUID from document or find it in entity.id`);
  }

  if (doc.entity?.id && generatedId !== undefined && doc.entity.id !== generatedId) {
    throw new BadCRUDRequestError(
      `Supplied ID ${doc.entity.id} does not match generated EUID ${generatedId}`
    );
  }
  return generatedId || doc.entity!.id!;
}

export interface ValidatedDoc {
  id: string;
  doc: Record<string, unknown>;
}

export function validateAndTransformDoc(
  operation: CrudOperation,
  entityType: EntityType,
  namespace: string,
  doc: Entity,
  generatedId: string | undefined,
  force: boolean
): ValidatedDoc {
  const id = validateDocIdentification(doc, generatedId);

  if (!doc.entity) {
    doc.entity = { id };
  } else {
    doc.entity.id = id;
  }

  if (!force) {
    const definition = getEntityDefinition(entityType, namespace);
    const flat = getFlattenedObject(doc);
    const fieldDescriptions = getFieldDescriptions(flat, definition);
    assertOnlyNonForcedAttributesInReq(fieldDescriptions);
  }

  if (operation === 'create' && !doc.entity.name) {
    doc.entity.name = id;
  }

  const transformedDoc: Record<string, unknown> = {
    ...doc,
    '@timestamp': new Date().toISOString(),
  };

  return { id, doc: transformedDoc };
}

function getFieldDescriptions(
  flatProps: Record<string, unknown>,
  description: ManagedEntityDefinition
): Record<string, EntityField & { value: unknown }> {
  const allFieldDescriptions = description.fields.reduce((obj, field) => {
    obj[field.destination || field.source] = field;
    return obj;
  }, {} as Record<string, EntityField>);

  const invalid: string[] = [];
  const descriptions: Record<string, EntityField & { value: unknown }> = {};

  const identitySourceFields = getEuidSourceFields(description.type).identitySourceFields;
  for (const [key, value] of Object.entries(flatProps)) {
    if (key === ENTITY_ID_FIELD || identitySourceFields.includes(key)) {
      continue;
    }

    if (!allFieldDescriptions[key]) {
      invalid.push(key);
    } else {
      descriptions[key] = {
        ...allFieldDescriptions[key],
        value,
      };
    }
  }

  // This will catch differences between
  // API and entity store definition
  if (invalid.length > 0) {
    const invalidString = invalid.join(', ');
    throw new BadCRUDRequestError(
      `The following attributes are not allowed to be updated: [${invalidString}]`
    );
  }

  return descriptions;
}

function assertOnlyNonForcedAttributesInReq(fields: Record<string, EntityField>) {
  const notAllowedProps = [];

  for (const [name, description] of Object.entries(fields)) {
    if (!description.allowAPIUpdate) {
      notAllowedProps.push(name);
    }
  }

  if (notAllowedProps.length > 0) {
    const notAllowedPropsString = notAllowedProps.join(', ');
    throw new BadCRUDRequestError(
      `The following attributes are not allowed to be ` +
        `updated without forcing it (?force=true): ${notAllowedPropsString}`
    );
  }
}
