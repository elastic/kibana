/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { threatHuntingHypothesesTypeName } from './threat_hunting_hypotheses_type';

interface ThreatHuntingHypothesesDependencies {
  soClient: SavedObjectsClientContract;
  namespace: string;
}

export class ThreatHuntingHypothesesDescriptorClient {
  constructor(private readonly deps: ThreatHuntingHypothesesDependencies) {}
  getSavedObjectId() {
    return `threat-hunting-hypotheses-${this.deps.namespace}`;
  }

  async get() {
    // TODO: Implement ThreatHuntingHypotheses Schema
    const { attributes } = await this.deps.soClient.get<ThreatHuntingHypotheses>(
      threatHuntingHypothesesTypeName,
      this.getSavedObjectId()
    );
    return attributes;
  }
  async delete() {
    const id = this.getSavedObjectId();
    await this.deps.soClient.delete(threatHuntingHypothesesTypeName, id);
  }
}
