/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ThreatHuntingHypothesis {
  title: string;
  summary: string;
  managed: boolean;
  sourceType: 'pre_built' | 'ai_generated';
  version: number;
  threat: Array<{
    framework: string;
    tactic: Array<{
      id: string;
      name: string;
      reference: string;
    }>;
    technique: Array<{
      id: string;
      name: string;
      reference: string;
      subtechnique?: Array<{
        id: string;
        name: string;
        reference: string;
      }>;
    }>;
  }>;
  tags?: string[];
  model?: {
    name: string;
  };
  _meta: {
    mappingsVersion: number;
  };
}
