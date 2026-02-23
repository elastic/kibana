/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { get } from 'lodash/fp';
import { isIP } from 'net';

import {
  type EntityTypeConfig,
  type ExtractedEntity,
  type EntityExtractionResult,
  type EntityExclusionConfig,
  type ProcessNode,
  ObservableTypeKey,
  DEFAULT_ENTITY_TYPE_CONFIGS,
  DEFAULT_ENTITY_EXCLUSIONS,
} from '../types';

/**
 * Service for extracting observable entities from alerts.
 * Enhanced with entity exclusion lists (Tier 1), process tree extraction (Tier 2),
 * and MITRE tactic/technique metadata extraction.
 */
export class EntityExtractionService {
  private readonly logger: Logger;
  private readonly entityTypeConfigs: EntityTypeConfig[];
  private readonly includePrivateIPs: boolean;
  private readonly exclusions: EntityExclusionConfig;
  private readonly excludedUsersSet: Set<string>;
  private readonly excludedPathPrefixes: string[];
  private readonly excludedPathsSet: Set<string>;

  constructor({
    logger,
    entityTypeConfigs = DEFAULT_ENTITY_TYPE_CONFIGS,
    includePrivateIPs = true,
    exclusions,
  }: {
    logger: Logger;
    entityTypeConfigs?: EntityTypeConfig[];
    includePrivateIPs?: boolean;
    exclusions?: EntityExclusionConfig;
  }) {
    this.logger = logger;
    this.entityTypeConfigs = entityTypeConfigs;
    this.includePrivateIPs = includePrivateIPs;
    this.exclusions = exclusions ?? DEFAULT_ENTITY_EXCLUSIONS;
    // Pre-compute exclusion sets for fast lookup
    this.excludedUsersSet = new Set(
      (this.exclusions.excludedUsers ?? []).map((u) => u.toLowerCase())
    );
    this.excludedPathPrefixes = (this.exclusions.excludedPathPrefixes ?? []).map(
      (p) => p.toLowerCase()
    );
    this.excludedPathsSet = new Set(
      (this.exclusions.excludedPaths ?? []).map((p) => p.toLowerCase())
    );
  }

  /**
   * Extract entities from a batch of alerts
   */
  public extractEntities(
    alerts: Array<{ _id: string; _source: Record<string, unknown> }>,
    entityTypes?: ObservableTypeKey[]
  ): EntityExtractionResult & { entitiesByType: Record<ObservableTypeKey, ExtractedEntity[]> } {
    const entityMap = new Map<string, ExtractedEntity>();
    const entitySummary: Record<ObservableTypeKey, number> = {} as Record<
      ObservableTypeKey,
      number
    >;

    // Initialize entity summary
    for (const type of Object.values(ObservableTypeKey)) {
      entitySummary[type] = 0;
    }

    // Filter entity configs if specific types requested
    const configsToUse = entityTypes
      ? this.entityTypeConfigs.filter((config) => entityTypes.includes(config.type))
      : this.entityTypeConfigs;

    for (const alert of alerts) {
      const alertId = alert._id;
      const alertSource = alert._source;
      const alertTimestamp = get('@timestamp', alertSource) as string | undefined;

      for (const config of configsToUse) {
        const extractedValues = this.extractValuesForType(alertSource, config);

        for (const { value, normalizedValue, sourceField } of extractedValues) {
          const entityKey = `${config.type}:${normalizedValue}`;

          if (entityMap.has(entityKey)) {
            // Update existing entity
            const entity = entityMap.get(entityKey)!;
            if (!entity.alertIds.includes(alertId)) {
              entity.alertIds.push(alertId);
              entity.occurrenceCount++;
            }
            // Update timestamps
            if (alertTimestamp) {
              if (!entity.firstSeen || alertTimestamp < entity.firstSeen) {
                entity.firstSeen = alertTimestamp;
              }
              if (!entity.lastSeen || alertTimestamp > entity.lastSeen) {
                entity.lastSeen = alertTimestamp;
              }
            }
          } else {
            // Create new entity
            entityMap.set(entityKey, {
              type: config.type,
              originalValue: value,
              normalizedValue,
              sourceAlertId: alertId,
              sourceField,
              confidence: 1.0,
              occurrenceCount: 1,
              alertIds: [alertId],
              firstSeen: alertTimestamp,
              lastSeen: alertTimestamp,
            });
            entitySummary[config.type]++;
          }
        }
      }
    }

    const entities = Array.from(entityMap.values());

    // Build entitiesByType map
    const entitiesByType: Record<ObservableTypeKey, ExtractedEntity[]> = {} as Record<
      ObservableTypeKey,
      ExtractedEntity[]
    >;
    for (const type of Object.values(ObservableTypeKey)) {
      entitiesByType[type] = entities.filter((e) => e.type === type);
    }

    this.logger.debug(
      `Extracted ${entities.length} unique entities from ${alerts.length} alerts`
    );

    return {
      alertsProcessed: alerts.length,
      entities,
      entitySummary,
      entitiesByType,
    };
  }

