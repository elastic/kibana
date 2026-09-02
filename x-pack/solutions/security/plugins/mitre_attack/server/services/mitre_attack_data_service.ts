/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import { loadMitreArtifact } from '@kbn/security-mitre-attack-server';
import { MITRE_ATTACK_ENTITY_SO_TYPE } from '../saved_objects';
import { buildSoId, summarizeEntityCounts } from './utils';

const BULK_CREATE_BATCH_SIZE = 500;

export class MitreAttackDataService {
  private readonly logger: Logger;

  /** True once a population run has completed with zero errors; gates the early return in populate() and ensureInitialized(). */
  private initialized = false;

  /** True while a population run is in flight; prevents concurrent runs from stacking. */
  private isInitializing = false;

  /** The in-flight run, handed to concurrent callers so they await the same population rather than starting another. */
  private inflightPopulation: Promise<boolean> | undefined;

  /** Type-scoped internal repository supplied by initialize() at plugin start; undefined until then. */
  private savedObjectsRepository: ISavedObjectsRepository | undefined;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /** Supplies the internal repository; must be called before populate(). */
  public initialize(savedObjectsRepository: ISavedObjectsRepository): void {
    this.savedObjectsRepository = savedObjectsRepository;
  }

  public get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Loads all MITRE ATT&CK entities into the Saved Objects index.
   * Returns true on success, false on failure. Never rejects.
   * Concurrent calls while a run is in progress return the same in-flight promise.
   */
  public populate(): Promise<boolean> {
    if (this.initialized) {
      return Promise.resolve(true);
    }
    if (this.isInitializing && this.inflightPopulation !== undefined) {
      return this.inflightPopulation;
    }
    this.isInitializing = true;
    this.inflightPopulation = this.runPopulation();
    return this.inflightPopulation;
  }

  /**
   * Resolves true if already initialized, otherwise attempts populate().
   * Respects the in-flight guard so concurrent callers await the same run.
   */
  public ensureInitialized(): Promise<boolean> {
    if (this.initialized) {
      return Promise.resolve(true);
    }
    return this.populate();
  }

  private async runPopulation(): Promise<boolean> {
    try {
      if (this.savedObjectsRepository === undefined) {
        throw new Error(
          'SavedObjects repository not initialized; call initialize() before populate()'
        );
      }

      const entities = loadMitreArtifact();
      const chunks = chunk(entities, BULK_CREATE_BATCH_SIZE);
      const allErrors: Array<{ id: string; message: string }> = [];

      for (const batch of chunks) {
        const objects = batch.map((entity) => ({
          id: buildSoId({
            framework: entity.framework,
            frameworkVersion: entity.framework_version,
            id: entity.id,
          }),
          type: MITRE_ATTACK_ENTITY_SO_TYPE,
          attributes: entity,
        }));

        const bulkResponse = await this.savedObjectsRepository.bulkCreate(objects, {
          overwrite: true,
        });

        for (const savedObject of bulkResponse.saved_objects) {
          if (isSavedObjectErrorResult(savedObject)) {
            allErrors.push({
              id: savedObject.id,
              message: `[${savedObject.error.statusCode}] ${savedObject.error.message}`,
            });
          }
        }
      }

      if (allErrors.length > 0) {
        // Population can fail for every entity at once. Log a bounded sample
        // rather than the full list so one bad run cannot flood the log.
        // The total count is always reported alongside it.
        const firstFailures = allErrors
          .slice(0, 5)
          .map(({ id, message }) => `${id}: ${message}`)
          .join('; ');
        this.logger.error(
          `Failed to populate MITRE ATT&CK data: ${allErrors.length} error(s) out of ${entities.length} entities. First failures: ${firstFailures}`
        );
        return false;
      }

      this.initialized = true;
      this.logger.info(
        `MITRE ATT&CK data populated: ${entities.length} entities. ${summarizeEntityCounts(
          entities
        )}`
      );
      return true;
    } catch (err) {
      this.logger.error(
        `Failed to populate MITRE ATT&CK data: ${err instanceof Error ? err.message : String(err)}`
      );
      return false;
    } finally {
      this.isInitializing = false;
    }
  }
}
