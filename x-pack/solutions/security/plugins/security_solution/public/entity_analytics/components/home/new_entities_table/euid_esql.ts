/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * TEMPORARY COPY of the entity store EUID ES|QL generator
 * (x-pack/platform/plugins/shared/entity_store/common/domain/euid/esql.ts), limited to
 * what `getFieldEvaluationsEsql` and `getEuidEsqlEvaluation` need. Function names, order
 * and unchanged code match the generator, so diffing the two files shows only the fix.
 * Every change is marked `CHANGED:`.
 *
 * Why: ES|QL evaluates CASE and COALESCE a column at a time only when every value
 * argument is a column or a literal, and CASE has a single condition (`Case#toEvaluator`,
 * `ExpressionEvaluator.Factory#eagerEvalSafeInLazy`). Otherwise it evaluates them one row
 * at a time, copying every column of the page for each row. The generated
 * `entity.namespace` expression nests CASE inside COALESCE, and cost 8s of a 10.8s
 * unstamped alert branch (152k alerts) at 1M entities.
 *
 * The fix precomputes each CASE / CONCAT argument into its own column and combines the
 * columns, so every CASE and COALESCE gets columns or literals:
 *   1. buildSourcePickerEsql: COALESCE(CASE…) arms become columns.
 *   2. buildFieldMappingEsql: the multi-condition CASE becomes one column per mapping entry.
 *   3. buildDestinationFieldEsql: CASE arms become columns, and `COALESCE(cond, FALSE)`
 *      becomes `cond` (CASE already skips a NULL condition).
 *   4. buildRankingCaseEsql: COALESCE(CONCAT…) arms become columns.
 *   5. getEuidEsqlEvaluation: the multi-branch `CASE(c0, f0, …, NULL)` becomes nested
 *      single-condition CASEs.
 * The entity ids are the same (checked per document over all alerts and anomaly records),
 * and the alert and anomaly sorts ran 2.3–2.6x faster at 1M entities.
 *
 * The grid and the needs attention tiles both read it through `queries/euid_pipeline.ts`.
 *
 * TODO: port this to the generator (it also feeds logs extraction, the entity analytics
 * maintainers and the graph route), measure those consumers, and delete this copy:
 * `euid_pipeline.ts` then imports the generator's functions instead.
 */

import type { EntityType } from '@kbn/entity-store/common';
import { entityStoreConditionToESQL as conditionToESQL } from '@kbn/entity-store/common/esql/condition_to_esql';
import { castField } from '@kbn/entity-store/common/esql/cast';
import type {
  EntityDefinitionWithoutId,
  EuidAttribute,
  FieldEvaluation,
  FieldEvaluationWhenClauseFieldMappingThen,
} from '@kbn/entity-store/common/domain/definitions/entity_schema';
import { isSingleFieldIdentity } from '@kbn/entity-store/common/domain/definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '@kbn/entity-store/common/domain/definitions/registry';
import {
  esqlIsNotNullOrEmpty,
  esqlPresentColumnName,
  esqlPresentOrNullColumnName,
} from '@kbn/entity-store/common/esql/strings';
import { isEuidField, isEuidSeparator } from '@kbn/entity-store/common/domain/euid/commons';
import { collectRankingFields } from '@kbn/entity-store/common/domain/euid/esql';

// CHANGED: helpers return the columns they precompute along with their expression.
/** EVAL columns an expression references; they must be assigned before it. */
type Precomputes = Array<{ colName: string; esql: string }>;

function sourceToEsqlExpression(source: FieldEvaluation['sources'][number]): string {
  if ('field' in source) {
    return `MV_FIRST(${castField(source.field)})`;
  }
  return `MV_FIRST(SPLIT(MV_FIRST(${castField(source.firstChunkOfField)}), "${escapeEsqlString(
    source.splitBy
  )}"))`;
}

/**
 * Returns the entity-id expression for a ranking definition, referencing
 * pre-computed `<field>_present_or_null` columns.
 *
 * Output shape: a bare column ref (single field), `CONCAT(...)` (composed field),
 * or `COALESCE(arm1, arm2, …)` (multiple ranked arms).
 */
