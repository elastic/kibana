/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType, EuidAttribute } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import { isEuidField, isEuidSeparator } from './commons';

/**
 * Constructs a Painless evaluation for the provided entity type to generate the entity id.
 *
 * To use in a runtime field, you can wrap the generation around a function and emit the value.
 *
 * Example usage:
 * ```ts
 * import { getEuidPainlessEvaluation } from './painless';
 *
 * const evaluation = getEuidPainlessEvaluation('host');
 * // evaluation may look like:
 * // 'if (doc.containsKey('host.name') && doc['host.name'].size() > 0 && doc['host.name'].value != null && doc['host.name'].value != "") { return "host:" + doc['host.name'].value; } return null;'
 * ```
 *
 * @param entityType - The entity type string (e.g. 'host', 'user', 'generic')
 * @returns A Painless evaluation string that computes the entity id.
 */
export function getEuidPainlessEvaluation(entityType: EntityType): string {
  const { identityField } = getEntityDefinitionWithoutId(entityType);

  if (identityField.euidFields.length === 0) {
    throw new Error('No euid fields found, invalid euid logic definition');
  }

  if (identityField.euidFields.length === 1) {
    const first = identityField.euidFields[0][0];
    if (isEuidSeparator(first)) {
      throw new Error('Separator found in single field, invalid euid logic definition');
    }
    const field = first.field;
    const condition = painlessFieldNonEmpty(field);
    const valueExpr = `doc['${escapePainlessField(field)}'].value`;
    return `if (${condition}) { return "${entityType}:" + ${valueExpr}; } return null;`;
  }

  const prefix = `"${entityType}:"`;
  const clauses = identityField.euidFields.map((composedField) => {
    const condition = buildPainlessCondition(composedField);
    const valueExpr = buildPainlessValueExpr(composedField);
    return `if (${condition}) { return ${prefix} + ${valueExpr}; }`;
  });

  return clauses.join(' ') + ' return null;';
}

function painlessFieldNonEmpty(field: string): string {
  const escaped = escapePainlessField(field);
  return `doc.containsKey('${escaped}') && doc['${escaped}'].size() > 0 && doc['${escaped}'].value != null && doc['${escaped}'].value != ""`;
}

function buildPainlessCondition(composedField: EuidAttribute[]): string {
  const fieldAttrs = composedField.filter((attr) => isEuidField(attr));
  return fieldAttrs.map((a) => painlessFieldNonEmpty(a.field)).join(' && ');
}

function buildPainlessValueExpr(composedField: EuidAttribute[]): string {
  if (composedField.length === 1 && isEuidField(composedField[0])) {
    return `doc['${escapePainlessField(composedField[0].field)}'].value`;
  }
  const parts = composedField.map((attr) => {
    if (isEuidField(attr)) {
      return `doc['${escapePainlessField(attr.field)}'].value`;
    }
    return `"${escapePainlessString(attr.separator)}"`;
  });
  return parts.join(' + ');
}

function escapePainlessField(field: string): string {
  return field.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function escapePainlessString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
