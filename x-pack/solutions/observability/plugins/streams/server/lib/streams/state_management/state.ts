/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { StreamsStorageClient } from '../service';
import { StreamActiveRecord, StreamChange, ValidationResult } from './types';
import { streamFromDefinition } from './stream_from_definition';
import { StreamsRepository } from './stream_repository';

export class State {
  streams: StreamsRepository;

  constructor(streams: StreamActiveRecord[]) {
    this.streams = new StreamsRepository(streams);
  }

  applyChanges(requestedChanges: StreamChange[]): State {
    // Optional: Expand requested changes to include automatic creation of missing streams
    const newState = this.clone();

    requestedChanges.forEach((change) => {
      const targetStream = this.streams.get(change.target);

      if (!targetStream) {
        if (change.type === 'delete') {
          throw new Error('Cannot delete non-existing stream');
        } else {
          const newStream = streamFromDefinition(change.request.stream);
          // Mark as changed
          // What if adding this stream to the state triggers other changes?
          this.streams.set(newStream.definition.name, newStream);
        }
      } else {
        if (change.type === 'delete') {
          targetStream.markForDeletion();
        } else {
          // Each stream type should check that the payload matches the existing stream type
          // What if this update needs to also change things in other streams?
          targetStream.update(change.request.stream);
        }
      }
    });

    return newState;
  }

  private clone(): State {
    const newStreams = this.streams.all().map((stream) => stream.clone());
    return new State(newStreams);
  }

  async validate(
    startingState: State,
    scopedClusterClient: IScopedClusterClient
  ): Promise<ValidationResult> {
    // Should I use allSettled here?
    const validationResults = await Promise.all(
      this.streams.all().map((stream) => stream.validate(this, startingState, scopedClusterClient))
    );

    const isValid = validationResults.every((validationResult) => validationResult.isValid);
    const errors = validationResults.flatMap((validationResult) => validationResult.errors);

    return {
      isValid,
      errors,
    };
  }

  changes() {
    // Find all streams marked as changed and order them by their impact level
  }

  async commitChanges() {
    // Based on .changes(), go off and do the actual work in ES
  }

  static async currentState(storageClient: StreamsStorageClient): Promise<State> {
    const streamsSearchResponse = await storageClient.search({
      size: 10000, // Paginate if there are more...
      sort: [{ name: 'asc' }],
      track_total_hits: false,
    });

    const streams = streamsSearchResponse.hits.hits.map(({ _source: definition }) =>
      streamFromDefinition(definition)
    );

    // State might need to be enriched with more information about these stream instances, like their existing ES resources
    return new State(streams);
  }
}
