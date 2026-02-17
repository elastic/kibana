/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskImpactAnalysisResponse } from '../../../../common/entity_analytics/risk_impact/types';

/**
 * Mock data generator for risk impact analysis
 * Returns realistic scenarios for different entities
 */
export const getRiskImpactMockData = (
  entityType: string,
  entityName: string
): RiskImpactAnalysisResponse | null => {
  // Scenario-based mock data
  const scenarios: Record<string, RiskImpactAnalysisResponse> = {
    'checkout-service': {
      entity: {
        name: 'checkout-service',
        type: 'service',
        riskScore: 89.5,
        riskLevel: 'Critical',
        riskContributors: [
          { category: 'Performance', alertCount: 45, score: 35.2 },
          { category: 'Availability', alertCount: 28, score: 28.8 },
          { category: 'Resource Consumption', alertCount: 32, score: 25.5 },
        ],
      },
      impactedSLOs: [
        {
          id: 'payment-gateway-availability',
          name: 'Payment Gateway Availability',
          currentBurnRate: 2.5,
          projectedBurnRate: 8.3,
          budgetRemaining: 15,
          status: 'DEGRADED',
          criticality: 'Critical',
          timeToBreach: '2 hours',
        },
        {
          id: 'order-processing-latency',
          name: 'Order Processing Latency',
          currentBurnRate: 3.2,
          projectedBurnRate: 9.1,
          budgetRemaining: 8,
          status: 'DEGRADED',
          criticality: 'Critical',
          timeToBreach: '1.5 hours',
        },
        {
          id: 'user-session-slo',
          name: 'User Session SLO',
          currentBurnRate: 1.1,
          projectedBurnRate: 2.8,
          budgetRemaining: 65,
          status: 'HEALTHY',
          criticality: 'High',
          timeToBreach: '6 hours',
        },
      ],
      dependencyChain: [
        { from: 'api-gateway', to: 'checkout-service', type: 'calls' },
        { from: 'checkout-service', to: 'payment-gateway', type: 'calls' },
        { from: 'checkout-service', to: 'order-service', type: 'triggers' },
        { from: 'payment-gateway', to: 'transaction-db', type: 'depends_on' },
      ],
      businessImpact: {
        estimatedCost: '$45,000/hour',
        affectedServices: 5,
        affectedTransactions: 15000,
      },
      forecast: {
        confidence: 'high',
        currentBurnRate: 2.5,
        projectedBurnRate: 8.3,
        timeToBreach: '2 hours',
      },
    },
    'auth-service': {
      entity: {
        name: 'auth-service',
        type: 'service',
        riskScore: 76.2,
        riskLevel: 'High',
        riskContributors: [
          { category: 'Authentication', alertCount: 38, score: 28.4 },
          { category: 'Performance', alertCount: 25, score: 22.1 },
          { category: 'Resource Consumption', alertCount: 29, score: 25.7 },
        ],
      },
      impactedSLOs: [
        {
          id: 'user-login-success',
          name: 'User Login Success Rate',
          currentBurnRate: 1.8,
          projectedBurnRate: 4.2,
          budgetRemaining: 22,
          status: 'DEGRADED',
          criticality: 'Critical',
          timeToBreach: '4 hours',
        },
        {
          id: 'api-gateway-response',
          name: 'API Gateway Response Time',
          currentBurnRate: 0.9,
          projectedBurnRate: 2.1,
          budgetRemaining: 55,
          status: 'HEALTHY',
          criticality: 'High',
          timeToBreach: '8 hours',
        },
      ],
      dependencyChain: [
        { from: 'api-gateway', to: 'auth-service', type: 'calls' },
        { from: 'auth-service', to: 'user-service', type: 'calls' },
        { from: 'auth-service', to: 'checkout-service', type: 'triggers' },
        { from: 'auth-service', to: 'user-db', type: 'depends_on' },
      ],
      businessImpact: {
        estimatedCost: '$32,000/hour',
        affectedServices: 8,
        affectedTransactions: 25000,
      },
      forecast: {
        confidence: 'high',
        currentBurnRate: 1.8,
        projectedBurnRate: 4.2,
        timeToBreach: '4 hours',
      },
    },
    'database-primary': {
      entity: {
        name: 'database-primary',
        type: 'host',
        riskScore: 82.8,
        riskLevel: 'Critical',
        riskContributors: [
          { category: 'Disk I/O', alertCount: 52, score: 32.1 },
          { category: 'Query Performance', alertCount: 41, score: 28.3 },
          { category: 'Replication', alertCount: 35, score: 22.4 },
        ],
      },
      impactedSLOs: [
        {
          id: 'database-query-perf',
          name: 'Database Query Performance',
          currentBurnRate: 5.2,
          projectedBurnRate: 12.8,
          budgetRemaining: 2,
          status: 'VIOLATED',
          criticality: 'Critical',
          timeToBreach: '30 minutes',
        },
        {
          id: 'data-consistency',
          name: 'Application Data Consistency',
          currentBurnRate: 2.8,
          projectedBurnRate: 7.1,
          budgetRemaining: 18,
          status: 'DEGRADED',
          criticality: 'Critical',
          timeToBreach: '1 hour',
        },
        {
          id: 'api-response-time',
          name: 'Overall API Response Time',
          currentBurnRate: 1.5,
          projectedBurnRate: 3.9,
          budgetRemaining: 35,
          status: 'DEGRADED',
          criticality: 'High',
          timeToBreach: '3 hours',
        },
      ],
      dependencyChain: [
        { from: 'auth-service', to: 'database-primary', type: 'depends_on' },
        { from: 'checkout-service', to: 'database-primary', type: 'depends_on' },
        { from: 'database-primary', to: 'database-replica', type: 'triggers' },
      ],
      businessImpact: {
        estimatedCost: '$75,000/hour',
        affectedServices: 12,
        affectedTransactions: 35000,
      },
      forecast: {
        confidence: 'high',
        currentBurnRate: 5.2,
        projectedBurnRate: 12.8,
        timeToBreach: '30 minutes',
      },
    },
  };

  const key = `${entityName}`;
  return scenarios[key] || null;
};

