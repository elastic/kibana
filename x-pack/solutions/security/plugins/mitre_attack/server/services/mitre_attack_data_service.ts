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
import type { MitreFramework } from '@kbn/security-mitre-attack-common';
import { MITRE_ATTACK_ENTITY_SO_TYPE, buildSoId } from '@kbn/security-mitre-attack-common';
import { summarizeEntityCounts } from './utils';

const BULK_CREATE_BATCH_SIZE = 500;

/** Minimum time after a failed population before populate() will try again. */
export const POPULATION_RETRY_COOLDOWN_MS = 60 * 1000;

type InitializationState =
  | { status: 'idle' }
  | { status: 'initializing'; promise: Promise<boolean>; servesPartialData: boolean }
  | { status: 'ready' }
  | { status: 'degraded'; failedAt: number }
  | { status: 'failed'; failedAt: number };

export interface MitreDataStatus {
  status: 'idle' | 'initializing' | 'ready' | 'degraded' | 'failed';
  lastError?: string;
  lastAttemptAt?: number;
  counts?: Partial<Record<MitreFramework, number>>;
}

export class MitreAttackDataService {
  private readonly logger: Logger;

  /** Tracks the population lifecycle; transitions idle → initializing → ready | degraded (partial write, retried after cooldown) | failed. */
  private state: InitializationState = { status: 'idle' };

  /** Type-scoped internal repository supplied by initialize() at plugin start; undefined until then. */
  private savedObjectsRepository: ISavedObjectsRepository | undefined;

  private lastError?: string;
  private lastAttemptAt?: number;
  private entityCounts?: Partial<Record<MitreFramework, number>>;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /** Supplies the internal repository; must be called before populate(). */
  public initialize(savedObjectsRepository: ISavedObjectsRepository): void {
    this.savedObjectsRepository = savedObjectsRepository;
  }

  public get isInitialized(): boolean {
    return this.state.status === 'ready' || this.state.status === 'degraded';
  }

  /** Status reflects the data callers are served, so a repair serving partial data reports `degraded`. */
  public getStatus(): MitreDataStatus {
    const isServingPartialData =
      this.state.status === 'initializing' && this.state.servesPartialData;
    const result: MitreDataStatus = {
      status: isServingPartialData ? 'degraded' : this.state.status,
    };
    if (this.lastError !== undefined) {
      result.lastError = this.lastError;
    }
    if (this.lastAttemptAt !== undefined) {
      result.lastAttemptAt = this.lastAttemptAt;
    }
    if (this.entityCounts !== undefined) {
      result.counts = this.entityCounts;
    }
    return result;
  }

  /**
   * Loads all bundled MITRE entities (every framework and version in the artifact) into
   * the Saved Objects index.
   * Returns true on success, false on failure. Never rejects.
   * Concurrent calls while a run is in progress return the same in-flight promise.
   */
  public populate(): Promise<boolean> {
    if (this.state.status === 'ready') {
      return Promise.resolve(true);
    }
    if (this.state.status === 'initializing') {
      return this.state.promise;
    }
    if (this.state.status === 'failed' || this.state.status === 'degraded') {
      const elapsedMs = Date.now() - this.state.failedAt;
      if (elapsedMs < POPULATION_RETRY_COOLDOWN_MS) {
        this.logger.debug(
          `Skipping MITRE data population retry; last attempt ${
            this.state.status === 'degraded' ? 'was incomplete' : 'failed'
          } ${Math.round(elapsedMs / 1000)}s ago`
        );
        return Promise.resolve(this.state.status === 'degraded');
      }
    }
    const wasDegraded = this.state.status === 'degraded';
    // runPopulation runs synchronously up to its first await; a sync failure would set
    // `failed` and then be overwritten by `initializing` if the state were assigned afterwards.
    const promise = Promise.resolve().then(() => this.runPopulation(wasDegraded));
    this.state = { status: 'initializing', promise, servesPartialData: wasDegraded };
    return promise;
  }

