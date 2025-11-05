/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ThreatHuntingHypothesis } from '../types';
import { threatHuntingHypothesisTypeName } from './threat_hunting_hypothesis_type';

interface ThreatHuntingHypothesisDependencies {
  soClient: SavedObjectsClientContract;
  namespace: string;
}

export class ThreatHuntingHypothesisDescriptorClient {
  constructor(private readonly deps: ThreatHuntingHypothesisDependencies) {}
  getSavedObjectId() {
    return `${threatHuntingHypothesisTypeName}-${this.deps.namespace}`;
  }

  async get(id: string): Promise<ThreatHuntingHypothesis> {
    const { attributes } = await this.deps.soClient.get<ThreatHuntingHypothesis>(
      threatHuntingHypothesisTypeName,
      id
    );
    return attributes;
  }

  async delete(id: string) {
    await this.deps.soClient.delete(threatHuntingHypothesisTypeName, id);
  }

  async bulkCreate(sources: ThreatHuntingHypothesis[]) {
    const createdSources = await this.deps.soClient.bulkCreate(
      sources.map((source) => ({
        type: threatHuntingHypothesisTypeName,
        attributes: { ...source },
      })),
      { refresh: 'wait_for' }
    );
    return createdSources;
  }

  bulkUpsert = async (hypotheses: ThreatHuntingHypothesis[]) => {
    if (hypotheses.length === 0) {
      return { created: 0, updated: 0, results: [] };
    }
    // TODO: fill this in. Step one is just create them all
  };
}
