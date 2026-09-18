/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CorroboratedEvent {
  stage: string;
  evidence: string;
  query?: string;
  confidence: number;
}

export interface GapEvent {
  stage: string;
  expected: string;
  possibleCauses?: string;
}

export interface CorroborationReport {
  corroboratedEvents: CorroboratedEvent[];
  gapEvents: GapEvent[];
  confidence: number;
  unresolvedQuestions: string[];
}

export interface CorroborationScenario {
  id: string;
  name: string;
  description: string;
  narrative: string;
  alertIds: string[];
  scope: {
    hosts: string[];
    timeRange: { from: string; to: string };
  };
  // Only these two are gated. Confidence is part of the report shape above but
  // is deliberately NOT an expectation: the worker emits no structured
  // confidence field yet, and prose-parsing a self-reported number would be a
  // gameable metric. Model it here only once the structured report exists.
  expected: {
    corroboratedCount: number;
    gapCount: number;
  };
}
