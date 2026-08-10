/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EntityMaintainerLifecycle,
  EntityMaintainerRegistration,
  EntityMaintainerTaskEntry,
  EntityMaintainerRegistryValue,
} from './types';

export class EntityMaintainersRegistry {
  private readonly entries = new Map<string, EntityMaintainerRegistryValue>();

  hasId(id: string): boolean {
    return this.entries.has(id);
  }

  get(id: string): EntityMaintainerTaskEntry {
    return this.getEntryOrThrow(id).task;
  }

  getLifecycle(id: string): EntityMaintainerLifecycle {
    return this.getEntryOrThrow(id).lifecycle;
  }

  register(entry: EntityMaintainerRegistration): void {
    this.entries.set(entry.id, {
      task: {
        id: entry.id,
        interval: entry.interval,
        description: entry.description,
        minLicense: entry.minLicense,
      },
      lifecycle: {
        run: entry.run,
        setup: entry.setup,
        initialState: entry.initialState,
      },
    });
  }

  getAll(): EntityMaintainerTaskEntry[] {
    return Array.from(this.entries.values(), ({ task }) => task);
  }

  private getEntryOrThrow(id: string): EntityMaintainerRegistryValue {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`Entity maintainer not found: ${id}`);
    }
    return entry;
  }
}

export const entityMaintainersRegistry = new EntityMaintainersRegistry();
