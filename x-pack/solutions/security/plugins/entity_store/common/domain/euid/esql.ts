/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityStoreConditionToESQL as conditionToESQL } from '../../esql/condition_to_esql';
import type {
  EntityDefinitionWithoutId,
  FieldEvaluation,
  EntityType,
  EuidAttribute,
} from '../definitions/entity_schema';
import { isSingleFieldIdentity } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import {
  esqlIsNotNullOrEmpty,
  esqlIsNullOrEmpty,
  esqlPresentOrNullColumnName,
  esqlPresentColumnName,
} from '../../esql/strings';
import {
  applyWhenConditionTrueSetFields,
  documentPassesCalculatedIdentityPipelineGate,
  getDocument,
  getEffectiveEuidRanking,
  getFieldValue,
  getFieldsToBeFilteredOn,
  getFieldsToBeFilteredOut,
  getSourceFieldNames,
  isEuidField,
  isEuidSeparator,
} from './commons';
import {
  applyFieldEvaluations,
  getFieldEvaluationsFromDefinition,
  getSourceMatchSpec,
  type SourceMatchSpec,
} from './field_evaluations';

/**
 * Constructs an ESQL filter for the provided entity type and document.
 *
 * It supports both flattened and nested document shapes.
 * If a document contains `_source` property, it will be unwrapped before processing.
 *
 * Example usage:
 * ```ts
 * import { getEuidEsqlFilterBasedOnDocument } from './esql';
 *
 * const doc = { host: { name: 'server1', domain: 'example.com' } };
 * const filter = getEuidEsqlFilterBasedOnDocument('host', doc);
 * // filter may look like:
 * // '((host.name == "server1") AND (host.domain == "example.com") AND (host.entity.id IS NULL OR host.entity.id == ""))'
 * ```
 *
 * @param entityType - The entity type string (e.g. 'host', 'user', 'generic')
 * @param doc - The document to derive entity filter fields from. May be a flattened or nested shape.
 * @returns An ESQL filter string, or `undefined` if the document does not contain enough identifying
 *   information, or if it would not pass the entity's `documentsFilter` ∧ `postAggFilter` (same gate
 *   as logs extraction) after field evaluations, `whenConditionTrueSetFieldsPreAgg`, and single-doc
 *   simulation of `whenConditionTrueSetFieldsAfterStats`.
 */
export function getEuidEsqlFilterBasedOnDocument(
  entityType: EntityType,
  doc: any
): string | undefined {
  if (!doc) {
    return undefined;
  }

  doc = getDocument(doc);
  const entityDefinition = getEntityDefinitionWithoutId(entityType);
  const { identityField } = entityDefinition;

  if (isSingleFieldIdentity(identityField)) {
    const value = getFieldValue(doc, identityField.singleField);
    if (value === undefined) {
      return undefined;
    }
    return `(${identityField.singleField} == "${escapeEsqlString(value)}")`;
  }

  const fieldEvaluations = identityField.fieldEvaluations ?? [];
  if (fieldEvaluations.length > 0) {
    const evaluated = applyFieldEvaluations(doc, fieldEvaluations);
    doc = { ...doc, ...evaluated };
  }
  if (entityDefinition.whenConditionTrueSetFieldsPreAgg?.length) {
    applyWhenConditionTrueSetFields(doc, entityDefinition.whenConditionTrueSetFieldsPreAgg);
  }
  if (entityDefinition.whenConditionTrueSetFieldsAfterStats?.length) {
    applyWhenConditionTrueSetFields(doc, entityDefinition.whenConditionTrueSetFieldsAfterStats);
  }
  if (!documentPassesCalculatedIdentityPipelineGate(doc, entityDefinition)) {
    return undefined;
  }
  const effectiveEuidRanking = getEffectiveEuidRanking(doc, identityField);
  const fieldsToBeFilteredOn = getFieldsToBeFilteredOn(doc, effectiveEuidRanking);
  if (fieldsToBeFilteredOn.rankingPosition === -1) {
    return undefined;
  }

  const evaluatedDestinations = new Set(fieldEvaluations.map((e) => e.destination));

  const onExpressions = Object.entries(fieldsToBeFilteredOn.values)
    .filter(([field]) => !evaluatedDestinations.has(field))
    .map(([field, value]) => `(${field} == "${escapeEsqlString(value)}")`);

  const toBeFilteredOut = getFieldsToBeFilteredOut(
    effectiveEuidRanking,
    fieldsToBeFilteredOn
  ).filter((field) => !evaluatedDestinations.has(field));
  const outExpressions = toBeFilteredOut.map((field) => `${esqlIsNullOrEmpty(field)}`);

  const allParts: string[] = [...onExpressions, ...outExpressions];

  if (fieldEvaluations.length > 0) {
    for (const evaluation of fieldEvaluations) {
      const { exactMatchFields, prefixMatchFields } = getSourceFieldNames(evaluation.sources);
      const sourceFields = [...exactMatchFields, ...prefixMatchFields];
      const hasEvaluatedSource = sourceFields.some((f) => evaluatedDestinations.has(f));
      if (hasEvaluatedSource) {
        continue;
      }
      const spec = getSourceMatchSpec(doc, evaluation);
      allParts.push(buildSourceClauseEsql(evaluation, spec));
    }
  }

  return `(${allParts.join(' AND ')})`;
}

