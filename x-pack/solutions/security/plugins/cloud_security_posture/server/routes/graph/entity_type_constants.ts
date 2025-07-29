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
interface EntityTypeMapping {
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
    icon: 'user',
    values: [
      'User',
      'Service Account',
      'Identity Provider',
      'Identity',
      'Group',
      'Access Management',
      'Secret',
      'Secret Vault',
    ],
  },
  {
    icon: 'storage',
    values: ['Host', 'Virtual Desktop', 'Virtual Workstation', 'Virtual Machine Image'],
  },
  {
    icon: 'container',
    values: [
      'Container',
      'Container Group',
      'Daemon Set',
      'Pod',
      'Replica Set',
      'Stateful Set',
      'Container Image',
      'Container Registry',
      'Container Repository',
      'Container Service',
    ],
  },
  {
    icon: 'kubernetesNode',
    values: [
      'Orchestrator',
      'Orchestrator Job',
      'Deployment',
      'Map Reduce Cluster',
      'Orchestrator Cron Job',
      'Orchestrator Storage Class',
      'Kubernetes Container',
      'Kubernetes Service',
      'Ingress',
      'Orchestrator Ingress',
      'Controller Revision',
      'Orchestrator Pod Security Policy',
      'Namespace',
    ],
  },
  {
    icon: 'tableDensityExpanded',
    values: ['Application (Desktop or Web App)', 'Development Service'],
  },
  {
    icon: 'database',
    values: [
      'Database',
      'File System Service',
      'Snapshot',
      'Volume',
      'Volume Claim',
      'Storage Bucket',
      'Backup Service',
      'Managed Certificate',
      'Config Map',
      'IAC Resource Declaration',
      'IAC Declaration Instance',
      'AI Dataset',
      'AI Model',
      'AI Pipeline',
      'AI Service',
      'AI Extension',
    ],
  },
  {
    icon: 'globe',
    values: [
      'IP',
      'API Gateway',
      'CDN',
      'Load Balancer',
      'Mesh Gateway',
      'Gateway',
      'DNS Zone',
      'DNS Record',
      'Route Table',
      'Subnet',
      'Switch',
      'Networking',
      'Peering',
      'Private Endpoint',
      'Private Link',
      'IP Address Pool',
      'Domain',
      'Registered Domain',
    ],
  },
  {
    icon: 'cloudStormy',
    values: [
      'Development Service',
      'Management Service',
      'Monitoring Service',
      'Mesh Virtual Service',
      'Subscription',
      'Region',
      'Resource Group',
      'Call Center Service',
      'Email Service',
      'Search Index',
      'Service',
      'FaaS Package',
      'FaaS',
      'CI Runner',
      'CI Runner Config',
      'CICD Service',
    ],
  },
  {
    icon: 'securityApp',
    values: [
      'Governance Policy',
      'Governance Policy Group',
      'Firewall',
      'Firewall Configuration',
      'Host Configuration',
      'Host Group',
      'Monitor Alert',
      'Monitor Service',
      'Orchestrator Pod Security Policy',
      'Security Vault',
    ],
  },
  {
    icon: 'code',
    values: [
      'Version Control Integration',
      'Repository',
      'Repository Branch',
      'Data Workflow',
      'Data Workload',
      'AI Pipeline',
      'AI Extension',
      'Config Map',
    ],
  },
  {
    icon: 'comment',
    values: [
      'Call Center Service',
      'Messaging Service',
      'Monitor Service',
      'Log Configuration',
      'Domain',
      'Registered Domain',
    ],
  },
  {
    icon: 'key',
    values: ['Secrets', 'Keys', 'API Keys', 'Encryption Keys', 'Access Keys'],
  },
];
