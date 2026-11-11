/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, nodeTypes } from '@kbn/es-query';
import type { KueryNode } from '@kbn/es-query';
import { escapeStringValue } from '@kbn/esql-utils';
import {
  CRITICALITY_FIELD,
  RESOLUTION_RISK_LEVEL_FIELD,
  RESOLUTION_RISK_SCORE_FIELD,
  RISK_LEVEL_FIELD,
  RISK_SCORE_NORM_FIELD,
} from '../common';
import { SOURCE_FIELD, WATCHLISTS_FIELD } from './resolved_entities';
import type { ResolvedEntityConditions } from './resolved_entities';

type Mode = keyof ResolvedEntityConditions;

const NAME_FIELD = 'entity.name';

interface GroupField {
  /** How a row reads the group's value: a column, or an expression over columns. */
  group: string;
  /** Holds several values, so `==` and `LIKE` don't apply. */
  multiValued?: boolean;
}

/**
 * The fields a search can match on a resolved row: what the row shows. `group` is the roll-up's column
 * (`buildResolvedEntityValueSteps`), or the group's risk, which the risk engine stores apart.
 */
const GROUP_FIELDS: Readonly<Record<string, GroupField>> = {
  // The row shows the main entity's name, as stored.
  [NAME_FIELD]: { group: NAME_FIELD },
  // Highest level in the group.
  [CRITICALITY_FIELD]: { group: CRITICALITY_FIELD },
  [SOURCE_FIELD]: { group: SOURCE_FIELD, multiValued: true },
  [WATCHLISTS_FIELD]: { group: WATCHLISTS_FIELD, multiValued: true },
  [RISK_LEVEL_FIELD]: {
    group: `COALESCE(${RESOLUTION_RISK_LEVEL_FIELD}, ${RISK_LEVEL_FIELD})`,
  },
  [RISK_SCORE_NORM_FIELD]: {
    group: `COALESCE(${RESOLUTION_RISK_SCORE_FIELD}, ${RISK_SCORE_NORM_FIELD})`,
  },
};

const RANGE_OPERATORS: Readonly<Record<string, string>> = {
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
};

/** What the KQL parser puts where a value has a `*` (not exported). */
const WILDCARD_MARKER = nodeTypes.wildcard.buildNode('*').value;

const unsupported = (): never => {
  throw new Error('Unsupported search');
};

/** The field, and what to read for it: its own stored value, or the group's. */
const getGroupField = (
  fieldNode: KueryNode,
  mode: Mode
): { field: string; value: string; multiValued: boolean } => {
  const field = nodeTypes.literal.isNode(fieldNode) ? String(fieldNode.value) : undefined;
  if (field === undefined || !Object.hasOwn(GROUP_FIELDS, field)) return unsupported();
  const { group, multiValued = false } = GROUP_FIELDS[field];
  return { field, value: mode === 'own' ? field : group, multiValued };
};

const getNumber = (valueNode: KueryNode): number => {
  const { value } = valueNode;
  const parsed = typeof value === 'string' && value !== '' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : unsupported();
};

/** `LIKE` takes `*` and `?` as wildcards; a search only `*`, so the rest is escaped. */
const toLikePattern = (value: string): string =>
  value
    .split(WILDCARD_MARKER)
    .map((part) => part.replace(/[\\*?]/g, '\\$&'))
    .join('*');

const convertIs = (node: KueryNode, mode: Mode): string => {
  const [fieldNode, valueNode] = node.arguments;
  const { field, value, multiValued } = getGroupField(fieldNode, mode);

  if (nodeTypes.wildcard.isNode(valueNode)) {
    if (nodeTypes.wildcard.isLoneWildcard(valueNode)) return `${value} IS NOT NULL`;
    if (multiValued) return unsupported();
    return `${value} LIKE ${escapeStringValue(toLikePattern(valueNode.value))}`;
  }
  if (!nodeTypes.literal.isNode(valueNode)) return unsupported();

  if (field === RISK_SCORE_NORM_FIELD) return `${value} == ${getNumber(valueNode)}`;
  const literal = escapeStringValue(`${valueNode.value}`);
  return multiValued ? `MV_CONTAINS(${value}, ${literal})` : `${value} == ${literal}`;
};

const convertRange = (node: KueryNode, mode: Mode): string => {
  const [fieldNode, operator, valueNode] = node.arguments;
  const { field, value } = getGroupField(fieldNode, mode);
  const esqlOperator = RANGE_OPERATORS[operator];
  if (field !== RISK_SCORE_NORM_FIELD || !esqlOperator) return unsupported();
  return `${value} ${esqlOperator} ${getNumber(valueNode)}`;
};

const convertNode = (node: KueryNode, mode: Mode): string => {
  switch (node.function) {
    case 'and':
    case 'or': {
      const operator = node.function.toUpperCase();
      return `(${node.arguments
        .map((argument: KueryNode) => convertNode(argument, mode))
        .join(` ${operator} `)})`;
    }
    case 'not':
      // A missing value never matches, so NOT of it does, as in KQL.
      return `COALESCE(NOT (${convertNode(node.arguments[0], mode)}), true)`;
    case 'is':
      return convertIs(node, mode);
    case 'range':
      return convertRange(node, mode);
    default:
      return unsupported();
  }
};

/** The search as ES|QL conditions; `undefined` if any part is not a KQL test on a group field. */
export const translateSearch = (kql: string): ResolvedEntityConditions | undefined => {
  try {
    const root = fromKueryExpression(kql);
    return { own: convertNode(root, 'own'), group: convertNode(root, 'group') };
  } catch {
    return undefined;
  }
};
