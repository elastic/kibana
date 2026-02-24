/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityMaintainerConfig, EntityMaintainerTaskEntry } from './types';
import { EntityMaintainerTaskStatus } from './types';

export class EntityMaintainersRegistry {
  private readonly tasks = new Map<string, EntityMaintainerConfig>();

  hasId(id: string): boolean {
    return this.tasks.has(id);
  }

  register({ id, interval }: Pick<EntityMaintainerTaskEntry, 'id' | 'interval'>): void {
    this.tasks.set(id, {
      interval,
      taskStatus: EntityMaintainerTaskStatus.NOT_STARTED,
    });
  }

  update(
    id: string,
    overrides: Partial<Omit<EntityMaintainerConfig, 'id'>>
  ): void {
    const existing = this.tasks.get(id);
    if (!existing) {
      return;
    }
    this.tasks.set(id, { ...existing, ...overrides });
  }

  getAll(): EntityMaintainerTaskEntry[] {
    return Array.from(this.tasks.entries()).map(([id, entry]) => ({
      id,
      ...entry,
    }));
  }
}

export const entityMaintainersRegistry = new EntityMaintainersRegistry();
