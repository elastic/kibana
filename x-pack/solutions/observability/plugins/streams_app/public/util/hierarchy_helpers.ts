/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamDefinition, isUnwiredStreamDefinition } from '@kbn/streams-schema';

export function getIndexPatterns(definition: StreamDefinition | undefined) {
  if (!definition) {
    return undefined;
  }
  if (!isUnwiredStreamDefinition(definition)) {
    return [definition.name];
  }
  const isRoot = definition.name.indexOf('.') === -1;
  const dataStreamOfDefinition = definition.name;
  return isRoot
    ? [dataStreamOfDefinition, `${dataStreamOfDefinition}.*`]
    : [`${dataStreamOfDefinition}*`];
}
