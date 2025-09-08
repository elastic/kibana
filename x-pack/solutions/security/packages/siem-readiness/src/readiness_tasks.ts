/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ReadinessTaskConfig {
  id: string;
  pillar: 'visibility' | 'detection' | 'response';
  order: number;
  meta?: Record<string, 'string' | 'number' | 'boolean' | 'string[]' | 'number[]'>;
}

export const READINESS_TASKS: ReadinessTaskConfig[] = [
  /**
   *  ### Visibility Pillar Tasks ###
   */
  {
    // Completion: Elastic Defend agent running (healthy) or 3rd-party endpoint logs successfully ingested
    id: 'enable-endpoint-visibility',
    pillar: 'visibility',
    order: 1,
  },
  {
    // Completion: Events successfully ingested from at least one cloud provider (AWS/GCP/Azure/On-Prem)
    id: 'ingest-cloud-audit-logs',
    pillar: 'visibility',
    order: 2,
  },
  {
    // Completion: Cloud asset inventory indexed or visible in Inventory dashboard
    id: 'ingest-asset-inventory',
    pillar: 'visibility',
    order: 3,
  },
  {
    // Completion: Ingested logs from container/k8s integration
    id: 'enable-kubernetes-container-logs',
    pillar: 'visibility',
    order: 4,
  },
  {
    // Completion: Logs + asset data present from AWS, Azure, and GCP (dynamic based on Asset Inventory/Entity store)
    id: 'ingest-all-cloud-logs-inventory',
    pillar: 'visibility',
    order: 5,
  },

  /**
   *  ### Detection Pillar Tasks ###
   */
  {
    // Completion: High-severity MITRE rules enabled and firing
    id: 'enable-mitre-aligned-detection-rules',
    pillar: 'detection',
    order: 6,
  },
  {
    // Completion: CSPM enabled for AWS, Azure, and GCP, findings/dashboard pages visited (dynamic based on CSP footprint)
    id: 'enable-cspm-on-all-clouds',
    pillar: 'detection',
    order: 7,
  },
  {
    // Completion: A new or edited rule has been enabled
    id: 'customize-create-rules',
    pillar: 'detection',
    order: 8,
  },
  {
    // Completion: Threat feed events ingested and alerts enriched
    id: 'add-threat-intel-feeds',
    pillar: 'detection',
    order: 9,
  },
  {
    // Completion: Activity like running Attack Discovery multiple times or scheduling action on the Attack Discovery page
    id: 'use-attack-discovery',
    pillar: 'detection',
    order: 10,
  },
  {
    // Completion: Coverage page visited
    id: 'view-detection-coverage-mitre',
    pillar: 'detection',
    order: 11,
  },
  {
    // Completion: >90% of relevant MITRE techniques covered by tuned rules
    id: 'maintain-rule-coverage',
    pillar: 'detection',
    order: 12,
  },

  /**
   *  ### Response Pillar Tasks ###
   */
  {
    // Completion: Alert annotated, tagged, or enriched in Timeline
    id: 'investigate-alert-using-timeline',
    pillar: 'response',
    order: 13,
  },
  {
    // Completion: Summary generated on Alert - AI assistant workflow
    id: 'use-ai-assistant-for-alert-root-cause',
    pillar: 'response',
    order: 14,
  },
  {
    // Completion: Multiple alerts triaged and closed via case workflow
    id: 'create-manage-case-workflows',
    pillar: 'response',
    order: 15,
  },
  {
    // Completion: Jira/Slack/ServiceNow/SentinelOne/Crowdstrike connector tested and in use
    id: 'add-external-connectors',
    pillar: 'response',
    order: 16,
  },
  {
    // Completion: At least one rule creates a case or sends notification automatically
    id: 'automate-response-rules-case-creation',
    pillar: 'response',
    order: 17,
  },
  {
    // Completion: 3+ cases with automation and alert linkages resolved
    id: 'complete-automated-cases',
    pillar: 'response',
    order: 18,
  },
];
