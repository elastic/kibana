/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InheritedStreamLifecycle, WiredStreamDefinition } from '@kbn/streams-schema';
import { orderBy } from 'lodash';

export function findInheritedLifecycle(
  definition: WiredStreamDefinition,
  ancestors: WiredStreamDefinition[]
): InheritedStreamLifecycle | undefined {
  const originDefinition = orderBy(
    [...ancestors, definition],
    (parent) => parent.name.split('.').length,
    'asc'
  ).findLast(({ stream }) => stream.ingest.lifecycle);

  if (!originDefinition) {
    return undefined;
  }

  return { ...originDefinition.stream.ingest.lifecycle!, from: originDefinition.name };
}
