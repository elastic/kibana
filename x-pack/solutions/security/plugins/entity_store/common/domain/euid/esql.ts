/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityStoreConditionToESQL as conditionToESQL } from '../../esql/condition_to_esql';
import { castField } from '../../esql/cast';
import type {
  EntityDefinitionWithoutId,
  FieldEvaluation,
  EntityType,
  EuidAttribute,
} from '../definitions/entity_schema';
import { isSingleFieldIdentity } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import { esqlIsNotNullOrEmpty, esqlIsNullOrEmpty, esqlPresentColumnName } from '../../esql/strings';
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

// ---------------------------------------------------------------------------
// Helpers for the optimized pipeline (getEuidEsqlEvaluationParts)
// ---------------------------------------------------------------------------

/**
 * Collects the set of unique identity fields across all branches of an euidRanking.
 * Single-field branches (ranking.length === 1, single EuidField) are skipped because
 * they short-circuit before the CASE and do not need `_present` aliases.
 */
function collectRankingFields(
  branches: Array<{ when?: unknown; ranking: EuidAttribute[][] }>
): Set<string> {
  const fields = new Set<string>();
  for (const { ranking } of branches) {
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

/**
 * Builds the `| EVAL` prelude stage that pre-computes a `<field>_present` boolean
 * for each identity field in the set.  Returns `null` when the set is empty.
 */
function buildPresentPrelude(presentFields: Set<string>): string | null {
  if (presentFields.size === 0) return null;
  const assignments = [...presentFields]
    .map((f) => `${esqlPresentColumnName(f)} = ${esqlIsNotNullOrEmpty(f)}`)
    .join(',\n ');
  return `| EVAL ${assignments}`;
}

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
    return `MV_FIRST(${castField(source.field)})`;
  }
  return `MV_FIRST(SPLIT(MV_FIRST(${castField(source.firstChunkOfField)}), "${escapeEsqlString(
    source.splitBy
  )}"))`;
}

/**
 * Builds an optimized ranking CASE expression where condition guards reference
 * pre-computed `<field>_present` boolean columns emitted by {@link buildPresentPrelude}.
 * The value expressions (TO_STRING / CONCAT) are unchanged — only conditions differ.
 * Used exclusively by {@link getEuidEsqlEvaluationParts}.
 *
 * @param presentAliases - Map from field name to its `_present` column name.
 */