function buildRankingCaseEsql(
  ranking: EuidAttribute[][],
  presentOrNullAliases: ReadonlyMap<string, string>,
  // CHANGED: names the arm columns.
  armColumnBase: string
): { expression: string; precomputes: Precomputes } {
  if (ranking.length === 0) {
    throw new Error('No euid fields found, invalid euid logic definition');
  }

  if (ranking.length === 1) {
    const comp = ranking[0];
    const firstAttr = comp[0];
    if (isEuidSeparator(firstAttr)) {
      throw new Error('Separator found in single field, invalid euid logic definition');
    }
    if (comp.length === 1 && isEuidField(firstAttr)) {
      // Single ranking, single field: bare _present_or_null ref (no COALESCE needed)
      return {
        expression: presentOrNullAliases.get(firstAttr.field) ?? `TO_STRING(${firstAttr.field})`,
        precomputes: [],
      };
    }
  }

  const arms = ranking.map((composedField) => {
    if (composedField.length === 1 && isEuidSeparator(composedField[0])) {
      throw new Error('Separator found in single field, invalid euid logic definition');
    }
    if (isEuidSeparator(composedField[0])) {
      throw new Error('The first field of a composed field cannot be a separator');
    }

    if (composedField.length === 1) {
      const f = composedField[0] as { field: string };
      return presentOrNullAliases.get(f.field) ?? `TO_STRING(${f.field})`;
    }

    // Composed arm: CONCAT over _present_or_null refs — NULL when any component is absent.
    const parts = composedField
      .map((attr) =>
        isEuidField(attr)
          ? presentOrNullAliases.get(attr.field) ?? `TO_STRING(${attr.field})`
          : `"${escapeEsqlString(attr.sep)}"`
      )
      .join(', ');
    return `CONCAT(${parts})`;
  });

  if (arms.length === 1) {
    return { expression: arms[0], precomputes: [] };
  }
  // CHANGED: each arm is a column, so COALESCE gets only columns.
  const precomputes = arms.map((esql, i) => ({ colName: `${armColumnBase}_arm${i}`, esql }));
  return {
    expression: `COALESCE(${precomputes.map(({ colName }) => colName).join(', ')})`,
    precomputes,
  };
}

/** Returns a COALESCE expression that picks the first non-null/non-empty source variable. */
function buildSourcePickerEsql(
  sourceVariablesBaseName: string,
  count: number
): { expression: string; precomputes: Precomputes } {
  if (count < 1) {
    throw new Error('buildSourcePickerEsql requires at least one source variable');
  }
  // CHANGED: each arm is a column, so COALESCE gets only columns.
  const precomputes = Array.from({ length: count }, (_, i) => {
    const v = `${sourceVariablesBaseName}${i}`;
    return { colName: `${v}_value`, esql: `CASE(${v} IS NOT NULL AND ${v} != "", ${v})` };
  });
  return {
    expression: `COALESCE(${precomputes.map(({ colName }) => colName).join(', ')})`,
    precomputes,
  };
}

/**
 * Builds a CASE expression that maps a field's value through an explicit lookup table.
 * Returns NULL when the field is absent or its value is not in the mapping — allowing
 * the outer COALESCE to fall through to the next whenClause arm.
 */
function buildFieldMappingEsql(
  then: FieldEvaluationWhenClauseFieldMappingThen,
  // CHANGED: names the mapping columns.
  columnBase: string
): { expression: string; precomputes: Precomputes } {
  // CHANGED: one single-condition CASE column per mapping entry, combined with COALESCE.
  const valueColumn = `${columnBase}_value`;
  const precomputes: Precomputes = [
    { colName: valueColumn, esql: `MV_FIRST(TO_STRING(${then.field}))` },
  ];
  const entryColumns = Object.entries(then.mapping).map(([from, to], i) => {
    const colName = `${columnBase}_${i}`;
    precomputes.push({
      colName,
      esql: `CASE(${valueColumn} == "${escapeEsqlString(from)}", "${escapeEsqlString(to)}")`,
    });
    return colName;
  });
  return {
    expression:
      entryColumns.length === 1 ? entryColumns[0] : `COALESCE(${entryColumns.join(', ')})`,
    precomputes,
  };
}

/**
 * Returns the destination field assignment expression and any boolean precompute columns it needs.
 *
 * Without `whenClauses`: a simple fallback/pass-through CASE.
 * With `whenClauses`: a COALESCE of mapped arms (sourceMatchesAny or condition-based),
 * a fallback arm, and a bare pass-through.
 */
