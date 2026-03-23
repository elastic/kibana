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
import { BadCRUDRequestError } from '../errors';

const GENERIC_TYPE = 'generic' as EntityType;

export function hashEuid(id: string): string {
  // EUID generation uses MD5. It is not a security-related feature.
  // eslint-disable-next-line @kbn/eslint/no_unsafe_hash
  return createHash('md5').update(id).digest('hex');
}

// validateUpdateDoc checks provided and generated EUIDs according to rules
// expected by updateEntity() method. updateEntity() and bulkUpdateEntity()
// methods are the only ones that consume this validator.
export function validateUpdateDocIdentification(
  doc: Entity,
  generatedId: string | undefined
): void {
  if (!doc.entity?.id && generatedId === undefined) {
    throw new BadCRUDRequestError(`Could not derive EUID from document or find it in entity.id`);
  }

  if (doc.entity?.id && generatedId !== undefined && doc.entity.id !== generatedId) {
    throw new BadCRUDRequestError(
      `Supplied ID ${doc.entity.id} does not match generated EUID ${generatedId}`
    );
  }
}

export interface ValidatedDoc {
  id: string;
  doc: Record<string, unknown>;
}

export function validateAndTransformDocForUpsert(
  entityType: EntityType,
  namespace: string,
  doc: Entity,
  generatedId: string | undefined,
  force: boolean
): ValidatedDoc {
  if (!doc.entity?.id && generatedId) {
    if (!doc.entity) {
      doc.entity = { id: generatedId };
    } else {
      doc.entity.id = generatedId;
    }
  }
  const definition = getEntityDefinition(entityType, namespace);
  if (!force) {
    const flat = getFlattenedObject(doc);
    const fieldDescriptions = getFieldDescriptions(flat, definition);
    assertOnlyNonForcedAttributesInReq(fieldDescriptions);
  }
  return { id: doc.entity!.id!, doc: transformDocForUpsert(entityType, doc) };
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

function transformDocForUpsert(type: EntityType, data: Entity): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    ...data,
    '@timestamp': new Date().toISOString(),
  };

  if (type === GENERIC_TYPE) {
    return doc;
  }

  const typeKey = type as keyof typeof doc;
  if (!doc[typeKey] || typeof doc[typeKey] !== 'object') {
    doc[typeKey] = {};
  }
  const typeDoc = doc[typeKey] as Record<string, unknown>;

  if (!typeDoc.name) {
    typeDoc.name = data.entity?.id;
  }
  typeDoc.entity = data.entity;

  // Remove entity from root
  delete doc.entity;

  return doc;
}
