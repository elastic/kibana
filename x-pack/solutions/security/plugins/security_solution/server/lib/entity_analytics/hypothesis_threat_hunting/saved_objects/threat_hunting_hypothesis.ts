/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import type { ThreatHuntingHypothesis } from '../types';
import type { SavedObjectsClientArg } from '../../risk_engine/utils/saved_object_configuration';
import { threatHuntingHypothesisTypeName } from './threat_hunting_hypothesis_type';

interface ThreatHuntingHypothesesDependencies {
  soClient: SavedObjectsClientContract;
  namespace: string;
}

export class ThreatHuntingHypothesesClient {
  constructor(private readonly deps: ThreatHuntingHypothesesDependencies) {}
  getSavedObjectId() {
    return `threat-hunting-hypothesis-${this.deps.namespace}`;
  }

  // instead of this should we be getting a default LIST of Hypotheses rules? I think yes.
  getDefaultThreatHuntingHypothesis = ({
    namespace,
  }: {
    namespace: string;
  }): ThreatHuntingHypothesis => ({
    _meta: {
      // Upgrade this property when changing mappings
      mappingsVersion: 1,
    },
    title: '',
    summary: '',
    managed: false,
    sourceType: 'pre_built',
    version: 0,
    threat: [],
  });

  get = async ({
    savedObjectsClient,
  }: SavedObjectsClientArg): Promise<SavedObject<ThreatHuntingHypothesis> | undefined> => {
    const savedObjectsResponse = await savedObjectsClient.find<ThreatHuntingHypothesis>({
      type: threatHuntingHypothesisTypeName,
    });
    return savedObjectsResponse.saved_objects?.[0];
  };

  delete = async ({ savedObjectsClient }: SavedObjectsClientArg): Promise<void> => {
    const threatHuntingHypothesis = await this.get({
      savedObjectsClient,
    });
    if (threatHuntingHypothesis) {
      await savedObjectsClient.delete(threatHuntingHypothesisTypeName, threatHuntingHypothesis.id);
    }
  };
}
