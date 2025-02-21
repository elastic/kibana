/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamActiveRecord } from './types';

export class StreamsRepository {
  private streamsByName: Map<string, StreamActiveRecord>;

  constructor(streams: StreamActiveRecord[]) {
    this.streamsByName = new Map();
    streams.forEach((stream) => this.streamsByName.set(stream.definition.name, stream));
  }

  get(name: string) {
    return this.streamsByName.get(name);
  }

  set(name: string, stream: StreamActiveRecord) {
    this.streamsByName.set(name, stream);
  }

  all() {
    return Array.from(this.streamsByName.values());
  }

  has(name: string) {
    return this.streamsByName.has(name);
  }
}