function sourceToEsqlExpression(source: FieldEvaluation['sources'][number]): string {
  if ('field' in source) {
    return `MV_FIRST(${source.field})`;
  }
  return `MV_FIRST(SPLIT(MV_FIRST(${source.firstChunkOfField}), "${escapeEsqlString(
    source.splitBy
  )}"))`;
}

/**
 * Builds the ESQL EVAL expression for a single field evaluation (e.g. mapping event.module / data_stream.dataset to entity.namespace).
 *
 * - Source values: each source is read with MV_FIRST so multi-value fields are supported; firstChunkOfField sources use SPLIT then MV_FIRST.
 * - Multiple sources: each is assigned to a variable (_src_<dest>0, _src_<dest>1, ...), then an effective source is the first non-null, non-empty variable (CASE).
 * - Destination: one CASE over `whenClauses` in order (sourceMatch arms, then condition arms), then null/empty → fallbackValue, else effective source.
 *
 * Returns a comma-separated list of EVAL assignments (one or more lines).
 */
function buildOneFieldEvaluationEsql(evaluation: FieldEvaluation): string {
  const { destination, sources, fallbackValue, whenClauses } = evaluation;
  const sourceExpressions = sources.map(sourceToEsqlExpression);
  const sourceVariablesBaseName = `_src_${destination.replace(/\./g, '_')}`;
  const effectiveSourceName = sourceVariablesBaseName;
  const fallbackExpression =
    fallbackValue === null ? 'NULL' : `"${escapeEsqlString(fallbackValue)}"`;

  // Pre-compute condition-based arm predicates as boolean columns so the single-arm
  // CASE conditions below are cheap attribute reads.
  const conditionPrecomputes: Array<{ colName: string; esql: string }> = [];
  const destBase = `_eval_${destination.replace(/\./g, '_')}`;

  // Build the destination expression.
  // When there are whenClauses, replace the multi-arm CaseLazyEvaluator with a COALESCE of
  // single-arm CaseEagerEvaluators. Single-arm CASEs are always vectorized (CaseEagerEvaluator)
  // regardless of condition complexity, while multi-arm CASEs use per-row CaseLazyEvaluator.
  let destinationCaseExpr: string;
  if (whenClauses.length === 0) {
    // 0 whenClauses: the single fallback arm is already CaseEagerEvaluator.
    destinationCaseExpr = `CASE((${effectiveSourceName} IS NULL OR ${effectiveSourceName} == ""), ${fallbackExpression}, ${effectiveSourceName})`;
  } else {
    const coalesceArms: string[] = [];
    for (const [i, clause] of whenClauses.entries()) {
      let condition: string;
      if ('sourceMatchesAny' in clause) {
        const inList = clause.sourceMatchesAny.map((v) => `"${escapeEsqlString(v)}"`).join(', ');
        condition = `COALESCE(${effectiveSourceName} IN (${inList}), FALSE)`;
      } else {
        const colName = `${destBase}_arm${i}`;
        conditionPrecomputes.push({ colName, esql: conditionToESQL(clause.condition) });
        condition = `COALESCE(${colName}, FALSE)`;
      }
      coalesceArms.push(`CASE(${condition}, "${escapeEsqlString(clause.then)}")`);
    }
    coalesceArms.push(
      `CASE(${effectiveSourceName} IS NULL OR ${effectiveSourceName} == "", ${fallbackExpression})`
    );
    coalesceArms.push(effectiveSourceName);
    destinationCaseExpr = `COALESCE(${coalesceArms.join(', ')})`;
  }

  const assignments: string[] = [];

  if (sourceExpressions.length === 1) {
    assignments.push(`${effectiveSourceName} = ${sourceExpressions[0]}`);
  } else {
    for (let i = 0; i < sourceExpressions.length; i++) {
      assignments.push(`${sourceVariablesBaseName}${i} = ${sourceExpressions[i]}`);
    }
    // Replace multi-arm CaseLazyEvaluator with COALESCE of single-arm CaseEagerEvaluators.
    // Each CASE(field IS NOT NULL AND != "", field) is CaseEagerEvaluator (vectorized).
    const nnExprs = sourceExpressions.map((_, i) => {
      const v = `${sourceVariablesBaseName}${i}`;
      return `CASE(${v} IS NOT NULL AND ${v} != "", ${v})`;
    });
    assignments.push(`${effectiveSourceName} = COALESCE(${nnExprs.join(', ')})`);
  }

  for (const { colName, esql } of conditionPrecomputes) {
    assignments.push(`${colName} = (${esql})`);
  }
  assignments.push(`${destination} = ${destinationCaseExpr}`);

  return assignments.join(',\n ');
}