function buildDestinationFieldEsql(
  effectiveSourceName: string,
  destBase: string,
  fallbackExpression: string,
  whenClauses: FieldEvaluation['whenClauses']
): { expression: string; conditionPrecomputes: Precomputes } {
  const conditionPrecomputes: Precomputes = [];

  if (whenClauses.length === 0) {
    return {
      expression: `CASE(${effectiveSourceName} IS NULL OR ${effectiveSourceName} == "", ${fallbackExpression}, ${effectiveSourceName})`,
      conditionPrecomputes,
    };
  }

  const coalesceArms: string[] = [];
  for (const [i, clause] of whenClauses.entries()) {
    let condition: string;
    if ('sourceMatchesAny' in clause) {
      const inList = clause.sourceMatchesAny.map((v) => `"${escapeEsqlString(v)}"`).join(', ');
      // CHANGED: no COALESCE(…, FALSE) wrapper; CASE skips a NULL condition.
      condition = `${effectiveSourceName} IN (${inList})`;
    } else {
      const colName = `${destBase}_arm${i}`;
      conditionPrecomputes.push({ colName, esql: `(${conditionToESQL(clause.condition)})` });
      // CHANGED: no COALESCE(…, FALSE) wrapper; CASE skips a NULL condition.
      condition = colName;
    }
    let thenExpr: string;
    if (typeof clause.then === 'string') {
      thenExpr = `"${escapeEsqlString(clause.then)}"`;
    } else {
      // CHANGED: the mapping is a column.
      const mapping = buildFieldMappingEsql(clause.then, `${destBase}_map${i}`);
      thenExpr = `${destBase}_map${i}`;
      conditionPrecomputes.push(...mapping.precomputes, {
        colName: thenExpr,
        esql: mapping.expression,
      });
    }
    // CHANGED: each arm is a column, so COALESCE gets only columns.
    const armColName = `${destBase}_then${i}`;
    conditionPrecomputes.push({ colName: armColName, esql: `CASE(${condition}, ${thenExpr})` });
    coalesceArms.push(armColName);
  }
  // CHANGED: the fallback arm is a column.
  const fallbackColName = `${destBase}_fallback`;
  conditionPrecomputes.push({
    colName: fallbackColName,
    esql: `CASE(${effectiveSourceName} IS NULL OR ${effectiveSourceName} == "", ${fallbackExpression})`,
  });
  coalesceArms.push(fallbackColName);
  coalesceArms.push(effectiveSourceName);

  return { expression: `COALESCE(${coalesceArms.join(', ')})`, conditionPrecomputes };
}

/**
 * Returns comma-separated EVAL assignments for a single field evaluation
 * (e.g. `entity.namespace` derived from `event.module`).
 * May include intermediate source-picker and condition columns.
 */
function buildOneFieldEvaluationEsql(evaluation: FieldEvaluation): string {
  const { destination, sources, fallbackValue, whenClauses } = evaluation;
  const sourceExpressions = sources.map((s) => sourceToEsqlExpression(s));
  const sourceVariablesBaseName = `_src_${destination.replace(/\./g, '_')}`;
  const effectiveSourceName = sourceVariablesBaseName;
  const fallbackExpression =
    fallbackValue === null ? 'NULL' : `"${escapeEsqlString(fallbackValue)}"`;
  const destBase = `_eval_${destination.replace(/\./g, '_')}`;

  if (sourceExpressions.length === 0) {
    throw new Error(
      `buildOneFieldEvaluationEsql: field evaluation "${destination}" has no sources`
    );
  }

  const assignments: string[] = [];

  if (sourceExpressions.length === 1) {
    assignments.push(`${effectiveSourceName} = ${sourceExpressions[0]}`);
  } else {
    for (let i = 0; i < sourceExpressions.length; i++) {
      assignments.push(`${sourceVariablesBaseName}${i} = ${sourceExpressions[i]}`);
    }
    // CHANGED: assigns the picker's arm columns first.
    const picker = buildSourcePickerEsql(sourceVariablesBaseName, sourceExpressions.length);
    for (const { colName, esql } of picker.precomputes) {
      assignments.push(`${colName} = ${esql}`);
    }
    assignments.push(`${effectiveSourceName} = ${picker.expression}`);
  }

  const { expression: destinationExpr, conditionPrecomputes } = buildDestinationFieldEsql(
    effectiveSourceName,
    destBase,
    fallbackExpression,
    whenClauses
  );
  for (const { colName, esql } of conditionPrecomputes) {
    // CHANGED: precomputes carry their own parentheses (not all of them are conditions).
    assignments.push(`${colName} = ${esql}`);
  }
  assignments.push(`${destination} = ${destinationExpr}`);

  return assignments.join(',\n ');
}

function escapeEsqlString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function getFieldEvaluationsEsql(entityType: EntityType): string | undefined {
  return getFieldEvaluationsEsqlFromDefinition(getEntityDefinitionWithoutId(entityType));
}

/**
 * Returns an ESQL EVAL fragment for all field evaluations of the given entity type.
 * Use in a pipeline as | EVAL <result>. Returns undefined when there are no field evaluations.
 */
function getFieldEvaluationsEsqlFromDefinition(
  definition: EntityDefinitionWithoutId
): string | undefined {
  // Use only top-level shared evaluations (e.g. entity.source).
  // Identity-specific evaluations (e.g. entity.namespace) are emitted by
  // getEuidEsqlEvaluation directly, co-located with the EUID expression.
  const evaluations = definition.fieldEvaluations ?? [];
  if (evaluations.length === 0) {
    return undefined;
  }
  return evaluations.map((e) => buildOneFieldEvaluationEsql(e)).join(',\n ');
}

