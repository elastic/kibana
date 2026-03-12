/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { Observation } from '../../../../../common/entity_analytics/lead_generation';
import type { ObservationModule, ObservationEntity } from './types';

/**
 * Registry that holds observation modules and orchestrates their execution.
 * Modules execute in descending priority order; a failing module is logged
 * and skipped so remaining modules can still run.
 */
export class ObservationModuleRegistry {
  private readonly modules = new Map<string, ObservationModule>();

  constructor(private readonly logger: Logger) {}

  /** Registers a module. Throws on duplicate IDs. */
  register(mod: ObservationModule): void {
    if (this.modules.has(mod.config.id)) {
      throw new Error(
        `Observation module "${mod.config.id}" is already registered. Module IDs must be unique.`
      );
    }
    this.modules.set(mod.config.id, mod);
    this.logger.debug(`Registered observation module: ${mod.config.id}`);
  }

  get(id: string): ObservationModule | undefined {
    return this.modules.get(id);
  }

  getAll(): ObservationModule[] {
    return [...this.modules.values()].sort((a, b) => b.config.priority - a.config.priority);
  }

  getEnabled(): ObservationModule[] {
    return this.getAll().filter((m) => m.isEnabled());
  }

  /** Runs all enabled modules and aggregates their observations. */
  async evaluate(entities: readonly ObservationEntity[]): Promise<Observation[]> {
    const enabledModules = this.getEnabled();
    const results: Observation[] = [];

    for (const mod of enabledModules) {
      try {
        const observations = await mod.collect(entities);
        results.push(...observations);
        this.logger.debug(`Module "${mod.config.id}" produced ${observations.length} observations`);
      } catch (err) {
        this.logger.error(`Observation module "${mod.config.id}" failed: ${err.message}`);
      }
    }

    return results;
  }
}