function escapeEsqlString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildSourceClauseEsql(evaluation: FieldEvaluation, spec: SourceMatchSpec): string {
  if (spec.type === 'condition') {
    return `(${conditionToESQL(spec.condition)})`;
  }

  const { exactMatchFields, prefixMatchFields } = getSourceFieldNames(evaluation.sources);
  const allSourceFields = [...exactMatchFields, ...prefixMatchFields];

  if (spec.type === 'unknown') {
    return `(${allSourceFields.map((f) => esqlIsNullOrEmpty(f)).join(' AND ')})`;
  }

  const disjuncts = spec.values.map((v) => {
    const escaped = escapeEsqlString(v);
    const exactConds = exactMatchFields.map((f) => `(${f} == "${escaped}")`);
    const prefixConds = prefixMatchFields.map((f) => `STARTS_WITH(${f}, "${escaped}")`);
    const parts = [...exactConds, ...prefixConds];
    return parts.length === 1 ? parts[0] : `(${parts.join(' OR ')})`;
  });
  return disjuncts.length === 1 ? disjuncts[0] : `(${disjuncts.join(' OR ')})`;
}

export function getFieldEvaluationsEsql(entityType: EntityType): string | undefined {
  return getFieldEvaluationsEsqlFromDefinition(getEntityDefinitionWithoutId(entityType));
}

/**
 * Returns an ESQL EVAL fragment for all field evaluations of the given entity type.
 * Use in a pipeline as | EVAL <result>. Returns undefined when there are no field evaluations.
 */
export function getFieldEvaluationsEsqlFromDefinition({
  fieldEvaluations,
  identityField,
}: EntityDefinitionWithoutId): string | undefined {
  const evaluations = getFieldEvaluationsFromDefinition({ fieldEvaluations, identityField });
  if (!evaluations || evaluations.length === 0) {
    return undefined;
  }
  return evaluations.map(buildOneFieldEvaluationEsql).join(',\n ');
}

