/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WiredStreamDefinition } from '@kbn/streams-schema';
import { isEqual } from 'lodash';
import { RootStreamImmutabilityException } from '../errors';

/*
 * Changes to mappings (fields) and processing rules are not allowed on the root stream.
 * Changes to routing rules are allowed.
 */
export function validateRootStreamChanges(
  currentStreamDefinition: WiredStreamDefinition,
  nextStreamDefinition: WiredStreamDefinition
) {
  const hasFieldChanges = !isEqual(
    currentStreamDefinition.stream.ingest.wired.fields,
    nextStreamDefinition.stream.ingest.wired.fields
  );

  if (hasFieldChanges) {
    throw new RootStreamImmutabilityException('Root stream fields cannot be changed');
  }

  const hasProcessingChanges = !isEqual(
    currentStreamDefinition.stream.ingest.processing,
    nextStreamDefinition.stream.ingest.processing
  );

  if (hasProcessingChanges) {
    throw new RootStreamImmutabilityException('Root stream processing rules cannot be changed');
  }
}
