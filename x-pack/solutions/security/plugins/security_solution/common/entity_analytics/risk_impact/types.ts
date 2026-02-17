/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskSeverity } from '../../search_strategy';

export interface RiskImpactEntity {
  type: 'service' | 'host' | 'user';
  name: string;
  riskScore?: number;
  riskLevel?: RiskSeverity;
  riskContributors?: Array<{
    category: string;
    alertCount: number;
    score: number;
  }>;
}

export interface ImpactedSLO {
  id: string;
  name: string;
  currentBurnRate: number;
  projectedBurnRate: number;
  budgetRemaining: number;
  status: 'VIOLATED' | 'DEGRADED' | 'HEALTHY' | 'NO_DATA';
  criticality: 'Critical' | 'High' | 'Medium' | 'Low';
  timeToBreach?: string;
}

export interface DependencyRelation {
  from: string;
  to: string;
  type: 'calls' | 'triggers' | 'depends_on';
  entity?: RiskImpactEntity;
  affectedSLOs?: ImpactedSLO[];
}

export interface BusinessImpact {
  estimatedCost?: string;
  affectedServices: number;
  affectedTransactions?: number;
}

export interface RiskImpactAnalysisResponse {
  entity: RiskImpactEntity;
  impactedSLOs: ImpactedSLO[];
  dependencyChain: DependencyRelation[];
  businessImpact: BusinessImpact;
  forecast: {
    confidence: 'high' | 'medium' | 'low';
    projectedBurnRate: number;
    currentBurnRate: number;
    timeToBreach?: string;
  };
}

export interface RiskImpactAnalysisRequest {
  entity_type: 'service' | 'host' | 'user';
  entity_name: string;
  start?: number;
  end?: number;
}
