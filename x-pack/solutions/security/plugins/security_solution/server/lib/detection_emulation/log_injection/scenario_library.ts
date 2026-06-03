/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scenario Library — Phase 4
 *
 * In-memory + ES-backed scenario storage. Scenarios can be:
 * - Created from scratch (analyst or LLM authored)
 * - Generated from prebuilt rules (auto-inversion)
 * - Imported from JSON exports
 * - Stored in an ES index for persistence across restarts
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { v4 as uuidv4 } from 'uuid';
import type { Scenario, GroundTruth } from './scenario_schema';
import { validateScenario } from './scenario_schema';

// ─── Constants ─────────────────────────────────────────────────────────

const SCENARIO_INDEX = '.kibana-security-emulation-scenarios';
const GROUND_TRUTH_INDEX = '.kibana-security-emulation-ground-truth';

// ─── Scenario Library class ────────────────────────────────────────────

export class ScenarioLibrary {
  private readonly esClient: ElasticsearchClient;
  private readonly logger: Logger;

  constructor(esClient: ElasticsearchClient, logger: Logger) {
    this.esClient = esClient;
    this.logger = logger;
  }

  /**
   * Initialize ES indices for scenario and ground-truth storage.
   */
  async initialize(): Promise<void> {
    try {
      const scenarioExists = await this.esClient.indices.exists({ index: SCENARIO_INDEX });
      if (!scenarioExists) {
        await this.esClient.indices.create({
          index: SCENARIO_INDEX,
          settings: { 'index.hidden': true, 'index.auto_expand_replicas': '0-1' },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              description: { type: 'text' },
              techniqueIds: { type: 'keyword' },
              tags: { type: 'keyword' },
              version: { type: 'keyword' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
            },
          },
        });
      }

      const gtExists = await this.esClient.indices.exists({ index: GROUND_TRUTH_INDEX });
      if (!gtExists) {
        await this.esClient.indices.create({
          index: GROUND_TRUTH_INDEX,
          settings: { 'index.hidden': true, 'index.auto_expand_replicas': '0-1' },
          mappings: {
            properties: {
              scenarioId: { type: 'keyword' },
              executedAt: { type: 'date' },
              scenarioFingerprint: { type: 'keyword' },
            },
          },
        });
      }
    } catch (err) {
      this.logger.warn(
        `[scenario_library] Failed to initialize indices: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  /**
   * Save a scenario to ES. Creates or updates.
   */
  async save(scenario: Scenario): Promise<string> {
    const validated = validateScenario(scenario);
    const now = new Date().toISOString();

    validated.updatedAt = now;
    if (!validated.createdAt) {
      validated.createdAt = now;
    }

    await this.esClient.index({
      index: SCENARIO_INDEX,
      id: validated.id,
      document: validated,
      refresh: 'wait_for',
    });

    this.logger.debug(`[scenario_library] Saved scenario ${validated.id}`);
    return validated.id;
  }

  /**
   * Load a scenario by ID.
   */
  async get(id: string): Promise<Scenario | null> {
    try {
      const response = await this.esClient.get<Scenario>({
        index: SCENARIO_INDEX,
        id,
      });
      return response._source ?? null;
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.meta?.statusCode === 404) return null;
      throw err;
    }
  }

  /**
   * List all scenarios, optionally filtered by tags or technique IDs.
   */
  async list(options?: {
    tags?: string[];
    techniqueIds?: string[];
    limit?: number;
  }): Promise<Scenario[]> {
    const must: any[] = [];

    if (options?.tags?.length) {
      must.push({ terms: { tags: options.tags } });
    }
    if (options?.techniqueIds?.length) {
      must.push({ terms: { techniqueIds: options.techniqueIds } });
    }

    const response = await this.esClient.search<Scenario>({
      index: SCENARIO_INDEX,
      size: options?.limit ?? 100,
      query: must.length > 0 ? { bool: { must } } : { match_all: {} },
      sort: [{ updatedAt: 'desc' }],
    });

    return response.hits.hits.flatMap((hit) => (hit._source ? [hit._source] : []));
  }

  /**
   * Delete a scenario by ID.
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.esClient.delete({ index: SCENARIO_INDEX, id, refresh: 'wait_for' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Record a ground truth result after scenario execution.
   */
  async recordGroundTruth(gt: GroundTruth): Promise<string> {
    const id = uuidv4();
    await this.esClient.index({
      index: GROUND_TRUTH_INDEX,
      id,
      document: gt,
      refresh: 'wait_for',
    });
    this.logger.debug(`[scenario_library] Recorded ground truth for scenario ${gt.scenarioId}`);
    return id;
  }

  /**
   * Get ground truth records for a scenario.
   */
  async getGroundTruth(scenarioId: string): Promise<GroundTruth[]> {
    const response = await this.esClient.search<GroundTruth>({
      index: GROUND_TRUTH_INDEX,
      query: { term: { scenarioId } },
      sort: [{ executedAt: 'desc' }],
      size: 50,
    });

    return response.hits.hits.flatMap((hit) => (hit._source ? [hit._source] : []));
  }

  /**
   * Export scenarios as JSON (for import/export).
   */
  async exportScenarios(ids?: string[]): Promise<Scenario[]> {
    if (ids?.length) {
      const results = await Promise.all(ids.map((id) => this.get(id)));
      return results.filter((s): s is Scenario => s !== null);
    }
    return this.list();
  }

  /**
   * Import scenarios from JSON.
   */
  async importScenarios(
    scenarios: unknown[],
    options?: { overwrite?: boolean }
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const raw of scenarios) {
      try {
        const scenario = validateScenario(raw);
        const existing = await this.get(scenario.id);
        if (existing && !options?.overwrite) {
          skipped++;
          continue;
        }
        await this.save(scenario);
        imported++;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    return { imported, skipped, errors };
  }
}