/**
 * Returns a comma-separated ES|QL EVAL assignments fragment that computes the entity id
 * for the given entity type and assigns it to `outputColumn`.
 *
 * For multi-field identities the fragment also emits intermediate columns (`_present`,
 * `_present_or_null`, field-evaluation columns) as sequential assignments in the same
 * `| EVAL` stage so later assignments can reference them by name.
 *
 * Wrap the returned string with `| EVAL`:
 * ```ts
 * parts.push(`| EVAL ${getEuidEsqlEvaluation(type, 'entity.id')}`);
 * ```
 */
export function getEuidEsqlEvaluation(
  entityType: EntityType,
  outputColumn: string,
  { withTypeId = true }: { withTypeId?: boolean } = {}
): string {
  const entityDefinition = getEntityDefinitionWithoutId(entityType);
  const { identityField } = entityDefinition;
  const mustPrependTypeId = withTypeId && !identityField.skipTypePrepend;

  if (isSingleFieldIdentity(identityField)) {
    const expression = appendTypeIdIfNeeded(
      entityType,
      castField(identityField.singleField),
      mustPrependTypeId
    );
    return `${outputColumn} = ${expression}`;
  }

  const { euidRanking } = identityField;
  const branches = euidRanking.branches;
  const presentFields = collectRankingFields(branches);
  const presentOrNullAliases = new Map(
    [...presentFields].map((f) => [f, esqlPresentOrNullColumnName(f)])
  );
  const assignments: string[] = [];

  // Identity-specific field evaluations (e.g. entity.namespace for user) must precede
  // the _present columns that may reference their output.
  for (const evaluation of identityField.fieldEvaluations ?? []) {
    assignments.push(buildOneFieldEvaluationEsql(evaluation));
  }
  for (const f of presentFields) {
    assignments.push(`${esqlPresentColumnName(f)} = ${esqlIsNotNullOrEmpty(f)}`);
  }
  // Nullable aliases: field value when present, NULL otherwise.
  for (const f of presentFields) {
    assignments.push(
      `${esqlPresentOrNullColumnName(f)} = CASE(${esqlPresentColumnName(f)}, TO_STRING(${f}))`
    );
  }

  const hasConditionalBranch = branches.some((b) => b.when != null);
  let idLogic: string;
  if (!hasConditionalBranch && branches.length === 1) {
    // CHANGED: assigns the ranking's arm columns first.
    const ranking = buildRankingCaseEsql(
      branches[0].ranking,
      presentOrNullAliases,
      `_${outputColumn.replace(/[.`]/g, '_')}`
    );
    for (const { colName, esql } of ranking.precomputes) {
      assignments.push(`${colName} = ${esql}`);
    }
    idLogic = ranking.expression;
  } else {
    // Pre-compute each branch's condition and formula as named columns, then combine
    // with a single multi-arm CASE (not COALESCE) so a matched branch that evaluates
    // to NULL does not fall through to the next branch.
    // CHANGED: the multi-arm CASE becomes nested single-condition CASEs, built from the
    // last branch (see below).
    const formulaVars: string[] = [];
    for (const [i, branch] of branches.entries()) {
      const formulaVar = `_euid_branch_${i}_formula`;
      // CHANGED: assigns the ranking's arm columns first.
      const ranking = buildRankingCaseEsql(branch.ranking, presentOrNullAliases, formulaVar);
      for (const { colName, esql } of ranking.precomputes) {
        assignments.push(`${colName} = ${esql}`);
      }
      assignments.push(`${formulaVar} = ${ranking.expression}`);
      if (branch.when) {
        const condVar = `_euid_branch_${i}_cond`;
        assignments.push(`${condVar} = (${conditionToESQL(branch.when)})`);
      }
      formulaVars.push(formulaVar);
    }
    // CHANGED: `CASE(c0, f0, c1, f1, …, NULL)` as `CASE(c0, f0, CASE(c1, f1, … NULL))`,
    // one column per level. A branch without a condition ends the chain, like `TRUE, f`.
    idLogic = 'NULL';
    for (let i = branches.length - 1; i >= 0; i--) {
      if (branches[i].when == null) {
        idLogic = formulaVars[i];
      } else {
        const pickVar = `_euid_branch_${i}_pick`;
        assignments.push(
          `${pickVar} = CASE(_euid_branch_${i}_cond, ${formulaVars[i]}, ${idLogic})`
        );
        idLogic = pickVar;
      }
    }
  }

  assignments.push(
    `${outputColumn} = ${appendTypeIdIfNeeded(entityType, idLogic, mustPrependTypeId)}`
  );
  return assignments.join(',\n ');
}

function appendTypeIdIfNeeded(
  entityType: EntityType,
  euidLogic: string,
  mustPrependTypeId: boolean
) {
  if (mustPrependTypeId) {
    return `CONCAT("${entityType}:", ${euidLogic})`;
  }
  return euidLogic;
}
