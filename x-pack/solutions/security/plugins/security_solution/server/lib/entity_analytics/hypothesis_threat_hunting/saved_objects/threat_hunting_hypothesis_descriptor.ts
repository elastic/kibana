/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { asyncForEach } from '@kbn/std';
import type { ThreatHuntingHypothesis } from '../types';
import { threatHuntingHypothesisTypeName } from './threat_hunting_hypothesis_type';

interface ThreatHuntingHypothesisDependencies {
  savedObjectsClient: SavedObjectsClientContract;
}

export interface HypothesisUpsertResult {
  created: number;
  updated: number;
  results: Array<{ action: 'created' | 'updated'; hypothesis: ThreatHuntingHypothesis }>;
}

export class ThreatHuntingHypothesisDescriptorClient {
  constructor(private readonly deps: ThreatHuntingHypothesisDependencies) {}
  getSavedObjectId() {
    return `${threatHuntingHypothesisTypeName}`;
  }

  async get(id: string): Promise<ThreatHuntingHypothesis> {
    const { attributes } = await this.deps.savedObjectsClient.get<ThreatHuntingHypothesis>(
      threatHuntingHypothesisTypeName,
      id
    );
    return attributes;
  }

  async getAll(): Promise<Record<string, ThreatHuntingHypothesis>> {
    const savedObjectsResponse = await this.deps.savedObjectsClient.find<ThreatHuntingHypothesis>({
      type: threatHuntingHypothesisTypeName,
      perPage: 10000,
    });
    const results: Record<string, ThreatHuntingHypothesis> = {};
    for (const savedObject of savedObjectsResponse.saved_objects) {
      results[savedObject.id] = savedObject.attributes;
    }
    return results;
  }

  async delete(id: string) {
    await this.deps.savedObjectsClient.delete(threatHuntingHypothesisTypeName, id);
  }

  async bulkCreate(hypotheses: ThreatHuntingHypothesis[]) {
    const createdHypotheses = await this.deps.savedObjectsClient.bulkCreate(
      hypotheses.map((hypothesis) => ({
        type: threatHuntingHypothesisTypeName,
        attributes: { ...hypothesis },
      })),
      { refresh: 'wait_for', overwrite: false }
    );
    return createdHypotheses;
  }

  async update(updates: Partial<ThreatHuntingHypothesis>, soId: string) {
    const { attributes } = await this.deps.savedObjectsClient.update<ThreatHuntingHypothesis>(
      threatHuntingHypothesisTypeName,
      soId,
      updates,
      { refresh: 'wait_for' }
    );
    return { attributes, id: updates.hypothesisId };
  }

  async create(hypothesis: ThreatHuntingHypothesis) {
    const { attributes } = await this.deps.savedObjectsClient.create<ThreatHuntingHypothesis>(
      threatHuntingHypothesisTypeName,
      { ...hypothesis },
      { refresh: 'wait_for' }
    );
    return attributes;
  }

  bulkUpsert = async (hypotheses: ThreatHuntingHypothesis[]): Promise<HypothesisUpsertResult> => {
    if (hypotheses.length === 0) {
      return { created: 0, updated: 0, results: [] };
    }
    const existing = await this.getAll();
    const soIdByHypothesisId = this.mapHypothesisIdToSoId(existing);
    let createdCount = 0;
    let updatedCount = 0;
    const results: HypothesisUpsertResult['results'] = [];
    await asyncForEach(hypotheses, async (hypothesis) => {
      const existingHypothesis = Object.values(existing).find(
        (eh) => eh.hypothesisId === hypothesis.hypothesisId
      );
      if (!existingHypothesis) {
        try {
          await this.create(hypothesis);
          createdCount++;
          results.push({ action: 'created', hypothesis });
        } catch (error) {
          Error(
            `Threat Hunting Hypotheses Reconciliation Failed: Error creating Threat Hunting Hypothesis: ${error}`
          );
        }
      } else {
        try {
          const soId = soIdByHypothesisId.get(hypothesis.hypothesisId);
          if (!soId) {
            throw new Error(
              `Saved Object ID not found for Hypothesis ID: ${hypothesis.hypothesisId}`
            );
          }
          await this.update({ ...hypothesis }, soId);
          updatedCount++;
          results.push({ action: 'updated', hypothesis });
        } catch (error) {
          Error(
            `Threat Hunting Hypotheses Reconciliation Failed: Error updating Threat Hunting Hypothesis: ${error}`
          );
        }
      }
    });
    return { created: createdCount, updated: updatedCount, results };
  };

  private mapHypothesisIdToSoId(existing: Record<string, ThreatHuntingHypothesis>) {
    const soIdByHypothesisId = new Map<string, string>();
    for (const [soId, attrs] of Object.entries(existing)) {
      if (attrs.hypothesisId) soIdByHypothesisId.set(attrs.hypothesisId, soId);
    }
    return soIdByHypothesisId;
  }
}
