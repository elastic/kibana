/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GroupStreamDefinition,
  GroupStreamUpsertRequest,
  isGroupStreamDefinition,
} from '@kbn/streams-schema';
import { cloneDeep } from 'lodash';
import { IScopedClusterClient } from '@kbn/core/server';
import { StreamsStorageClient } from '../service';
import { State } from './state';
import { Stream, ValidationResult } from './types';

export interface UpsertGroupStreamChange {
  stream_type: 'group';
  change: 'upsert';
  request: GroupStreamUpsertRequest;
}

export interface DeleteGroupStreamChange {
  stream_type: 'group';
  change: 'delete';
  name: string;
}

export type GroupStreamChange = UpsertGroupStreamChange | DeleteGroupStreamChange;

// This class should live somewhere else later
// These classes probably have some shared interface that we should extract so that it is clear what new stream types need to adhere to.
export class GroupStream implements Stream {
  private definition: GroupStreamDefinition;

  constructor(definition: GroupStreamDefinition) {
    this.definition = definition;
  }

  clone() {
    // Do I need to deep clone the definition here or would a reference or shallow clone suffice?
    return new GroupStream(cloneDeep(this.definition));
  }

  async validate(
    desiredState: State,
    startingState: State,
    scopedClusterClient: IScopedClusterClient
  ): Promise<ValidationResult> {
    throw new Error('Method not implemented.');
  }

  static applyChange(requestedChange: GroupStreamChange, newState: State) {
    switch (requestedChange.change) {
      case 'upsert':
        GroupStream.applyUpsert(requestedChange, newState);
        break;
      case 'delete':
        GroupStream.applyDelete(requestedChange, newState);
        break;
    }
  }

  private static applyUpsert(requestedChange: UpsertGroupStreamChange, newState: State) {
    throw new Error('Method not implemented.');
  }

  private static applyDelete(requestedChange: DeleteGroupStreamChange, newState: State) {
    throw new Error('Method not implemented.');
  }

  static async all(storageClient: StreamsStorageClient): Promise<GroupStream[]> {
    const streamsSearchResponse = await storageClient.search({
      size: 10000, // Paginate if there are more...
      sort: [{ name: 'asc' }],
      track_total_hits: false,
    });

    return streamsSearchResponse.hits.hits
      .filter(
        // Replace the filter with a query for type instead
        (hit) => isGroupStreamDefinition(hit._source) // Do I need to parse the schema here?
      )
      .map((hit) => new GroupStream(hit._source as GroupStreamDefinition)); // Improve this type cast later
  }
}
