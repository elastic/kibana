/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  StreamDefinition,
  WiredStreamDefinition,
  isUnwiredStreamDefinition,
  isWiredStreamDefinition,
} from '@kbn/streams-schema';
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
    currentStreamDefinition.ingest.wired.fields,
    nextStreamDefinition.ingest.wired.fields
  );

  if (hasFieldChanges) {
    throw new RootStreamImmutabilityException('Root stream fields cannot be changed');
  }

  const hasProcessingChanges = !isEqual(
    currentStreamDefinition.ingest.processing,
    nextStreamDefinition.ingest.processing
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
  const fromUnwiredToWired =
    isUnwiredStreamDefinition(currentStreamDefinition) &&
    isWiredStreamDefinition(nextStreamDefinition);

  if (fromUnwiredToWired) {
    throw new MalformedStream('Cannot change unwired stream to wired stream');
  }

  const fromWiredToUnwired =
    isWiredStreamDefinition(currentStreamDefinition) &&
    isUnwiredStreamDefinition(nextStreamDefinition);

  if (fromWiredToUnwired) {
    throw new MalformedStream('Cannot change wired stream to unwired stream');
  }
}

/**
 * Validates whether no children are removed (which is not allowed via updates)
 */
export function validateStreamChildrenChanges(
  currentStreamDefinition: WiredStreamDefinition,
  nextStreamDefinition: WiredStreamDefinition
) {
  const existingChildren = currentStreamDefinition.ingest.routing.map(
    (routingDefinition) => routingDefinition.destination
  );

  const nextChildren = nextStreamDefinition.ingest.routing.map(
    (routingDefinition) => routingDefinition.destination
  );

  const removedChildren = difference(existingChildren, nextChildren);

  if (removedChildren.length) {
    throw new MalformedChildren('Cannot remove children from a stream via updates');
  }
}
