/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EntityMaintainerRegistryEntry,
  EntityMaintainerTaskEntry,
  EntityMaintainerTaskRunnerConfig,
} from './types';

export class EntityMaintainersRegistry {
  private readonly entries = new Map<string, EntityMaintainerRegistryEntry>();

  hasId(id: string): boolean {
    return this.entries.has(id);
  }

  get(id: string): EntityMaintainerTaskEntry | undefined {
    const entry = this.entries.get(id);
    if (!entry) {
      return undefined;
    }
    return toTaskEntry(entry);
  }

  getOrThrow(id: string): EntityMaintainerTaskEntry {
    return toTaskEntry(this.getEntryOrThrow(id));
  }

  getRunnerConfigOrThrow(id: string): EntityMaintainerTaskRunnerConfig {
    const { run, setup, initialState } = this.getEntryOrThrow(id);
    return { run, setup, initialState };
  }

  register(entry: EntityMaintainerRegistryEntry): void {
    this.entries.set(entry.id, entry);
  }

  getAll(): EntityMaintainerTaskEntry[] {
    return Array.from(this.entries.values()).map(toTaskEntry);
  }

  private getEntryOrThrow(id: string): EntityMaintainerRegistryEntry {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`Entity maintainer not found: ${id}`);
    }
    return entry;
  }
}

function toTaskEntry(entry: EntityMaintainerRegistryEntry): EntityMaintainerTaskEntry {
  const { id, interval, description, minLicense } = entry;
  return { id, interval, description, minLicense };
}

export const entityMaintainersRegistry = new EntityMaintainersRegistry();
