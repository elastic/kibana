/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamDefinition, WiredStreamDefinition, isWiredStream } from '@kbn/streams-schema';
import { difference, isEqual } from 'lodash';
import { RootStreamImmutabilityException } from '../errors';
import { MalformedStream } from '../errors/malformed_stream';
import { MalformedChildren } from '../errors/malformed_children';

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

/**
 * Validates if the existing type is the same as the next type
 */
export function validateStreamTypeChanges(
  currentStreamDefinition: StreamDefinition,
  nextStreamDefinition: StreamDefinition
) {
  const fromIngestToWired =
    !isWiredStream(currentStreamDefinition) && isWiredStream(nextStreamDefinition);

  if (fromIngestToWired) {
    throw new MalformedStream('Cannot change ingest stream to wired stream');
  }

  const fromWiredToIngest =
    isWiredStream(currentStreamDefinition) && !isWiredStream(nextStreamDefinition);

  if (fromWiredToIngest) {
    throw new MalformedStream('Cannot change wired stream to ingest stream');
  }
}

/**
 * Validates whether no children are removed (which is not allowed via updates)
 */
export function validateStreamChildrenChanges(
  currentStreamDefinition: WiredStreamDefinition,
  nextStreamDefinition: WiredStreamDefinition
) {
  const existingChildren = currentStreamDefinition.stream.ingest.routing.map((child) => child.name);

  const nextChildren = nextStreamDefinition.stream.ingest.routing.map((child) => child.name);

  const removedChildren = difference(existingChildren, nextChildren);

  if (removedChildren.length) {
    throw new MalformedChildren('Cannot remove children from a stream via updates');
  }
}
