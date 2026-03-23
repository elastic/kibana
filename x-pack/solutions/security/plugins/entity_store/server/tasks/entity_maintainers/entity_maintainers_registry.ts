/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityMaintainerRegistryData, EntityMaintainerTaskEntry } from './types';

export class EntityMaintainersRegistry {
  private readonly tasks = new Map<string, EntityMaintainerRegistryData>();

  hasId(id: string): boolean {
    return this.tasks.has(id);
  }

  get(id: string): EntityMaintainerTaskEntry | undefined {
    const config = this.tasks.get(id);
    if (!config) {
      return undefined;
    }
    return { id, ...config };
  }

  register({ id, interval, description }: EntityMaintainerTaskEntry): void {
    this.tasks.set(id, {
      interval,
      description,
    });
  }

  getAll(): EntityMaintainerTaskEntry[] {
    return Array.from(this.tasks.entries()).map(([id, entry]) => ({
      id,
      ...entry,
    }));
  }
}

export const entityMaintainersRegistry = new EntityMaintainersRegistry();