  /**
   * Extract values for a specific entity type from an alert
   */
  private extractValuesForType(
    alertSource: Record<string, unknown>,
    config: EntityTypeConfig
  ): Array<{ value: string; normalizedValue: string; sourceField: string }> {
    const results: Array<{ value: string; normalizedValue: string; sourceField: string }> = [];

    for (const sourceField of config.sourceFields) {
      const rawValue = get(sourceField, alertSource);

      if (rawValue == null) {
        continue;
      }

      // Handle array values
      const values = Array.isArray(rawValue) ? rawValue : [rawValue];

      for (const val of values) {
        const normalized = this.normalizeAndValidateValue(val, config.type);
        if (normalized) {
          // Check for duplicates within this extraction
          if (!results.some((r) => r.normalizedValue === normalized)) {
            results.push({
              value: String(val).trim(),
              normalizedValue: normalized,
              sourceField,
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Normalize and validate a value based on entity type
   */
  private normalizeAndValidateValue(
    value: unknown,
    type: ObservableTypeKey
  ): string | null {
    if (value == null) {
      return null;
    }

    const stringValue = String(value).trim();

    if (stringValue === '' || stringValue === '-' || stringValue === 'N/A') {
      return null;
    }

    let validated: string | null = null;

    switch (type) {
      case ObservableTypeKey.IPv4:
        validated = this.validateIPv4(stringValue);
        break;
      case ObservableTypeKey.IPv6:
        validated = this.validateIPv6(stringValue);
        break;
      case ObservableTypeKey.Hostname:
        validated = this.validateHostname(stringValue);
        break;
      case ObservableTypeKey.Domain:
        validated = this.validateDomain(stringValue);
        break;
      case ObservableTypeKey.Email:
        validated = this.validateEmail(stringValue);
        break;
      case ObservableTypeKey.URL:
        validated = this.validateUrl(stringValue);
        break;
      case ObservableTypeKey.FileHash:
        validated = this.validateFileHash(stringValue);
        break;
      case ObservableTypeKey.FileHashSHA256:
        validated = this.validateSHA256(stringValue);
        break;
      case ObservableTypeKey.FileHashSHA1:
        validated = this.validateSHA1(stringValue);
        break;
      case ObservableTypeKey.FileHashMD5:
        validated = this.validateMD5(stringValue);
        break;
      case ObservableTypeKey.FilePath:
        validated = this.validateFilePath(stringValue);
        break;
      case ObservableTypeKey.AgentId:
      case ObservableTypeKey.User:
        validated = this.validateGenericValue(stringValue);
        break;
      default:
        validated = stringValue;
    }

    // Apply custom exclusion patterns after type-specific validation
    if (validated !== null && this.isExcludedByCustomPattern(validated, type)) {
      return null;
    }

    return validated;
  }

  /**
   * Validate IPv4 address
   */
  private validateIPv4(value: string): string | null {
    // Check if it's a valid IP and specifically IPv4
    if (isIP(value) === 4) {
      // Exclude loopback and 0.0.0.0 regardless of configuration
      if (this.isLoopbackOrInvalidIPv4(value)) {
        return null;
      }
      // Optionally exclude private/internal ranges
      if (!this.includePrivateIPs && this.isPrivateIPv4(value)) {
        return null;
      }
      return value;
    }
    return null;
  }

  /**
   * Check if IPv4 is loopback or invalid (always filtered)
   */
  private isLoopbackOrInvalidIPv4(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    // 127.x.x.x (loopback)
    if (parts[0] === 127) return true;
    // 0.0.0.0
    if (parts.every((p) => p === 0)) return true;
    return false;
  }

  /**
   * Check if IPv4 is in a private range
   */
  private isPrivateIPv4(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    // 10.x.x.x
    if (parts[0] === 10) return true;
    // 172.16-31.x.x
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.x.x
    if (parts[0] === 192 && parts[1] === 168) return true;
    return false;
  }

  /**
   * Validate IPv6 address
   */
  private validateIPv6(value: string): string | null {
    if (isIP(value) === 6) {
      // Exclude loopback
      if (value === '::1' || value.toLowerCase() === '0000:0000:0000:0000:0000:0000:0000:0001') {
        return null;
      }
      return value.toLowerCase();
    }
    return null;
  }

  /**
   * Validate hostname
   */
  private validateHostname(value: string): string | null {
    // Basic hostname validation
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (hostnameRegex.test(value) && value.length <= 253) {
      // Exclude generic hostnames
      const lowerValue = value.toLowerCase();
      const genericHostnames = ['localhost', 'unknown', 'none', 'n/a'];
      if (genericHostnames.includes(lowerValue)) {
        return null;
      }
      return lowerValue;
    }
    return null;
  }

  /**
   * Validate domain name
   */
  private validateDomain(value: string): string | null {
    // Domain must have at least one dot and be valid hostname
    if (!value.includes('.')) {
      return null;
    }

    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    
    if (domainRegex.test(value) && value.length <= 253) {
      return value.toLowerCase();
    }
    return null;
  }

  /**
   * Validate email address
   */
  private validateEmail(value: string): string | null {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (emailRegex.test(value) && value.length <= 254) {
      return value.toLowerCase();
    }
    return null;
  }

  /**
   * Validate URL
   */
  private validateUrl(value: string): string | null {
    try {
      const url = new URL(value);
      // Only accept http/https
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return value;
      }
    } catch {
      // Invalid URL
    }
    return null;
  }

  /**
   * Validate file hash (MD5, SHA1, SHA256)
   */
  private validateFileHash(value: string): string | null {
    const lowerValue = value.toLowerCase();
    
    // MD5: 32 hex chars
    if (/^[a-f0-9]{32}$/.test(lowerValue)) {
      return lowerValue;
    }
    // SHA1: 40 hex chars
    if (/^[a-f0-9]{40}$/.test(lowerValue)) {
      return lowerValue;
    }
    // SHA256: 64 hex chars
    if (/^[a-f0-9]{64}$/.test(lowerValue)) {
      return lowerValue;
    }
    
    return null;
  }

  /**
   * Validate SHA256 hash
   */
  private validateSHA256(value: string): string | null {
    const lowerValue = value.toLowerCase();
    // SHA256: 64 hex chars
    if (/^[a-f0-9]{64}$/.test(lowerValue)) {
      return lowerValue;
    }
    return null;
  }

  /**
   * Validate SHA1 hash
   */
  private validateSHA1(value: string): string | null {
    const lowerValue = value.toLowerCase();
    // SHA1: 40 hex chars
    if (/^[a-f0-9]{40}$/.test(lowerValue)) {
      return lowerValue;
    }
    return null;
  }

  /**
   * Validate MD5 hash
   */
  private validateMD5(value: string): string | null {
    const lowerValue = value.toLowerCase();
    // MD5: 32 hex chars
    if (/^[a-f0-9]{32}$/.test(lowerValue)) {
      return lowerValue;
    }
    return null;
  }

  /**
   * Validate file path (Tier 1: excludes common system binaries)
   */
  private validateFilePath(value: string): string | null {
    // Basic file path validation - must look like a path
    if (value.includes('/') || value.includes('\\')) {
      // Exclude very short paths
      if (value.length < 3) {
        return null;
      }
      const lowerValue = value.toLowerCase();
      // Tier 1: Exclude common system binary paths
      for (const prefix of this.excludedPathPrefixes) {
        if (lowerValue.startsWith(prefix)) {
          return null;
        }
      }
      if (this.excludedPathsSet.has(lowerValue)) {
        return null;
      }
      return value;
    }
    return null;
  }

  /**
   * Validate generic string value (Tier 1: excludes common users like 'root')
   */
  private validateGenericValue(value: string): string | null {
    // Minimum length
    if (value.length < 2) {
      return null;
    }
    // Maximum length
    if (value.length > 256) {
      return null;
    }
    // Exclude common placeholder values
    const placeholders = ['unknown', 'none', 'n/a', '-', 'null', 'undefined', 'system'];
    if (placeholders.includes(value.toLowerCase())) {
      return null;
    }
    // Tier 1: Exclude common system usernames
    if (this.excludedUsersSet.has(value.toLowerCase())) {
      return null;
    }
    return value;
  }

  /**
   * Check if an entity should be excluded based on custom exclusion patterns
   */
  private isExcludedByCustomPattern(value: string, type: ObservableTypeKey): boolean {
    const patterns = this.exclusions.customExclusions?.[type];
    if (!patterns || patterns.length === 0) {
      return false;
    }
    const lowerValue = value.toLowerCase();
    return patterns.some((pattern) => {
      try {
        return new RegExp(pattern, 'i').test(lowerValue);
      } catch {
        return false;
      }
    });
  }

  // ============================================================
  // Tier 2: Process tree and MITRE metadata extraction
  // ============================================================

  /**
   * Extract process tree information from alerts.
   * Groups alerts by their process ancestry to identify related execution chains.
   */
  public extractProcessTrees(
    alerts: Array<{ _id: string; _source: Record<string, unknown> }>
  ): ProcessNode[] {
    const processMap = new Map<string, ProcessNode>();

    for (const alert of alerts) {
      const source = alert._source;
      const processName = get('process.name', source) as string | undefined;
      const processExe = get('process.executable', source) as string | undefined;
      const parentName = get('process.parent.name', source) as string | undefined;
      const parentExe = get('process.parent.executable', source) as string | undefined;
      const processArgs = get('process.args', source) as string[] | undefined;

      if (!processName && !processExe) {
        continue;
      }

      const key = `${processExe ?? processName}:${parentExe ?? parentName ?? 'none'}`;

      if (processMap.has(key)) {
        const existing = processMap.get(key)!;
        if (!existing.alertIds.includes(alert._id)) {
          existing.alertIds.push(alert._id);
        }
      } else {
        processMap.set(key, {
          name: processName ?? '',
          executable: processExe ?? '',
          parentName,
          parentExecutable: parentExe,
          args: processArgs,
          alertIds: [alert._id],
        });
      }
    }

    return Array.from(processMap.values());
  }

  /**
   * Extract MITRE ATT&CK tactics and techniques from alert metadata.
   * Returns a map of alertId -> { tactics, techniques }.
   */
  public extractMitreMetadata(
    alerts: Array<{ _id: string; _source: Record<string, unknown> }>
  ): Map<string, { tactics: string[]; techniques: string[] }> {
    const result = new Map<string, { tactics: string[]; techniques: string[] }>();

    for (const alert of alerts) {
      const source = alert._source;
      const threats = get('kibana.alert.rule.threat', source) as
        | Array<{
            tactic?: { name?: string; id?: string };
            technique?: Array<{ name?: string; id?: string; subtechnique?: Array<{ id?: string }> }>;
          }>
        | undefined;

      const tactics: string[] = [];
      const techniques: string[] = [];

      if (threats && Array.isArray(threats)) {
        for (const threat of threats) {
          if (threat.tactic?.name) {
            tactics.push(threat.tactic.name);
          }
          if (threat.technique && Array.isArray(threat.technique)) {
            for (const tech of threat.technique) {
              if (tech.id) {
                techniques.push(tech.id);
              }
              if (tech.subtechnique && Array.isArray(tech.subtechnique)) {
                for (const sub of tech.subtechnique) {
                  if (sub.id) {
                    techniques.push(sub.id);
                  }
                }
              }
            }
          }
        }
      }

      result.set(alert._id, {
        tactics: [...new Set(tactics)],
        techniques: [...new Set(techniques)],
      });
    }

    return result;
  }

  /**
   * Extract network connection metadata from alerts for cross-host correlation.
   */
  public extractNetworkMetadata(
    alerts: Array<{ _id: string; _source: Record<string, unknown> }>
  ): Map<string, { sourceIp?: string; destIp?: string; destPort?: number }> {
    const result = new Map<string, { sourceIp?: string; destIp?: string; destPort?: number }>();

    for (const alert of alerts) {
      const source = alert._source;
      const sourceIp = get('source.ip', source) as string | undefined;
      const destIp = get('destination.ip', source) as string | undefined;
      const destPort = get('destination.port', source) as number | undefined;

      if (sourceIp || destIp) {
        result.set(alert._id, { sourceIp, destIp, destPort });
      }
    }

    return result;
  }

  /**
   * Get entity type config for a given type
   */
  public getEntityTypeConfig(type: ObservableTypeKey): EntityTypeConfig | undefined {
    return this.entityTypeConfigs.find((config) => config.type === type);
  }

  /**
   * Get all configured entity types
   */
  public getConfiguredEntityTypes(): ObservableTypeKey[] {
    return this.entityTypeConfigs.map((config) => config.type);
  }

  /**
   * Create entity extraction service with custom configuration
   */
  public static withConfig(
    logger: Logger,
    customConfigs: EntityTypeConfig[],
    exclusions?: EntityExclusionConfig
  ): EntityExtractionService {
    // Merge custom configs with defaults
    const mergedConfigs = [...DEFAULT_ENTITY_TYPE_CONFIGS];
    
    for (const customConfig of customConfigs) {
      const existingIndex = mergedConfigs.findIndex((c) => c.type === customConfig.type);
      if (existingIndex >= 0) {
        // Override existing config
        mergedConfigs[existingIndex] = {
          ...mergedConfigs[existingIndex],
          ...customConfig,
          sourceFields: customConfig.sourceFields.length > 0 
            ? customConfig.sourceFields 
            : mergedConfigs[existingIndex].sourceFields,
        };
      } else {
        // Add new config
        mergedConfigs.push(customConfig);
      }
    }

    return new EntityExtractionService({
      logger,
      entityTypeConfigs: mergedConfigs,
      exclusions,
    });
  }
}
