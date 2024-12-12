/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamDefinition } from '@kbn/streams-plugin/common';

export function getIndexPatterns(definition: StreamDefinition | undefined) {
  if (!definition) {
    return undefined;
  }
  if (!definition.managed) {
    return [definition.id];
  }
  const isRoot = definition?.id?.indexOf('.') === -1;
  const dataStreamOfDefinition = definition?.id;
  return isRoot
    ? [dataStreamOfDefinition, `${dataStreamOfDefinition}.*`]
    : [`${dataStreamOfDefinition}*`];
}