/**
 * Constructs an ESQL filter for the provided entity type that checks if the documents contains an entity id.
 *
 * You will need to prepend the result with a `| WHERE` clause, or just add to your existing WHERE clause.
 *
 * Example usage:
 * ```ts
 * import { getEuidEsqlDocumentsContainsIdFilter } from './esql';
 *
 * const filter = getEuidEsqlDocumentsContainsIdFilter('host');
 * // filter may look like:
 * // '((host.entity.id IS NOT NULL) OR (host.id IS NOT NULL) OR (host.name IS NOT NULL) OR (host.hostname IS NOT NULL))'
 * ```
 *
 * @param entityType - The entity type string (e.g. 'host', 'user', 'generic')
 * @returns An ESQL filter string that checks if the document contains an entity id.
 */
export function getEuidEsqlDocumentsContainsIdFilter(entityType: EntityType) {
  const entityDefinition = getEntityDefinitionWithoutId(entityType);
  const { identityField } = entityDefinition;

  if (isSingleFieldIdentity(identityField)) {
    return `(${esqlIsNotNullOrEmpty(identityField.singleField)})`;
  }

  return conditionToESQL(identityField.documentsFilter);
}

/**
 * Constructs an ESQL evaluation for the provided entity type to generate the entity id.
 *
 * You will need to prepend the result with a `| EVAL` clause, or just add to your existing EVAL clause.
 *
 * Example usage:
 * ```ts
 * import { getEuidEsqlEvaluation } from './esql';
 *
 * const evaluation = getEuidEsqlEvaluation('host');
 * // evaluation may look like:
 * // 'CONCAT("host:", CASE((host.entity.id IS NOT NULL AND host.entity.id != ""), host.entity.id,
 * //                      (host.id IS NOT NULL AND host.id != ""), host.id,
 * //                      (host.name IS NOT NULL AND host.name != "" AND host.domain IS NOT NULL AND host.domain != ""), CONCAT(host.name, ".", host.domain),
 * //                      (host.hostname IS NOT NULL AND host.hostname != "" AND host.domain IS NOT NULL AND host.domain != ""), CONCAT(host.hostname, ".", host.domain),
 * //                      (host.name IS NOT NULL AND host.name != ""), host.name,
 * //                      (host.hostname IS NOT NULL AND host.hostname != ""), host.hostname, NULL))'
 * ```
 *
 * @param entityType - The entity type string (e.g. 'host', 'user', 'generic')
 * @param withTypeId - Whether to prepend the entity type to the evaluation. Defaults to true.
 * @returns An ESQL evaluation string that computes the entity id.
 */
function collectRankingFields(
  branches: Array<{ when?: unknown; ranking: EuidAttribute[][] }>
): Set<string> {
  const fields = new Set<string>();
  for (const branch of branches) {
    const { ranking } = branch;
    if (ranking.length === 1 && ranking[0].length === 1 && isEuidField(ranking[0][0])) {
      continue;
    }
    for (const composedField of ranking) {
      for (const attr of composedField) {
        if (isEuidField(attr)) {
          fields.add(attr.field);
        }
      }
    }
  }
  return fields;
}

function buildPresentPrelude(presentFields: Set<string>): string | null {
  if (presentFields.size === 0) return null;
  const presentAssignments = [...presentFields]
    .map((f) => `${esqlPresentColumnName(f)} = ${esqlIsNotNullOrEmpty(f)}`)
    .join(',\n ');
  const nullableAssignments = [...presentFields]
    .map((f) => `${esqlPresentOrNullColumnName(f)} = CASE(${esqlPresentColumnName(f)}, ${f})`)
    .join(',\n ');
  return `| EVAL ${presentAssignments},\n ${nullableAssignments}`;
}

