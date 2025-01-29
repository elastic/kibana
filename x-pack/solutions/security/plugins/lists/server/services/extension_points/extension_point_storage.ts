/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import {
  ExtensionPoint,
  ExtensionPointStorageClientInterface,
  ExtensionPointStorageInterface,
  NarrowExtensionPointToType,
} from './types';
import { ExtensionPointStorageClient } from './extension_point_storage_client';

export class ExtensionPointStorage implements ExtensionPointStorageInterface {
  private readonly store = new Map<ExtensionPoint['type'], Set<ExtensionPoint>>();

  constructor(private readonly logger: Logger) {}

  add(extension: ExtensionPoint): void {
    if (!this.store.has(extension.type)) {
      this.store.set(extension.type, new Set());
    }

    const extensionPointsForType = this.store.get(extension.type);

    if (extensionPointsForType) {
      extensionPointsForType.add(extension);
    }
  }

  clear(): void {
    this.store.clear();
  }

  get<T extends ExtensionPoint['type']>(
    extensionType: T
  ): Set<NarrowExtensionPointToType<T>> | undefined {
    const extensionDefinitions = this.store.get(extensionType);

    if (extensionDefinitions) {
      return extensionDefinitions as Set<NarrowExtensionPointToType<T>>;
    }

    return undefined;
  }

  /**
   * returns a client interface that does not expose the full set of methods available in the storage
   */
  getClient(): ExtensionPointStorageClientInterface {
    return new ExtensionPointStorageClient(this, this.logger);
  }
}
