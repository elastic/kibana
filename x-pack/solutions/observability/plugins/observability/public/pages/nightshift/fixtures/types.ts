/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface FixtureStream {
  name: string;
  description: string;
}

export interface FixtureFeature {
  id: string;
  uuid: string;
  stream_name: string;
  type: 'entity' | 'infrastructure' | 'technology' | 'dependency' | 'schema';
  subtype: string;
  title: string;
  description: string;
  properties: Record<string, unknown>;
  confidence: number;
  tags: string[];
  /** For dependency type: which feature IDs this one connects to */
  dependency_targets?: string[];
}

export interface FixtureQuery {
  id: string;
  title: string;
  description: string;
  stream_name: string;
  esql: string;
  severity_score: number;
  type: string;
  rule_backed: boolean;
  rule_id: string;
  /** Which feature IDs this query monitors */
  feature_ids: string[];
}

export interface FixtureDetection {
  detection_id: string;
  timestamp: string;
  rule_uuid: string;
  rule_name: string;
  stream_name: string;
  change_point_type: string;
  p_value: number;
  /** Which query/rule produced this */
  query_id: string;
}

export interface FixtureDiscovery {
  discovery_id: string;
  discovery_slug: string;
  timestamp: string;
  kind: 'discovery' | 'clearance' | 'handled';
  title: string;
  summary: string;
  root_cause?: string;
  criticality: number;
  confidence: number;
  impact: string;
  stream_names: string[];
  rule_names: string[];
  detection_ids: string[];
  cause_ki_ids: string[];
  dependency_edges: Array<{ source: string; target: string; protocol?: string }>;
}

export interface FixtureSignificantEvent {
  event_id: string;
  timestamp: string;
  created_at: string;
  discovery_id: string;
  discovery_slug: string;
  status: 'promoted' | 'acknowledged' | 'demoted' | 'resolved' | 'closed';
  title: string;
  summary: string;
  root_cause?: string;
  criticality: number;
  confidence: number;
  stream_names: string[];
  rule_names: string[];
  cause_ki_ids: string[];
  recommendations: string[];
  dependency_edges: Array<{ source: string; target: string; protocol?: string }>;
}

export interface FixtureInvestigation {
  id: string;
  event_id: string;
  workflow_execution_id: string;
  started_at: string;
  completed_at?: string;
  goal: string;
  conclusion?: string;
  hypotheses: Array<{
    id: string;
    title: string;
    status: 'validated' | 'refuted' | 'investigating';
    confidence: number;
    evidence_summary: string;
  }>;
  recommended_actions: string[];
}