  /**
   * Resolves true if already initialized, otherwise attempts populate().
   * Respects the in-flight guard so concurrent callers await the same run.
   */
  public ensureInitialized(): Promise<boolean> {
    if (this.state.status === 'ready') {
      return Promise.resolve(true);
    }
    if (this.state.status === 'degraded') {
      // Repair in the background (subject to the cooldown) while serving the written data.
      void this.populate();
      return Promise.resolve(true);
    }
    if (this.state.status === 'initializing' && this.state.servesPartialData) {
      return Promise.resolve(true);
    }
    return this.populate();
  }

  /**
   * Called by the data client when a list() call returns zero entities despite `ready` state.
   * Flips to `degraded` so the next ensureInitialized() triggers a background repair.
   */
  public reportEmptyWhileReady(): void {
    if (this.state.status !== 'ready') {
      return;
    }
    this.logger.warn(
      'MITRE data reported empty while state is ready; saved objects may have been deleted. Scheduling repopulation.'
    );
    this.state = { status: 'degraded', failedAt: Date.now() - POPULATION_RETRY_COOLDOWN_MS };
    void this.populate();
  }

  private async runPopulation(wasDegraded: boolean): Promise<boolean> {
    try {
      if (this.savedObjectsRepository === undefined) {
        throw new Error(
          'SavedObjects repository not initialized; call initialize() before populate()'
        );
      }

      this.lastAttemptAt = Date.now();
      const entities = loadMitreArtifact();
      const chunks = chunk(entities, BULK_CREATE_BATCH_SIZE);
      const allErrors: Array<{ id: string; message: string }> = [];
      const soIds = new Map<(typeof entities)[number], string>();

      for (const batch of chunks) {
        const objects = batch.map((entity) => {
          const id = buildSoId({
            framework: entity.framework,
            frameworkVersion: entity.framework_version,
            id: entity.id,
          });
          soIds.set(entity, id);
          return { id, type: MITRE_ATTACK_ENTITY_SO_TYPE, attributes: entity };
        });

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

      // Log a bounded sample rather than the full list so one bad run cannot flood the log.
      // The total count is always reported alongside it.
      const firstFailures = allErrors
        .slice(0, 5)
        .map(({ id, message }) => `${id}: ${message}`)
        .join('; ');

      if (allErrors.length === entities.length) {
        this.logger.error(
          `Failed to populate MITRE data: ${allErrors.length} error(s) out of ${entities.length} entities. First failures: ${firstFailures}`
        );
        this.lastError = 'All entities failed to write';
        // A failed repair must not take already-served data offline.
        this.state = { status: wasDegraded ? 'degraded' : 'failed', failedAt: Date.now() };
        return false;
      }

      // Only successfully written entities are counted.
      const failedIds = new Set(allErrors.map(({ id }) => id));
      const counts: Partial<Record<MitreFramework, number>> = {};
      for (const entity of entities) {
        if (failedIds.has(soIds.get(entity) ?? '')) {
          continue;
        }
        counts[entity.framework as MitreFramework] =
          (counts[entity.framework as MitreFramework] ?? 0) + 1;
      }

      if (allErrors.length > 0) {
        this.logger.warn(
          `MITRE data partially populated: ${allErrors.length} error(s) out of ${entities.length} entities. First failures: ${firstFailures}`
        );
        this.lastError = `${allErrors.length} of ${entities.length} entities failed`;
        this.entityCounts = counts;
        // Serve what was written; a retry after the cooldown overwrites the gaps.
        this.state = { status: 'degraded', failedAt: Date.now() };
        return true;
      }

      this.entityCounts = counts;
      this.lastError = undefined;
      this.state = { status: 'ready' };
      // Counts are reported per framework and version so a framework that mapped
      // incorrectly is not hidden inside the combined total.
      this.logger.info(
        `MITRE data populated: ${entities.length} entities (${summarizeEntityCounts(entities)})`
      );
      return true;
    } catch (err) {
      this.logger.error(
        `Failed to populate MITRE data: ${err instanceof Error ? err.message : String(err)}`
      );
      this.lastError = err instanceof Error ? err.message : String(err);
      this.state = { status: wasDegraded ? 'degraded' : 'failed', failedAt: Date.now() };
      return false;
    }
  }
}
