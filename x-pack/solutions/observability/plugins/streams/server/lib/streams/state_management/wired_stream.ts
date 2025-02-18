/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  WiredStreamDefinition,
  WiredStreamUpsertRequest,
  isWiredStreamDefinition,
} from '@kbn/streams-schema';
import { cloneDeep } from 'lodash';
import { StreamsStorageClient } from '../service';
import { State } from './state';

// Or should this be Ingest stream?
export interface UpsertWiredStreamChange {
  stream_type: 'wired';
  change: 'upsert';
  request: WiredStreamUpsertRequest;
}

export interface DeleteWiredStreamChange {
  stream_type: 'wired';
  change: 'delete';
  name: string;
}

export type WiredStreamChange = UpsertWiredStreamChange | DeleteWiredStreamChange;

// This class should live somewhere else later
export class WiredStream {
  private definition: WiredStreamDefinition;

  constructor(definition: WiredStreamDefinition) {
    this.definition = definition;
  }

  clone() {
    // Do I need to deep clone the definition here or would a reference or shallow clone suffice?
    return new WiredStream(cloneDeep(this.definition));
  }

  static applyChange(requestedChange: WiredStreamChange, newState: State) {
    switch (requestedChange.change) {
      case 'upsert':
        WiredStream.applyUpsert(requestedChange, newState);
        break;
      case 'delete':
        WiredStream.applyDelete(requestedChange, newState);
        break;
    }
  }

  private static applyUpsert(requestedChange: UpsertWiredStreamChange, newState: State) {
    throw new Error('Method not implemented.');
  }

  private static applyDelete(requestedChange: DeleteWiredStreamChange, newState: State) {
    throw new Error('Method not implemented.');
  }

  static async all(storageClient: StreamsStorageClient): Promise<WiredStream[]> {
    const streamsSearchResponse = await storageClient.search({
      size: 10000, // Paginate if there are more...
      sort: [{ name: 'asc' }],
      track_total_hits: false,
    });

    return streamsSearchResponse.hits.hits
      .filter(
        // Replace the filter with a query for type instead
        (hit) => isWiredStreamDefinition(hit._source) // Do I need to parse the schema here?
      )
      .map((hit) => new WiredStream(hit._source as WiredStreamDefinition)); // Improve this type cast later
  }
}
