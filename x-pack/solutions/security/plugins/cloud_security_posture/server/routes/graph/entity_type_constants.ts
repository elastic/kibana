/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityNodeDataModel } from '@kbn/cloud-security-posture-common/types/graph/v1';

type EntityTypeIconMapping = Record<string, string>;
type EntityTypeShapeMapping = Record<string, EntityNodeDataModel['shape']>;

export interface EntityTypeMappings {
  icons: EntityTypeIconMapping;
  shapes: EntityTypeShapeMapping;
}

/**
 * Helper function to generate the mapping of entity types to icons and shapes
 * This builds records where each key is a lowercase entity type string
 * and the values are the icon name and shape to use for that entity type
 */
const buildEntityTypeMappings = (): EntityTypeMappings => {
  const rawMappings = [
    {
      icon: 'user',
      shape: 'ellipse',
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
      shape: 'hexagon',
      values: ['Host', 'Virtual Desktop', 'Virtual Workstation', 'Virtual Machine Image'],
    },
    {
      icon: 'container',
      shape: 'rectangle',
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
      shape: 'rectangle',
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
      shape: 'rectangle',
      values: ['Application (Desktop or Web App)'],
    },
    {
      icon: 'database',
      shape: 'rectangle',
      values: [
        'Database',
        'File System Service',
        'Snapshot',
        'Volume',
        'Volume Claim',
        'Storage',
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
      shape: 'rectangle',
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
      shape: 'rectangle',
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
      shape: 'rectangle',
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
      shape: 'rectangle',
      values: [
        'Version Control Integration',
        'Repository',
        'Repository Branch',
        'Data Workflow',
        'Data Workload',
        'AI Extension',
      ],
    },
    {
      icon: 'comment',
      shape: 'rectangle',
      values: ['Call Center Service', 'Messaging Service', 'Monitor Service', 'Log Configuration'],
    },
    {
      icon: 'key',
      shape: 'rectangle',
      values: ['Secrets', 'Keys', 'API Keys', 'Encryption Keys', 'Access Keys'],
    },
    {
      icon: 'magnifyWithExclamation',
      shape: 'rectangle',
      values: ['Entities', 'Entity'],
    },
  ];

  const icons = rawMappings.reduce<EntityTypeIconMapping>((acc, mapping) => {
    mapping.values.forEach((value) => {
      acc[value.toLowerCase()] = mapping.icon;
    });
    return acc;
  }, {});

  const shapes = rawMappings.reduce<EntityTypeShapeMapping>((acc, mapping) => {
    mapping.values.forEach((value) => {
      acc[value.toLowerCase()] = mapping.shape as EntityNodeDataModel['shape'];
    });
    return acc;
  }, {});

  const mappings = { icons, shapes };

  return mappings;
};

/**
 * Master mapping of entity types to icons and shapes
 * All keys are normalized to lowercase for case-insensitive lookups
 */
export const entityTypeMappings = buildEntityTypeMappings();
