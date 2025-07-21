/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Entity type mapping configuration
 * Each entry maps a set of entity type values to an icon name
 */
export interface EntityTypeMapping {
  /** The icon name to use for matching entity types */
  icon: string;
  /** Array of entity type values that should map to this icon */
  values: string[];
}

/**
 * Master mapping of entity types to icons
 * Add new mappings here to support additional entity types
 */
export const entityTypeMappings: EntityTypeMapping[] = [
  {
    // missing figma mapping - 'Organization'
    icon: 'user',
    values: [
      'user',
      'service account',
      'identity provider',
      'group',
      'access management',
      'secret',
      'secret vault',
    ],
  },
  {
    icon: 'storage',
    values: ['host', 'virtual desktop', 'virtual workstation', 'virtual machine image'],
  },
  {
    // need to add to figma mapping:
    // container registry
    // Container Repository
    // Container Service
    icon: 'container',
    values: [
      'container',
      'container group',
      'daemon set',
      'pod',
      'replica set',
      'stateful set',
      'container image',
      'container registry',
      'container repository',
      'container service',
    ],
  },
  {
    // missing figma mapping - 'Orchestrator Ingress Controller'
    icon: 'kubernetesNode',
    values: [
      'orchestrator',
      'orchestrator job',
      'deployment',
      'map reduce cluster',
      'orchestrator cron job',
      'orchestrator storage class',
      'kubernetes container',
      'kubernetes service',
      'ingress',
      'orchestrator ingress',
      'controller revision',
      'orchestrator pod security policy',
      'namespace',
    ],
  },
  {
    icon: 'tableDensityExpanded',
    values: ['application (desktop or web app)', 'development service'],
  },
  {
    icon: 'database',
    values: [
      'database',
      'file system service',
      'snapshot',
      'volume',
      'volume claim',
      'storage bucket',
      'backup service',
      'managed certificate',
      'config map',
      'iac resource declaration',
      'iac declaration instance',
      'ai dataset',
      'ai model',
      'ai pipeline',
      'ai service',
      'ai extension',
    ],
  },
  {
    icon: 'globe',
    values: [
      'ip',
      'api gateway',
      'CDN',
      'load balancer',
      'mesh gateway',
      'gateway',
      'dns zone',
      'dns record',
      'route table',
      'subnet',
      'switch',
      'networking',
      'peering',
      'private endpoint',
      'private link',
      'ip address pool',
      'domain',
      'registered domain',
    ],
  },
  {
    icon: 'cloudStormy',
    values: [
      'development service',
      'management service',
      'monitoring service',
      'mesh virtual service',
      'subscription',
      'region',
      'resource group',
      'call center service',
      'email service',
      'search index',
      'service',
      'faas package',
      'faas',
      'ci runner',
      'ci runner config',
      'cicd service',
    ],
  },
  {
    icon: 'securityApp',
    values: [
      'governance policy',
      'governance policy group',
      'firewall',
      'firewall configuration',
      'host configuration',
      'host group',
      'monitor alert',
      'monitor service',
      'orchestrator pod security policy',
      'security vault',
    ],
  },
  {
    icon: 'code',
    values: [
      'version control integration',
      'repository',
      'repository branch',
      'data workflow',
      'data workload',
      'ai pipeline',
      'ai extension',
      'config map',
    ],
  },
  {
    // Communication-related entity types
    icon: 'comment',
    values: [
      'call center service',
      'messaging service',
      'monitor service',
      'log configuration',
      'domain',
      'registered domain',
    ],
  },
  {
    // Key-related entity types
    icon: 'key',
    values: ['secrets', 'keys', 'api keys', 'encryption keys', 'access keys'],
  },
  // 'Service Usage Technology' - missing figma mapping
];