/**
 * Returns a list of all mock entities for the table view
 */
export const getAllMockEntities = () => [
  {
    entityName: 'checkout-service',
    entityType: 'service' as const,
    riskScore: 89.5,
    riskLevel: 'Critical' as const,
    impactedSLOs: 3,
    projectedBreach: 'in 2 hours',
    criticality: 'Critical' as const,
  },
  {
    entityName: 'database-primary',
    entityType: 'host' as const,
    riskScore: 82.8,
    riskLevel: 'Critical' as const,
    impactedSLOs: 3,
    projectedBreach: 'in 30 minutes',
    criticality: 'Critical' as const,
  },
  {
    entityName: 'auth-service',
    entityType: 'service' as const,
    riskScore: 76.2,
    riskLevel: 'High' as const,
    impactedSLOs: 2,
    projectedBreach: 'in 4 hours',
    criticality: 'High' as const,
  },
  {
    entityName: 'admin-user',
    entityType: 'user' as const,
    riskScore: 68.5,
    riskLevel: 'High' as const,
    impactedSLOs: 0,
    projectedBreach: 'N/A',
    criticality: 'Medium' as const,
  },
  {
    entityName: 'payment-gateway',
    entityType: 'service' as const,
    riskScore: 54.3,
    riskLevel: 'Moderate' as const,
    impactedSLOs: 1,
    projectedBreach: 'in 12 hours',
    criticality: 'Medium' as const,
  },
  {
    entityName: 'api-gateway',
    entityType: 'service' as const,
    riskScore: 42.7,
    riskLevel: 'Moderate' as const,
    impactedSLOs: 0,
    projectedBreach: 'N/A',
    criticality: 'Low' as const,
  },
  {
    entityName: 'web-server-01',
    entityType: 'host' as const,
    riskScore: 35.2,
    riskLevel: 'Low' as const,
    impactedSLOs: 0,
    projectedBreach: 'N/A',
    criticality: 'Low' as const,
  },
  {
    entityName: 'reporting-service',
    entityType: 'service' as const,
    riskScore: 28.9,
    riskLevel: 'Low' as const,
    impactedSLOs: 0,
    projectedBreach: 'N/A',
    criticality: 'Low' as const,
  },
];
