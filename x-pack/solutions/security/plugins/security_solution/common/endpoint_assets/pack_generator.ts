/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pack Generator for CAASM Queries
 *
 * This module generates osquery pack payloads for the Kibana API.
 * Use these packs to enable CAASM visibility across your fleet.
 *
 * Available packs:
 * - Unknown Knowns (dormant risk detection)
 * - Core Identity (system info, OS, uptime)
 * - Network Exposure (interfaces, connections, routes)
 * - Privilege Assessment (root users, sudoers, groups)
 * - Security Controls (EDR/AV detection)
 * - Persistence Detection (systemd, cron, WMI, kernel modules)
 * - Shadow IT (VPN, remote access, cloud CLI)
 * - Container Awareness (Docker)
 * - Software Supply Chain (browser extensions, packages)
 */

import type { PostureQuery } from './posture_queries';
import { getAllUnknownKnownsQueries, getAllPostureQueries } from './posture_queries';
import { getAllDriftQueries } from './drift_queries';
import {
  CORE_IDENTITY_QUERIES,
  NETWORK_EXPOSURE_QUERIES,
  PRIVILEGE_ASSESSMENT_QUERIES,
  SECURITY_CONTROLS_QUERIES,
  PERSISTENCE_MECHANISM_QUERIES,
  UNKNOWN_KNOWNS_EXPANDED_QUERIES,
  SHADOW_IT_QUERIES,
  CONTAINER_QUERIES,
  SOFTWARE_INVENTORY_QUERIES,
  getAllInventoryQueries,
} from './inventory_queries';

/**
 * ECS mapping format for pack API
 */
interface PackEcsMapping {
  [key: string]: {
    field?: string;
    value?: string | string[];
  };
}

/**
 * Query format for pack API
 */
interface PackQuery {
  query: string;
  interval: number;
  timeout?: number;
  platform?: string;
  version?: string;
  snapshot?: boolean;
  removed?: boolean;
  ecs_mapping?: PackEcsMapping;
}

/**
 * Pack payload format for Kibana API
 */
export interface PackPayload {
  name: string;
  description: string;
  enabled: boolean;
  policy_ids?: string[];
  shards?: Record<string, number>;
  queries: Record<string, PackQuery>;
}

/**
 * Convert platform from PostureQuery format to pack format
 */
const convertPlatform = (platform: string): string => {
  switch (platform) {
    case 'posix':
      return 'linux,darwin';
    case 'darwin':
      return 'darwin';
    case 'windows':
      return 'windows';
    case 'linux':
      return 'linux';
    default:
      return platform;
  }
};

/**
 * Convert PostureQuery to pack query format
 */
const convertQueryToPackFormat = (query: PostureQuery): PackQuery => {
  const packQuery: PackQuery = {
    query: query.query,
    interval: query.interval,
    timeout: 120,
    platform: convertPlatform(query.platform),
    snapshot: true,
    removed: false,
  };

  if (query.ecsMapping) {
    packQuery.ecs_mapping = query.ecsMapping;
  }

  return packQuery;
};

/**
 * Generate the Unknown Knowns pack payload for the Kibana API
 *
 * @param options - Configuration options
 * @returns Pack payload ready to POST to /api/osquery/packs
 */
export const generateUnknownKnownsPack = (options?: {
  policyIds?: string[];
  shards?: Record<string, number>;
  enabled?: boolean;
}): PackPayload => {
  const queries = getAllUnknownKnownsQueries();

  const packQueries: Record<string, PackQuery> = {};
  for (const query of queries) {
    packQueries[query.id] = convertQueryToPackFormat(query);
  }

  return {
    name: 'Asset - Unknown Knowns',
    description:
      'Dormant Risk Detection queries for CAASM. Detects SSH keys over 180 days old, dormant users with no login in 30+ days, and scheduled tasks/cron jobs calling external URLs.',
    enabled: options?.enabled ?? true,
    policy_ids: options?.policyIds ?? [],
    shards: options?.shards,
    queries: packQueries,
  };
};

/**
 * Get the pack payload as a JSON string for curl/API usage
 */
export const getUnknownKnownsPackJson = (options?: {
  policyIds?: string[];
  shards?: Record<string, number>;
  enabled?: boolean;
}): string => {
  return JSON.stringify(generateUnknownKnownsPack(options), null, 2);
};

