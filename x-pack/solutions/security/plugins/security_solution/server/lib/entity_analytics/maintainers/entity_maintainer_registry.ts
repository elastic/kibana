/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityMaintainer } from './maintainer';

export class EntityMaintainerRegistry {
  private readonly entityMaintainerDefinitions: Map<string, EntityMaintainer> = new Map();

  public has(id: string): boolean {
    return this.entityMaintainerDefinitions.has(id);
  }

  public get(id: string): EntityMaintainer | undefined {
    return this.entityMaintainerDefinitions.get(id);
  }

  public register(definition: EntityMaintainer): void {
    this.entityMaintainerDefinitions.set(definition.id, definition);
  }
}
