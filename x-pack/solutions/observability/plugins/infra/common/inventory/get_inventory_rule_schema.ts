/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  findInventoryFields,
  getFieldByType,
  type DataSchemaFormat,
  type InventoryItemType,
} from '@kbn/metrics-data-access-plugin/common';

/**
 * Schema an Inventory Threshold rule evaluates, and the flyout preview requests.
 * Returns the schema an Inventory Threshold rule should use based on the node type and schema selection settings.
 */
export const getInventoryRuleSchema = (
  nodeType: InventoryItemType,
  schema: DataSchemaFormat | null | undefined,
  isPodSchemaSelectorEnabled: boolean = false
): DataSchemaFormat | undefined => {
  if (nodeType === 'pod') {
    // A pod rule saved before the Schema control existed stores no schema and is ECS.
    // Unlike Hosts, pods must not fall through to `undefined`: that drops the
    // `event.module: kubernetes` node filter and the rule starts matching OTel documents.
    return isPodSchemaSelectorEnabled ? schema ?? 'ecs' : 'ecs';
  }

  return schema ?? undefined;
};

/**
 * Alerts-as-data grouping field for an Inventory Threshold rule.
 *
 * Uses the same schema as rule evaluation. `getFieldByType` stays the gate for
 * AWS types, which have no grouping field.
 */
export const getInventoryAlertGroupingField = (
  nodeType: InventoryItemType,
  schema: DataSchemaFormat | null | undefined,
  isPodSchemaSelectorEnabled: boolean = false
): string | undefined => {
  if (getFieldByType(nodeType) === undefined) {
    return undefined;
  }

  return findInventoryFields(
    nodeType,
    getInventoryRuleSchema(nodeType, schema, isPodSchemaSelectorEnabled)
  ).id;
};
