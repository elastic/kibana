/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldDefinition, WiredStreamDefinition, isWiredStream } from '@kbn/streams-schema';
import { MalformedFields } from '../errors/malformed_fields';

export function validateAncestorFields({
  ancestors,
  fields,
}: {
  ancestors: WiredStreamDefinition[];
  fields: FieldDefinition;
}) {
  for (const ancestor of ancestors) {
    for (const fieldName in fields) {
      if (
        Object.hasOwn(fields, fieldName) &&
        isWiredStream(ancestor) &&
        Object.entries(ancestor.stream.ingest.wired.fields).some(
          ([ancestorFieldName, attr]) =>
            attr.type !== fields[fieldName].type && ancestorFieldName === fieldName
        )
      ) {
        throw new MalformedFields(
          `Field ${fieldName} is already defined with incompatible type in the parent stream ${ancestor.name}`
        );
      }
    }
  }
}

export function validateDescendantFields({
  descendants,
  fields,
}: {
  descendants: WiredStreamDefinition[];
  fields: FieldDefinition;
}) {
  for (const descendant of descendants) {
    for (const fieldName in fields) {
      if (
        Object.hasOwn(fields, fieldName) &&
        isWiredStream(descendant) &&
        Object.entries(descendant.stream.ingest.wired.fields).some(
          ([descendantFieldName, attr]) =>
            attr.type !== fields[fieldName].type && descendantFieldName === fieldName
        )
      ) {
        throw new MalformedFields(
          `Field ${fieldName} is already defined with incompatible type in the child stream ${descendant.name}`
        );
      }
    }
  }
}
