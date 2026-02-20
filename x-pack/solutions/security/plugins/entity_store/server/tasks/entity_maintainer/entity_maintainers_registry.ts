/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityMaintainerConfig, EntityMaintainerTaskEntry } from './types';

export class EntityMaintainersRegistry {
  private readonly tasks = new Map<string, EntityMaintainerConfig>();

  update({ id, interval }: EntityMaintainerTaskEntry): void {
    this.tasks.set(id, { interval });
  }

  getAll(): EntityMaintainerTaskEntry[] {
    return Array.from(this.tasks.entries()).map(([id, { interval }]) => ({
      id,
      interval,
    }));
  }
}

export const entityMaintainersRegistry = new EntityMaintainersRegistry();
