/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, isAssignment, isColumn } from '@elastic/esql';
import { getIdentityCompositions, getIdentityFields } from '@kbn/entity-store/common';
import type { EntityDefinitionWithoutId } from '@kbn/entity-store/common';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import { getDynamicBlock } from './dynamic';

/** The column the id evaluation assigns. */
export const ENTITY_ID_COLUMN = 'entity.id';

/** What a plan's query needs from the identity: the `BY` keys, the presence predicate and the id. */
export interface IdentityPlan {
  /** The `BY` keys: the single field, or every field of the ranking, in order of first appearance. */
  groupingFields: string[];
  /** Parenthesised ES|QL boolean expression requiring an identity to be present on a document. */
  presenceFilter: string;
  /**
   * ES|QL `EVAL` assignments computing `entity.id` on the aggregated rows. For a composed identity
   * the store emits helper columns (`<field>_present`, `<field>_present_or_null`) before it.
   */
  idEvaluation: string;
  /** Columns the id evaluation assigns besides `entity.id`, in assignment order. */
  helperColumns: string[];
  /**
   * The fields of each identity composition, in ranking order: `[[field]]` for a single field, one
   * list per ranking entry otherwise. An index can serve the identity if it maps every field of one.
   */
  compositions: string[][];
  /**
   * Grouping field to the column that keeps its raw value, for each grouping field the id
   * evaluation overwrites (in practice an identity on `entity.id`). The list query copies the
   * grouped column there before the id evaluation, so the executor can still read whether an index
   * maps the field.
   */
  rawIdentityColumns: ReadonlyMap<string, string>;
}

// A `:` is outside the store's field-path pattern (`^[A-Za-z0-9_@-]+(\.[A-Za-z0-9_@-]+)*$`) that
// attribute, identity and helper column names follow, so a raw column cannot collide with any.
const rawIdentityColumnOf = (field: string): string => `raw:${field}`;

// Reads the assignment targets from the generated text so the names never drift from the store.
const assignedColumns = (idEvaluation: string): string[] => {
  const { root, errors } = Parser.parse(`FROM x | EVAL ${idEvaluation}`);
  const [, evalCommand] = root.commands;
  if (errors.length > 0 || root.commands.length !== 2 || evalCommand?.name !== 'eval') {
    throw new Error(`the store's id evaluation is not a single EVAL: ${idEvaluation}`);
  }
  return evalCommand.args.map((arg) => {
    const target = isAssignment(arg) ? arg.args[0] : undefined;
    if (!isColumn(target)) {
      throw new Error(`the store's id evaluation has a non-assignment expression: ${idEvaluation}`);
    }
    return target.name;
  });
};

/**
 * Resolves the grouping fields, presence filter and id evaluation of a definition with `dynamic`,
 * whose identity the store has already validated as servable.
 */
export const resolveIdentityPlan = (definition: EntityDefinitionWithoutId): IdentityPlan => {
  getDynamicBlock(definition);
  const { identityField } = definition;
  const idEvaluation = euid.esql.getEuidEvaluation(definition, ENTITY_ID_COLUMN);
  const groupingFields = getIdentityFields(identityField);
  const assigned = assignedColumns(idEvaluation);
  const assignedNames = new Set(assigned);
  return {
    groupingFields,
    // The store leaves a composed filter unparenthesised (`a AND b OR c AND d`); wrap it so it can
    // be ANDed with other predicates.
    presenceFilter: `(${euid.esql.getEuidDocumentsContainsIdFilter(definition)})`,
    idEvaluation,
    helperColumns: assigned.filter((name) => name !== ENTITY_ID_COLUMN),
    compositions: getIdentityCompositions(identityField),
    rawIdentityColumns: new Map(
      groupingFields
        .filter((field) => assignedNames.has(field))
        .map((field) => [field, rawIdentityColumnOf(field)])
    ),
  };
};