function buildRankingCaseEsql(ranking: EuidAttribute[][]): string {
  if (ranking.length === 0) {
    throw new Error('No euid fields found, invalid euid logic definition');
  }

  // Trivial: single arm, single field — return the field directly, no null guard needed.
  if (ranking.length === 1) {
    const comp = ranking[0];
    const firstAttr = comp[0];
    if (isEuidSeparator(firstAttr)) {
      throw new Error('Separator found in single field, invalid euid logic definition');
    }
    if (comp.length === 1 && isEuidField(firstAttr)) {
      return (firstAttr as { field: string }).field;
    }
  }

  // Build one nullable expression per arm using _present_or_null aliases.
  // CONCAT returns null when any argument is null, so no explicit condition guards are needed.
  // COALESCE then picks the first non-null result across arms.
  const armExprs = ranking.map((composedField) => {
    if (composedField.length === 1 && isEuidSeparator(composedField[0])) {
      throw new Error('Separator found in single field, invalid euid logic definition');
    }
    if (isEuidSeparator(composedField[0])) {
      throw new Error('The first field of a composed field cannot be a separator');
    }

    if (composedField.length === 1) {
      return esqlPresentOrNullColumnName((composedField[0] as { field: string }).field);
    }

    const parts = composedField.map((attr) =>
      isEuidField(attr)
        ? esqlPresentOrNullColumnName(attr.field)
        : `"${escapeEsqlString(attr.sep)}"`
    );
    return `CONCAT(${parts.join(', ')})`;
  });

  return armExprs.length === 1 ? armExprs[0] : `COALESCE(${armExprs.join(', ')})`;
}

/**
 * Builds a self-contained ranking CASE expression using inline IS NOT NULL / != "" guards.
 * No prelude columns are referenced — the expression is safe to embed directly in any EVAL.
 * Used by the public {@link getEuidEsqlEvaluation} to preserve backward-compatible string API.
 */
function buildRankingCaseEsqlInline(ranking: EuidAttribute[][]): string {
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
      return (firstAttr as { field: string }).field;
    }
  }
  const euidLogic = ranking.map((composedField) => {
    if (composedField.length === 1 && isEuidSeparator(composedField[0])) {
      throw new Error('Separator found in single field, invalid euid logic definition');
    }
    if (isEuidSeparator(composedField[0])) {
      throw new Error('The first field of a composed field cannot be a separator');
    }
    const compositionConditions = composedField
      .filter(isEuidField)
      .map((f) => esqlIsNotNullOrEmpty(f.field))
      .join(' AND ');
    if (composedField.length === 1) {
      return `(${compositionConditions}), ${(composedField[0] as { field: string }).field}`;
    }
    const evaluations = composedField
      .map((attr) => (isEuidField(attr) ? attr.field : `"${escapeEsqlString(attr.sep)}"`))
      .join(', ');
    return `(${compositionConditions}), CONCAT(${evaluations})`;
  });
  return `CASE(${euidLogic.join(',\n')}, NULL)`;
}

/**
 * Returns a self-contained ES|QL expression string for the entity's EUID.
 * No prelude pipeline stages are required — the expression can be used directly in
 * `| EVAL column = <result>` without any prior EVAL setup.
 *
 * External consumers (e.g. the CSP graph plugin) should use this function.
 * For the optimized pipeline-with-prelude variant used internally by entity_store's
 * logs-extraction builders, use {@link getEuidEsqlEvaluationParts}.
 */
export function getEuidEsqlEvaluation(
  entityType: EntityType,
  { withTypeId = true }: { withTypeId?: boolean } = {}
): string {
  const { identityField } = getEntityDefinitionWithoutId(entityType);
  const mustPrependTypeId = withTypeId && !identityField.skipTypePrepend;
  if (isSingleFieldIdentity(identityField)) {
    return appendTypeIdIfNeeded(entityType, identityField.singleField, mustPrependTypeId);
  }
  const { euidRanking } = identityField;
  const branches = euidRanking.branches;
  const hasConditionalBranch = branches.some((b) => b.when != null);
  if (!hasConditionalBranch && branches.length === 1) {
    const idLogic = buildRankingCaseEsqlInline(branches[0].ranking);
    return appendTypeIdIfNeeded(entityType, idLogic, mustPrependTypeId);
  }
  const branchCaseParts: string[] = [];
  for (const branch of branches) {
    const rankingCase = buildRankingCaseEsqlInline(branch.ranking);
    if (branch.when) {
      const whenCondition = conditionToESQL(branch.when);
      branchCaseParts.push(`(${whenCondition}), ${rankingCase}`);
    } else {
      branchCaseParts.push(`true, ${rankingCase}`);
    }
  }
  const idLogic =
    branchCaseParts.length > 0 ? `CASE(${branchCaseParts.join(',\n')}, NULL)` : 'NULL';
  return appendTypeIdIfNeeded(entityType, idLogic, mustPrependTypeId);
}

