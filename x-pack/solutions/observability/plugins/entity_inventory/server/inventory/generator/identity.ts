/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIdentityFields } from '@kbn/entity-store/common';
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
  /** True when the identity has more than one composition, so groups may share an id. */
  isRanked: boolean;
}

type EntityIdentity = EntityDefinitionWithoutId['identityField'];

// How many compositions the identity ranks; the store exports no count of its own.
const countCompositions = (identityField: EntityIdentity): number =>
  'singleField' in identityField
    ? 1
    : identityField.euidRanking.branches.reduce((count, { ranking }) => count + ranking.length, 0);

/**
 * Resolves the grouping fields, presence filter and id evaluation of a definition with `dynamic`,
 * whose identity the store has already validated as servable.
 */
export const resolveIdentityPlan = (definition: EntityDefinitionWithoutId): IdentityPlan => {
  getDynamicBlock(definition);
  const { identityField } = definition;
  return {
    groupingFields: getIdentityFields(identityField),
    // The store leaves a composed filter unparenthesised (`a AND b OR c AND d`); wrap it so it can
    // be ANDed with other predicates.
    presenceFilter: `(${euid.esql.getEuidDocumentsContainsIdFilter(definition)})`,
    idEvaluation: euid.esql.getEuidEvaluation(definition, ENTITY_ID_COLUMN),
    isRanked: countCompositions(identityField) > 1,
  };
};
