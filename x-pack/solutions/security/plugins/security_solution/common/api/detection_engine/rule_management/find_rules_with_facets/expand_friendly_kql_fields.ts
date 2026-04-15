/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression, toKqlExpression } from '@kbn/es-query';

/**
 * Maps user-facing friendly field names to the full saved-object attribute
 * paths expected by the KQL filter layer. Callers can use either form;
 * `expandFriendlyKqlFields` rewrites the short names before the filter
 * reaches the saved-objects client.
 */
export const KQL_FRIENDLY_FIELD_MAP: Readonly<Record<string, string>> = {
  name: 'alert.attributes.name',
  enabled: 'alert.attributes.enabled',
  tags: 'alert.attributes.tags',
  type: 'alert.attributes.params.type',
  ruleType: 'alert.attributes.alertTypeId',
  immutable: 'alert.attributes.params.immutable',
  isCustomized: 'alert.attributes.params.ruleSource.isCustomized',
  createdBy: 'alert.attributes.createdBy',
  updatedBy: 'alert.attributes.updatedBy',
  createdAt: 'alert.attributes.createdAt',
  updatedAt: 'alert.attributes.updatedAt',
  lastRunOutcome: 'alert.attributes.lastRun.outcome',
  lastRunStatus: 'alert.attributes.lastRun.status',
  index: 'alert.attributes.params.index',
  tacticId: 'alert.attributes.params.threat.tactic.id',
  tacticName: 'alert.attributes.params.threat.tactic.name',
  techniqueId: 'alert.attributes.params.threat.technique.id',
  techniqueName: 'alert.attributes.params.threat.technique.name',
  subtechniqueId: 'alert.attributes.params.threat.technique.subtechnique.id',
  subtechniqueName: 'alert.attributes.params.threat.technique.subtechnique.name',
};

/**
 * Recursively walks a KueryNode AST and rewrites any field literal whose value
 * is a known friendly name to its full saved-object path. Unknown field names
 * and unknown function types are passed through unchanged.
 */
const rewriteNode = (node: KueryNode): KueryNode => {
  if (node.type !== 'function') {
    return node;
  }

  switch (node.function) {
    case 'and':
    case 'or':
      return { ...node, arguments: node.arguments.map(rewriteNode) };

    case 'not':
      return { ...node, arguments: [rewriteNode(node.arguments[0])] };

    // Nested: first arg is the nested path (not a filterable field),
    // second arg is the sub-expression to recurse into.
    case 'nested':
      return { ...node, arguments: [node.arguments[0], rewriteNode(node.arguments[1])] };

    // Field-referencing nodes: rewrite the first argument if it is a known friendly name.
    case 'is':
    case 'range':
    case 'exists': {
      const fieldArg = node.arguments[0];
      if (fieldArg?.type === 'literal' && typeof fieldArg.value === 'string') {
        const expanded = KQL_FRIENDLY_FIELD_MAP[fieldArg.value];
        if (expanded) {
          return {
            ...node,
            arguments: [{ ...fieldArg, value: expanded }, ...node.arguments.slice(1)],
          };
        }
      }
      return node;
    }

    default:
      return node;
  }
};

/**
 * Expands friendly field names in a KQL filter string to their full
 * `alert.attributes.*` paths. Fields that are already fully qualified
 * are left untouched. Quoted string values are never modified.
 */
export const expandFriendlyKqlFields = (filter: string): string => {
  if (!filter) {
    return filter;
  }
  return toKqlExpression(rewriteNode(fromKueryExpression(filter)));
};