/**
 * Generate curl command to create the pack
 *
 * @param kibanaUrl - Kibana URL (default: http://localhost:5601)
 * @param options - Pack options
 * @returns curl command string
 */
export const generateCurlCommand = (
  kibanaUrl: string = 'http://localhost:5601',
  options?: {
    policyIds?: string[];
    enabled?: boolean;
  }
): string => {
  const pack = generateUnknownKnownsPack(options);

  return `curl -X POST "${kibanaUrl}/api/osquery/packs" \\
  -H "kbn-xsrf: true" \\
  -H "Content-Type: application/json" \\
  -H "elastic-api-version: 2023-10-31" \\
  -u elastic:changeme \\
  -d '${JSON.stringify(pack)}'`;
};

// =============================================================================
// CAASM PACK GENERATORS
// =============================================================================

/**
 * Pack generation options
 */
export interface PackGeneratorOptions {
  policyIds?: string[];
  shards?: Record<string, number>;
  enabled?: boolean;
}

/**
 * Generic function to generate a pack from queries
 */
const generatePackFromQueries = (
  name: string,
  description: string,
  queries: PostureQuery[],
  options?: PackGeneratorOptions
): PackPayload => {
  const packQueries: Record<string, PackQuery> = {};
  for (const query of queries) {
    packQueries[query.id] = convertQueryToPackFormat(query);
  }

  return {
    name,
    description,
    enabled: options?.enabled ?? true,
    policy_ids: options?.policyIds ?? [],
    shards: options?.shards,
    queries: packQueries,
  };
};

/**
 * Generate Core Identity pack (system info, OS, uptime, logged-in users)
 */
export const generateCoreIdentityPack = (options?: PackGeneratorOptions): PackPayload => {
  return generatePackFromQueries(
    'Asset - Core Identity',
    'Core Identity & Facts - Essential asset visibility including system info, OS version, uptime, and logged-in users',
    CORE_IDENTITY_QUERIES,
    options
  );
};

/**
 * Generate Network Exposure pack (interfaces, connections, routes, ARP, SMB)
 */
export const generateNetworkExposurePack = (options?: PackGeneratorOptions): PackPayload => {
  return generatePackFromQueries(
    'Asset - Network Exposure',
    'Network Exposure & Attack Surface - Interfaces, connections, routes, ARP cache, DNS, and SMB shares',
    NETWORK_EXPOSURE_QUERIES,
    options
  );
};

/**
 * Generate Privilege Assessment pack (root users, sudoers, groups)
 */
export const generatePrivilegeAssessmentPack = (options?: PackGeneratorOptions): PackPayload => {
  return generatePackFromQueries(
    'Asset - Privilege Assessment',
    'Privilege Assessment - Root users, sudoers configuration, local groups, and privileged memberships',
    PRIVILEGE_ASSESSMENT_QUERIES,
    options
  );
};

/**
 * Generate Security Controls pack (EDR/AV detection, updates)
 */
export const generateSecurityControlsPack = (options?: PackGeneratorOptions): PackPayload => {
  return generatePackFromQueries(
    'Asset - Security Controls',
    'Security Controls Validation - EDR/AV detection, Windows updates, Gatekeeper, XProtect',
    SECURITY_CONTROLS_QUERIES,
    options
  );
};

/**
 * Generate Persistence Detection pack (systemd, cron, WMI, kernel modules)
 */
export const generatePersistenceDetectionPack = (options?: PackGeneratorOptions): PackPayload => {
  return generatePackFromQueries(
    'Asset - Persistence Detection',
    'Persistence Mechanism Detection - Systemd units, cron jobs, WMI consumers, kernel modules',
    PERSISTENCE_MECHANISM_QUERIES,
    options
  );
};

/**
 * Generate Unknown Knowns Expanded pack (expiring certs, services as SYSTEM, dormant admins)
 */
export const generateUnknownKnownsExpandedPack = (options?: PackGeneratorOptions): PackPayload => {
  return generatePackFromQueries(
    'Asset - Unknown Knowns Expanded',
    'Unknown Knowns Expanded - Expiring certificates, SYSTEM services, root processes, dormant admins, SSH known hosts',
    UNKNOWN_KNOWNS_EXPANDED_QUERIES,
    options
  );
};

