/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type IngestHubVersion = 'blockUx' | 'skipUx';

type Listener = () => void;

interface VersionStore {
  _listeners: Set<Listener>;
  _version: IngestHubVersion;
  getSnapshot(): IngestHubVersion;
  setVersion(v: IngestHubVersion): void;
  subscribe(fn: Listener): () => void;
}

const getOrCreateStore = (): VersionStore => {
  const w = window as unknown as Record<string, unknown>;
  if (w.__ingestHubVersionStore) {
    return w.__ingestHubVersionStore as VersionStore;
  }
  const listeners = new Set<Listener>();
  let version: IngestHubVersion = 'blockUx';
  const store: VersionStore = {
    _listeners: listeners,
    _version: version,
    getSnapshot: () => version,
    setVersion: (v: IngestHubVersion) => {
      version = v;
      store._version = v;
      listeners.forEach((l) => l());
    },
    subscribe: (fn: Listener) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
  w.__ingestHubVersionStore = store;
  return store;
};

export const versionStore = getOrCreateStore();
