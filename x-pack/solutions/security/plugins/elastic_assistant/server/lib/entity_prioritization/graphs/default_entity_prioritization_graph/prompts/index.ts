/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: Implement prompt fetching similar to attack discovery
export interface ThreatHuntingPrioritiesPrompts {
  default: string;
  refine: string;
  continue: string;
  selectCandidates: string;
  finalizePriorities: string;
}

export interface GenerationPrompts {
  // TODO: Define generation prompt fields based on requirements
  summary: string;
  priority: string;
}

export interface CombinedPrompts extends ThreatHuntingPrioritiesPrompts, GenerationPrompts {}

// TODO: Implement getThreatHuntingPrioritiesPrompts similar to getAttackDiscoveryPrompts
export const getThreatHuntingPrioritiesPrompts = async (): Promise<CombinedPrompts> => {
  // Stub implementation
  return {
    default: '',
    refine: '',
    continue: '',
    selectCandidates: '',
    finalizePriorities: '',
    summary: '',
    priority: '',
  };
};