/**
 * Generate Shadow IT pack (VPN clients, remote access, cloud CLI)
 */
export const generateShadowITPack = (options?: PackGeneratorOptions): PackPayload => {
  return generatePackFromQueries(
    'Asset - Shadow IT',
    'Shadow IT Detection - VPN clients, remote access tools (TeamViewer, AnyDesk), cloud CLI tools',
    SHADOW_IT_QUERIES,
    options
  );
};

/**
 * Generate Container Awareness pack (Docker containers and images)
 */
export const generateContainerAwarenessPack = (options?: PackGeneratorOptions): PackPayload => {
  return generatePackFromQueries(
    'Asset - Container Awareness',
    'Container Awareness - Docker containers and images inventory',
    CONTAINER_QUERIES,
    options
  );
};

/**
 * Generate Software Supply Chain pack (browser extensions, packages)
 */
export const generateSoftwareSupplyChainPack = (options?: PackGeneratorOptions): PackPayload => {
  return generatePackFromQueries(
    'Asset - Software Supply Chain',
    'Software Supply Chain - Browser extensions, Python packages, npm packages, Homebrew',
    SOFTWARE_INVENTORY_QUERIES,
    options
  );
};

/**
 * Generate Posture pack (disk encryption, firewall, secure boot, local admins)
 */
export const generatePosturePack = (options?: PackGeneratorOptions): PackPayload => {
  return generatePackFromQueries(
    'Asset - Security Posture',
    'Security Posture Checks - Disk encryption, firewall, secure boot, shell history, local admins',
    getAllPostureQueries(),
    options
  );
};

/**
 * Generate full CAASM pack (all inventory queries)
 */
export const generateFullCasmPack = (options?: PackGeneratorOptions): PackPayload => {
  return generatePackFromQueries(
    'Asset - Full CAASM',
    'Complete CAASM Collection - All asset visibility, exposure, privilege, posture, and risk queries',
    getAllInventoryQueries(),
    options
  );
};

/**
 * All pack generators mapped by name
 */
export const PACK_GENERATORS = {
  'core-identity': generateCoreIdentityPack,
  'network-exposure': generateNetworkExposurePack,
  'privilege-assessment': generatePrivilegeAssessmentPack,
  'security-controls': generateSecurityControlsPack,
  'persistence-detection': generatePersistenceDetectionPack,
  'unknown-knowns': generateUnknownKnownsPack,
  'unknown-knowns-expanded': generateUnknownKnownsExpandedPack,
  'shadow-it': generateShadowITPack,
  'container-awareness': generateContainerAwarenessPack,
  'software-supply-chain': generateSoftwareSupplyChainPack,
  'security-posture': generatePosturePack,
  'full-caasm': generateFullCasmPack,
} as const;

export type PackName = keyof typeof PACK_GENERATORS;

/**
 * Generate all CAASM packs
 */
export const generateAllPacks = (options?: PackGeneratorOptions): PackPayload[] => {
  return [
    generateCoreIdentityPack(options),
    generateNetworkExposurePack(options),
    generatePrivilegeAssessmentPack(options),
    generateSecurityControlsPack(options),
    generatePersistenceDetectionPack(options),
    generateUnknownKnownsPack(options),
    generateUnknownKnownsExpandedPack(options),
    generateShadowITPack(options),
    generateContainerAwarenessPack(options),
    generateSoftwareSupplyChainPack(options),
    generatePosturePack(options),
  ];
};

/**
 * Generate curl command for any pack
 */
export const generatePackCurlCommand = (
  packName: PackName,
  kibanaUrl: string = 'http://localhost:5601',
  options?: PackGeneratorOptions
): string => {
  const generator = PACK_GENERATORS[packName];
  const pack = generator(options);

  return `curl -X POST "${kibanaUrl}/api/osquery/packs" \\
  -H "kbn-xsrf: true" \\
  -H "Content-Type: application/json" \\
  -H "elastic-api-version: 2023-10-31" \\
  -u elastic:changeme \\
  -d '${JSON.stringify(pack)}'`;
};
