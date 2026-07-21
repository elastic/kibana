/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Hunt {
  name: string;
  language: 'kuery' | 'eql' | 'esql';
  query: string;
  ruleType: 'query' | 'eql' | 'esql' | 'threshold' | 'new_terms';
  mitre: Array<{
    tactic: string;
    technique: string;
    tacticName?: string;
    techniqueName?: string;
  }>;
  falsePositives?: Array<Record<string, unknown>>;
}

export interface PackEventSource {
  integration: string;
  version: string;
  dataStream: string;
  fidelity: 'authored';
  upstreamCommit: string;
  upstreamScenarioId: string;
}

export interface TechnologyWatchPack {
  id: string;
  technology: string;
  eventSources: PackEventSource[];
  hunts: Hunt[];
}