/**
 * Optimized variant of {@link getEuidEsqlEvaluation} for entity_store's logs-extraction pipeline.
 * Returns `{ prelude, expression }` where `prelude` contains one or more `| EVAL` pipeline stages
 * that must be inserted before the stage that uses `expression`.
 *
 * The prelude pre-computes field-presence booleans and nullable aliases so that the final
 * CASE/COALESCE expression only references plain Attribute columns, enabling
 * CaseEagerEvaluator (vectorized) instead of the per-row CaseLazyEvaluator.
 */
export function getEuidEsqlEvaluationParts(
  entityType: EntityType,
  { withTypeId = true }: { withTypeId?: boolean } = {}
): { prelude: string | null; expression: string } {
  const { identityField } = getEntityDefinitionWithoutId(entityType);
  const mustPrependTypeId = withTypeId && !identityField.skipTypePrepend;

  if (isSingleFieldIdentity(identityField)) {
    return {
      prelude: null,
      expression: appendTypeIdIfNeeded(entityType, identityField.singleField, mustPrependTypeId),
    };
  }

  const { euidRanking } = identityField;
  const branches = euidRanking.branches;
  const presentFields = collectRankingFields(branches);
  const prelude = buildPresentPrelude(presentFields);

  const hasConditionalBranch = branches.some((b) => b.when != null);
  if (!hasConditionalBranch && branches.length === 1) {
    const idLogic = buildRankingCaseEsql(branches[0].ranking);
    return { prelude, expression: appendTypeIdIfNeeded(entityType, idLogic, mustPrependTypeId) };
  }

  // Multi-branch: pre-compute each branch's condition AND ranking formula as named columns,
  // then compose a single multi-arm CASE over plain Attribute references.
  // This preserves "first-matched-branch wins, even if its formula is NULL" semantics —
  // matching getEuidEsqlEvaluation, memory.ts, dsl.ts, kql.ts, and getEffectiveEuidRanking.
  // (A COALESCE of per-branch single-arm CASEs would fall through to the next branch when the
  // matched branch's formula is NULL, diverging from the intended semantics.)
  const precomputeAssignments: string[] = [];
  const caseParts: string[] = [];
  for (const [i, branch] of branches.entries()) {
    const rankingFormula = buildRankingCaseEsql(branch.ranking);
    const formulaVar = `_euid_branch_${i}_formula`;
    if (branch.when) {
      const whenCondition = conditionToESQL(branch.when);
      const condVar = `_euid_branch_${i}_cond`;
      precomputeAssignments.push(`${condVar} = (${whenCondition})`);
      precomputeAssignments.push(`${formulaVar} = ${rankingFormula}`);
      caseParts.push(`${condVar}, ${formulaVar}`);
    } else {
      precomputeAssignments.push(`${formulaVar} = ${rankingFormula}`);
      caseParts.push(`TRUE, ${formulaVar}`);
    }
  }

  // Merge precompute assignments into the present-prelude EVAL so both stages become one.
  // Sequential EVAL assignments allow later entries to reference columns from earlier ones.
  let combinedPrelude: string | null;
  if (precomputeAssignments.length > 0) {
    const precomputeFragment = precomputeAssignments.join(',\n ');
    combinedPrelude = prelude
      ? `${prelude},\n ${precomputeFragment}`
      : `| EVAL ${precomputeFragment}`;
  } else {
    combinedPrelude = prelude;
  }
  const idLogic = `CASE(${caseParts.join(',\n')}, NULL)`;
  return {
    prelude: combinedPrelude,
    expression: appendTypeIdIfNeeded(entityType, idLogic, mustPrependTypeId),
  };
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
