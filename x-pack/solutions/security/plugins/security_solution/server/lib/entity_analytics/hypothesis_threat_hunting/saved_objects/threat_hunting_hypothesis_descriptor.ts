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

  async bulkCreate(sources: ThreatHuntingHypothesis[]) {
    const createdHypotheses = await this.deps.savedObjectsClient.bulkCreate(
      sources.map((source) => ({
        type: threatHuntingHypothesisTypeName,
        attributes: { ...source },
      })),
      { refresh: 'wait_for' }
    );
    return createdHypotheses.saved_objects.map((so) => so.attributes);
  }

  async update(id: string, updates: Partial<ThreatHuntingHypothesis>) {
    const { attributes } = await this.deps.savedObjectsClient.update<ThreatHuntingHypothesis>(
      threatHuntingHypothesisTypeName,
      id,
      updates,
      { refresh: 'wait_for' }
    );
    return attributes;
  }

  bulkUpsert = async (hypotheses: ThreatHuntingHypothesis[]) => {
    if (hypotheses.length === 0) {
      return { created: 0, updated: 0, results: [] };
    }
    const existing = await this.getAll();
    let createdCount = 0;
    let updatedCount = 0;
    const results: Array<{ action: 'created' | 'updated'; hypothesis: ThreatHuntingHypothesis }> =
      [];
    await asyncForEach(hypotheses, async (hypothesis) => {
      const existingHypothesis = Object.values(existing).find(
        (eh) => eh.hypothesisId === hypothesis.hypothesisId
      );
      if (!existingHypothesis) {
        try {
          await this.deps.savedObjectsClient.create<ThreatHuntingHypothesis>(
            threatHuntingHypothesisTypeName,
            hypothesis,
            { id: this.getSavedObjectId(), refresh: 'wait_for' }
          );
          createdCount++;
          results.push({ action: 'created', hypothesis });
        } catch (error) {
          Error(
            `Threat Hunting Hypotheses Reconciliation Failed: Error creating Threat Hunting Hypothesis: ${error}`
          );
        }
      } else {
        try {
          await this.deps.savedObjectsClient.update<ThreatHuntingHypothesis>(
            threatHuntingHypothesisTypeName,
            this.getSavedObjectId(),
            hypothesis,
            { refresh: 'wait_for' }
          );
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
}
