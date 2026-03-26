/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Available indices for automatic troubleshooting
 */
interface AvailableIndexMetadata {
  pattern: string;
  description: string;
}

export const AVAILABLE_INDICES: AvailableIndexMetadata[] = [
  {
    pattern: 'metrics-endpoint.metadata-*',
    description: 'Raw Elastic Defend metadata documents',
  },
  {
    pattern: 'metrics-endpoint.metadata_current_*',
    description: 'Latest Elastic Defend metadata document for each endpoint',
  },
  {
    pattern: '.fleet-agents*',
    description: 'Fleet agent documents containing agent and policy information',
  },
  {
    pattern: '.metrics-endpoint.metadata_united_*',
    description:
      'Unified Elastic Defend metadata + fleet agent documents. Contains documents sourced from "metrics-endpoint.metadata_current_*" and ".fleet-agents*" indices. Used as the source of truth for many Elastic Defend pages in Kibana including the endpoint list page.',
  },
  {
    pattern: 'logs-elastic_agent.endpoint_security-*',
    description: 'Elastic Defend integration logs',
  },
  {
    pattern: 'metrics-endpoint.policy-*',
    description:
      'Elastic Defend policy responses containing warnings and errors for policy responses',
  },
  {
    pattern: 'logs-endpoint.events.file-*',
    description: 'Elastic Defend file event activity',
  },
  {
    pattern: 'logs-endpoint.events.network-*',
    description: 'Elastic Defend network event activity',
  },
  {
    pattern: 'logs-endpoint.events.process-*',
    description: 'Elastic Defend process event activity',
  },
  {
    pattern: 'logs-endpoint.events.library-*',
    description: 'Elastic Defend library event activity',
  },
  {
    pattern: 'logs-endpoint.events.registry-*',
    description: 'Elastic Defend registry event activity',
  },
  {
    pattern: 'logs-endpoint.events.security-*',
    description: 'Elastic Defend security event activity',
  },
  {
    pattern: 'logs-endpoint.events.device-*',
    description: 'Elastic Defend device event activity',
  },
  {
    pattern: 'logs-endpoint.events.api-*',
    description: 'Elastic Defend api event activity',
  },
  {
    pattern: 'logs-endpoint.alerts-*',
    description: 'Elastic Defend alerts',
  },
  {
    pattern: 'metrics-endpoint.metrics-*',
    description: 'Elastic Defend metrics',
  },
  {
    pattern: '.logs-endpoint.actions-*',
    description: 'Elastic Defend actions',
  },
  {
    pattern: '.logs-endpoint.action.responses-*',
    description: 'Elastic Defend action responses',
  },
];
