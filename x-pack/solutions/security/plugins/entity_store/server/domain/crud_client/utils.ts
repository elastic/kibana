/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unset } from 'lodash';
import { getFlattenedObject } from '@kbn/std';
import { ENTITY_ID_FIELD } from '../../../common/domain/definitions/common_fields';
import { BadCRUDRequestError } from '../errors';
import type { Entity } from '../../../common/domain/definitions/entity.gen';
import { getEntityDefinition } from '../../../common/domain/definitions/registry';
import type { EntityType } from '../../../common';
import type {
  EntityField,
  ManagedEntityDefinition,
} from '../../../common/domain/definitions/entity_schema';

export function validateAndTransformDoc(
  entityType: EntityType,
  namespace: string,
  doc: Entity,
  force: boolean
): Record<string, unknown> {
  const definition = getEntityDefinition(entityType, namespace);
  if (!force) {
    const flat = getFlattenedObject(doc);
    const fieldDescriptions = getFieldDescriptions(flat, definition);
    assertOnlyNonForcedAttributesInReq(fieldDescriptions);
  }
  return transformDocForUpsert(entityType, doc);
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

  for (const [key, value] of Object.entries(flatProps)) {
    if (key === ENTITY_ID_FIELD || description.identityField.requiresOneOfFields.includes(key)) {
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

function transformDocForUpsert(type: EntityType, data: Partial<Entity>): Record<string, unknown> {
  const now = new Date().toISOString();
  if (type === 'generic') {
    return {
      '@timestamp': now,
      ...data,
    };
  }

  // Get host, user, service field
  const typeData = (data[type as keyof typeof data] || {}) as Record<string, unknown>;

  // Force name to be picked by the store
  typeData.name = data.entity?.id;
  // Nest entity under type data
  typeData.entity = data.entity;

  const doc: Record<string, unknown> = {
    '@timestamp': now,
    ...data,
  };

  // Remove entity from root
  delete doc.entity;

  // override the host, user service
  // field with the built value
  doc[type as keyof typeof doc] = typeData;

  return doc;
}

export function removeEUIDFields(
  definition: ManagedEntityDefinition,
  doc: Record<string, unknown>
) {
  for (const euidField of definition.identityField.requiresOneOfFields) {
    unset(doc, euidField);
  }
}