function buildRankingCaseEsql(
  ranking: EuidAttribute[][],
  presentAliases: ReadonlyMap<string, string>
): string {
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
      return `TO_STRING(${(firstAttr as { field: string }).field})`;
    }
  }

  const euidLogic = ranking.map((composedField) => {
    if (composedField.length === 1 && isEuidSeparator(composedField[0])) {
      throw new Error('Separator found in single field, invalid euid logic definition');
    }

    const compositionConditions = composedField
      .filter(isEuidField)
      .map((f) => presentAliases.get(f.field) ?? esqlIsNotNullOrEmpty(f.field))
      .join(' AND ');

    if (isEuidSeparator(composedField[0])) {
      throw new Error('The first field of a composed field cannot be a separator');
    }

    if (composedField.length === 1) {
      return `(${compositionConditions}), TO_STRING(${
        (composedField[0] as { field: string }).field
      })`;
    }

    const evaluations = composedField
      .map((attr) =>
        isEuidField(attr) ? `TO_STRING(${attr.field})` : `"${escapeEsqlString(attr.sep)}"`
      )
      .join(', ');

    return `(${compositionConditions}), CONCAT(${evaluations})`;
  });

  return `CASE(${euidLogic.join(',\n')}, NULL)`;
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
  const sourceExpressions = sources.map((s) => sourceToEsqlExpression(s));
  const sourceVariablesBaseName = `_src_${destination.replace(/\./g, '_')}`;
  const effectiveSourceName = sourceVariablesBaseName;
  const fallbackExpression =
    fallbackValue === null ? 'NULL' : `"${escapeEsqlString(fallbackValue)}"`;

  const destinationCaseParts: string[] = [];
  for (const clause of whenClauses) {
    if ('sourceMatchesAny' in clause) {
      const conditions = clause.sourceMatchesAny
        .map((v) => `${effectiveSourceName} == "${escapeEsqlString(v)}"`)
        .join(' OR ');
      destinationCaseParts.push(`(${conditions}), "${escapeEsqlString(clause.then)}"`);
    } else {
      destinationCaseParts.push(
        `(${conditionToESQL(clause.condition)}), "${escapeEsqlString(clause.then)}"`
      );
    }
  }
  destinationCaseParts.push(
    `(${effectiveSourceName} IS NULL OR ${effectiveSourceName} == ""), ${fallbackExpression}`
  );
  destinationCaseParts.push(effectiveSourceName);

  const destinationCaseExpr = `CASE(${destinationCaseParts.join(', ')})`;

  const assignments: string[] = [];

  if (sourceExpressions.length === 1) {
    assignments.push(`${effectiveSourceName} = ${sourceExpressions[0]}`);
  } else {
    for (let i = 0; i < sourceExpressions.length; i++) {
      assignments.push(`${sourceVariablesBaseName}${i} = ${sourceExpressions[i]}`);
    }
    const sourceVarCaseParts = sourceExpressions.flatMap((_, i) => {
      const v = `${sourceVariablesBaseName}${i}`;
      return [`(${v} IS NOT NULL AND ${v} != "")`, v];
    });
    sourceVarCaseParts.push('NULL');
    assignments.push(`${effectiveSourceName} = CASE(${sourceVarCaseParts.join(', ')})`);
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
export function getFieldEvaluationsEsqlFromDefinition(
  definition: EntityDefinitionWithoutId
): string | undefined {
  const evaluations = getFieldEvaluationsFromDefinition(definition);
  if (!evaluations || evaluations.length === 0) {
    return undefined;
  }
  return evaluations.map((e) => buildOneFieldEvaluationEsql(e)).join(',\n ');
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
 * Computes the ES|QL entity-id expression or EVAL assignments fragment for the given entity type.
 *
 * **With `outputColumn`** (pipeline form — preferred for new code):
 * Returns a comma-separated EVAL assignments fragment.  For multi-field identities the fragment
 * pre-computes `<field>_present` boolean columns before the entity-id assignment so the CASE
 * conditions reference plain `Attribute` columns, enabling `CaseEagerEvaluator` (vectorized)
 * instead of `CaseLazyEvaluator`.  Wrap with `| EVAL`:
 * ```ts
 * parts.push(`| EVAL ${getEuidEsqlEvaluation(type, outputColumn)}`);
 * ```
 *
 * **Without `outputColumn`** (expression form — for callers that embed the value inline):
 * Returns a self-contained expression string with no pipeline setup required.  Use when embedding
 * in an existing `| EVAL` alongside other assignments or as part of a larger expression:
 * ```ts
 * evalParts.push(`myCol = ${getEuidEsqlEvaluation(type)}`);
 * ```
 */
export function getEuidEsqlEvaluation(
  entityType: EntityType,
  outputColumn: string,
  opts?: { withTypeId?: boolean }
): string;
export function getEuidEsqlEvaluation(
  entityType: EntityType,
  opts?: { withTypeId?: boolean }
): string;
export function getEuidEsqlEvaluation(
  entityType: EntityType,
  outputColumnOrOpts?: string | { withTypeId?: boolean },
  opts?: { withTypeId?: boolean }
): string {
  const outputColumn = typeof outputColumnOrOpts === 'string' ? outputColumnOrOpts : undefined;
  const { withTypeId = true } =
    (typeof outputColumnOrOpts === 'object' ? outputColumnOrOpts : opts) ?? {};
  const entityDefinition = getEntityDefinitionWithoutId(entityType);
  const { identityField } = entityDefinition;
  const mustPrependTypeId = withTypeId && !identityField.skipTypePrepend;

  if (isSingleFieldIdentity(identityField)) {
    const expression = appendTypeIdIfNeeded(
      entityType,
      castField(identityField.singleField),
      mustPrependTypeId
    );
    return outputColumn ? `${outputColumn} = ${expression}` : expression;
  }

  const { euidRanking } = identityField;
  const branches = euidRanking.branches;

  // Expression form (no outputColumn): self-contained inline CASE with no prelude.
  if (!outputColumn) {
    const hasConditionalBranch = branches.some((b) => b.when != null);
    if (!hasConditionalBranch && branches.length === 1) {
      return appendTypeIdIfNeeded(
        entityType,
        buildRankingCaseEsqlInline(branches[0].ranking),
        mustPrependTypeId
      );
    }
    const branchCaseParts: string[] = [];
    for (const branch of branches) {
      const rankingCase = buildRankingCaseEsqlInline(branch.ranking);
      branchCaseParts.push(
        branch.when ? `(${conditionToESQL(branch.when)}), ${rankingCase}` : `true, ${rankingCase}`
      );
    }
    const idLogic =
      branchCaseParts.length > 0 ? `CASE(${branchCaseParts.join(',\n')}, NULL)` : 'NULL';
    return appendTypeIdIfNeeded(entityType, idLogic, mustPrependTypeId);
  }

  // Pipeline form (outputColumn provided): optimized EVAL fragment with _present precomputes.
  const presentFields = collectRankingFields(branches);
  const presentAliases = new Map([...presentFields].map((f) => [f, esqlPresentColumnName(f)]));
  const assignments: string[] = [];
  for (const f of presentFields) {
    assignments.push(`${esqlPresentColumnName(f)} = ${esqlIsNotNullOrEmpty(f)}`);
  }

  const hasConditionalBranch = branches.some((b) => b.when != null);
  let idLogic: string;
  if (!hasConditionalBranch && branches.length === 1) {
    idLogic = buildRankingCaseEsql(branches[0].ranking, presentAliases);
  } else {
    const branchCaseParts: string[] = [];
    for (const branch of branches) {
      const rankingCase = buildRankingCaseEsql(branch.ranking, presentAliases);
      branchCaseParts.push(
        branch.when ? `(${conditionToESQL(branch.when)}), ${rankingCase}` : `true, ${rankingCase}`
      );
    }
    idLogic = branchCaseParts.length > 0 ? `CASE(${branchCaseParts.join(',\n')}, NULL)` : 'NULL';
  }

  assignments.push(
    `${outputColumn} = ${appendTypeIdIfNeeded(entityType, idLogic, mustPrependTypeId)}`
  );
  return assignments.join(',\n ');
}

/**
 * Self-contained ranking CASE expression with inline IS NOT NULL / != "" guards.
 * Only referenced by the expression form (no outputColumn) of {@link getEuidEsqlEvaluation}.
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
      return `TO_STRING(${(firstAttr as { field: string }).field})`;
    }
  }
  const euidLogic = ranking.map((composedField) => {
    if (composedField.length === 1 && isEuidSeparator(composedField[0])) {
      throw new Error('Separator found in single field, invalid euid logic definition');
    }
    const compositionConditions = composedField
      .filter(isEuidField)
      .map((f) => `${esqlIsNotNullOrEmpty(f.field)}`)
      .join(' AND ');
    if (isEuidSeparator(composedField[0])) {
      throw new Error('The first field of a composed field cannot be a separator');
    }
    if (composedField.length === 1) {
      return `(${compositionConditions}), TO_STRING(${
        (composedField[0] as { field: string }).field
      })`;
    }
    const evaluations = composedField
      .map((attr) =>
        isEuidField(attr) ? `TO_STRING(${attr.field})` : `"${escapeEsqlString(attr.sep)}"`
      )
      .join(', ');
    return `(${compositionConditions}), CONCAT(${evaluations})`;
  });
  return `CASE(${euidLogic.join(',\n')}, NULL)`;
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
