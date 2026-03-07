/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EntityType,
  EuidAttribute,
  EuidConditional,
  FieldEvaluation,
} from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import { isEuidField, isEuidSeparator } from './commons';

/**
 * Returns an Elasticsearch runtime keyword field mapping whose Painless script
 * computes the typed EUID for the given entity type.
 *
 * Example usage:
 * ```ts
 * runtime_mappings: { 'user_id': getEuidPainlessRuntimeMapping('user') }
 * ```
 *
 * @param entityType - The entity type string (e.g. 'host', 'user', 'generic')
 * @returns A runtime keyword field mapping (type + script) for use in runtime_mappings.
 */
export function getEuidPainlessRuntimeMapping(entityType: EntityType): {
  type: 'keyword';
  script: { source: string };
} {
  const returnScript = getEuidPainlessEvaluation(entityType);
  const emitScript = `String euid_eval(def doc) { ${returnScript} } def result = euid_eval(doc); if (result != null) { emit(result); }`;
  return {
    type: 'keyword',
    script: { source: emitScript },
  };
}

/**
 * Constructs a Painless evaluation for the provided entity type to generate the entity id.
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

  // Map of field names to their already evaluated variable names.
  // Used to avoid re-evaluating the same field multiple times.
  const evaluatedVars = new Map<string, string>();

  // Goes through field evaluations and creates the required parsing logic for them.
  let preamble = '';
  if (identityField.fieldEvaluations?.length) {
    const result = buildFieldEvaluationsPreamble(identityField.fieldEvaluations);
    preamble = result.preamble + ' ';
    result.evaluatedVars.forEach((v, k) => evaluatedVars.set(k, v));
  }

  const fieldCondition = (field: string): string => {
    const varName = evaluatedVars.get(field);
    if (varName) return `${varName} != null`;
    return painlessFieldNonEmpty(field);
  };

  const fieldValueExpr = (field: string): string => {
    const varName = evaluatedVars.get(field);
    if (varName) return varName;
    return `doc['${escapePainlessField(field)}'].value`;
  };

  // If there is only one euid field, we can simplify the logic.
  if (identityField.euidFields.length === 1) {
    const instruction = identityField.euidFields[0];
    const comp = instruction.composition;
    const first = comp[0];
    if (isEuidSeparator(first)) {
      throw new Error('Separator found in single field, invalid euid logic definition');
    }
    const field = first.field;
    const condPart = instruction.conditional
      ? conditionalToPainlessExpression(instruction.conditional, fieldValueExpr) + ' && '
      : '';
    const condition = condPart + fieldCondition(field);
    const valueExpr = fieldValueExpr(field);
    return `${preamble}if (${condition}) { return "${entityType}:" + ${valueExpr}; } return null;`;
  }

  const prefix = `"${entityType}:"`;
  const clauses = identityField.euidFields.map((instruction) => {
    const composedField = instruction.composition;
    const compositionCond = composedField
      .filter(isEuidField)
      .map((a) => fieldCondition(a.field))
      .join(' && ');
    const condPart = instruction.conditional
      ? conditionalToPainlessExpression(instruction.conditional, fieldValueExpr) + ' && '
      : '';
    const condition = condPart + compositionCond;
    const valueExpr = buildPainlessValueExprWithEvaluated(composedField, fieldValueExpr);
    return `if (${condition}) { return ${prefix} + ${valueExpr}; }`;
  });

  return preamble + clauses.join(' ') + ' return null;';
}

function painlessFieldNonEmpty(field: string): string {
  const escaped = escapePainlessField(field);
  return `doc.containsKey('${escaped}') && doc['${escaped}'].size() > 0 && doc['${escaped}'].value != null && doc['${escaped}'].value != ""`;
}

function buildPainlessValueExprWithEvaluated(
  composedField: EuidAttribute[],
  fieldValueExpr: (field: string) => string
): string {
  if (composedField.length === 1 && isEuidField(composedField[0])) {
    return fieldValueExpr(composedField[0].field);
  }
  const parts = composedField.map((attr) => {
    if (isEuidField(attr)) {
      return fieldValueExpr(attr.field);
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

function destinationToVarName(destination: string): string {
  return destination.replace(/\./g, '_');
}

/** Painless boolean expression for the minimal conditional (field == eq). */
function conditionalToPainlessExpression(
  conditional: EuidConditional,
  // Function to get the value of a field.
  fieldValueExpr: (field: string) => string
): string {
  const val = fieldValueExpr(conditional.field);
  return `${val} == "${escapePainlessString(conditional.eq)}"`;
}

function buildFieldEvaluationsPreamble(evaluations: FieldEvaluation[]): {
  preamble: string;
  evaluatedVars: Map<string, string>;
} {
  const evaluatedVars = new Map<string, string>();
  const parts: string[] = [];
  for (const ev of evaluations) {
    const varName = destinationToVarName(ev.destination);
    evaluatedVars.set(ev.destination, varName);
    const srcEsc = escapePainlessField(ev.source);
    const sourceNotEmpty = `doc.containsKey('${srcEsc}') && doc['${srcEsc}'].size() > 0 && doc['${srcEsc}'].value != null && doc['${srcEsc}'].value != ""`;
    const stmts: string[] = [
      `String ${varName} = null;`,
      `if (${sourceNotEmpty}) {`,
      `  String _src = doc['${srcEsc}'].value`,
    ];
    let first = true;
    for (const clause of ev.whenClauses) {
      const conds = clause.sourceMatchesAny
        .map((v) => `_src == "${escapePainlessString(v)}"`)
        .join(' || ');
      const prefix = first ? '  if ' : '  else if ';
      stmts.push(`${prefix}(${conds}) { ${varName} = "${escapePainlessString(clause.then)}"; }`);
      first = false;
    }
    stmts.push(`  else { ${varName} = _src; }`);
    stmts.push('}');
    parts.push(stmts.join(' '));
  }
  const preamble = parts.join(' ');
  return { preamble, evaluatedVars };
}
