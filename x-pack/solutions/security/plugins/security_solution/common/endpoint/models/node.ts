/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolverNode } from '../types';
import { firstNonNullValue } from './ecs_safety_helpers';

/**
 * These functions interact with the generic resolver node structure that does not define a specific format for the data
 * returned by Elasticsearch. These functions are similar to the events.ts model's function except that they do not
 * assume that the data will conform to a structure like an Endpoint or LegacyEndgame event.
 */

/**
 * @description - Extract the first non null value from the nodeID depending on the datasource. Returns
 * undefined if the field was never set.
 */
export function nodeID(node: ResolverNode): string | undefined {
  return node?.id ? String(firstNonNullValue(node.id)) : undefined;
}

/**
 * @description - Provides the parent for the given node
 */
export function parentId(node: ResolverNode): string | undefined {
  return node?.parent ? String(firstNonNullValue(node?.parent)) : undefined;
}

/**
 * The `@timestamp` for the event, as a `Date` object.
 * If `@timestamp` couldn't be parsed as a `Date`, returns `undefined`.
 */
export function timestampAsDate(node: ResolverNode): Date | undefined {
  const value = nodeDataTimestamp(node);
  if (value === undefined) {
    return undefined;
  }

  const date = new Date(value);
  // Check if the date is valid
  if (isFinite(date.getTime())) {
    return date;
  } else {
    return undefined;
  }
}

/**
 * Extracts the first non null value from the `@timestamp` field in the node data attribute.
 */
export function nodeDataTimestamp(node: ResolverNode): undefined | number | string {
  return firstNonNullValue(node?.data['@timestamp']);
}

/**
 * @description - Extract the first non null value from the node name depending on the datasource. If it was never set
 * default to the ID, and if no ID, then undefined
 */
export function nodeName(node: ResolverNode): string | undefined {
  return node?.name ? String(firstNonNullValue(node.name)) : undefined;
}
