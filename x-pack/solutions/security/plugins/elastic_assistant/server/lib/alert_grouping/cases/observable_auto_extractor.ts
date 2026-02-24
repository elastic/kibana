/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ObservableTypeKey, ExtractedEntity, EntityTypeConfig } from '../types';
import { EntityExtractionService } from '../services/entity_extraction_service';
import { DEFAULT_ENTITY_TYPE_CONFIGS } from '../types';

/**
 * Observable type mapping from extracted entities to case observables
 */
export interface CaseObservable {
  typeKey: ObservableTypeKey;
  value: string;
  description?: string;
  createdAt: string;
  /** Source information */
  source: {
    alertId?: string;
    field?: string;
    automatic: boolean;
  };
}

/**
 * Configuration for observable auto-extraction
 */
export interface ObservableAutoExtractionConfig {
  /** Whether to auto-extract observables when alerts are attached */
  enabled: boolean;
  /** Entity types to extract as observables */
  entityTypes: ObservableTypeKey[];
  /** Maximum observables per type per case */
  maxObservablesPerType?: number;
  /** Whether to deduplicate against existing case observables */
  deduplicateExisting?: boolean;
  /** Custom entity type configurations */
  customEntityConfigs?: Partial<Record<ObservableTypeKey, EntityTypeConfig>>;
}

/**
 * Default observable auto-extraction configuration
 */
export const DEFAULT_OBSERVABLE_AUTO_EXTRACTION_CONFIG: ObservableAutoExtractionConfig = {
  enabled: true,
  entityTypes: [
    'ipv4' as ObservableTypeKey,
    'hostname' as ObservableTypeKey,
    'domain' as ObservableTypeKey,
    'user' as ObservableTypeKey,
    'file_hash_sha256' as ObservableTypeKey,
    'file_hash_md5' as ObservableTypeKey,
    'url' as ObservableTypeKey,
    'email' as ObservableTypeKey,
  ],
  maxObservablesPerType: 50,
  deduplicateExisting: true,
};

/**
 * Result of observable extraction
 */
export interface ObservableExtractionResult {
  observables: CaseObservable[];
  entitiesByType: Record<string, ExtractedEntity[]>;
  totalExtracted: number;
  duplicatesSkipped: number;
}

/**
 * Service for automatically extracting observables from alerts for case attachment
 */
export class ObservableAutoExtractor {
  private readonly logger: Logger;
  private readonly config: ObservableAutoExtractionConfig;
  private readonly entityExtractionService: EntityExtractionService;

  constructor({
    logger,
    config = DEFAULT_OBSERVABLE_AUTO_EXTRACTION_CONFIG,
  }: {
    logger: Logger;
    config?: Partial<ObservableAutoExtractionConfig>;
  }) {
    this.logger = logger;
    this.config = { ...DEFAULT_OBSERVABLE_AUTO_EXTRACTION_CONFIG, ...config };

    // Create entity extraction service with custom configs if provided
    const entityConfigs = config.customEntityConfigs
      ? EntityExtractionService.withConfig(config.customEntityConfigs)
      : DEFAULT_ENTITY_TYPE_CONFIGS;

    this.entityExtractionService = new EntityExtractionService({
      logger,
      entityTypeConfigs: entityConfigs,
    });
  }

  /**
   * Extract observables from alert documents
   */
  extractObservablesFromAlerts(
    alerts: Array<{ _id: string; _source: Record<string, unknown> }>,
    existingObservables: CaseObservable[] = []
  ): ObservableExtractionResult {
    if (!this.config.enabled) {
      return {
        observables: [],
        entitiesByType: {},
        totalExtracted: 0,
        duplicatesSkipped: 0,
      };
    }

    // Extract entities from alerts
    const { entities, entitiesByType } = this.entityExtractionService.extractEntities(alerts);

    // Filter to configured entity types
    const filteredEntities = entities.filter((entity) =>
      this.config.entityTypes.includes(entity.type as ObservableTypeKey)
    );

    // Build set of existing observable values for deduplication
    const existingValues = new Set(
      existingObservables.map((obs) => `${obs.typeKey}:${obs.value.toLowerCase()}`)
    );

    // Convert entities to observables
    const now = new Date().toISOString();
    const observables: CaseObservable[] = [];
    let duplicatesSkipped = 0;

    // Track counts per type for max limit
    const countsPerType: Record<string, number> = {};

    for (const entity of filteredEntities) {
      const key = `${entity.type}:${entity.normalizedValue.toLowerCase()}`;

      // Skip duplicates if deduplication is enabled
      if (this.config.deduplicateExisting && existingValues.has(key)) {
        duplicatesSkipped++;
        continue;
      }

      // Check max per type limit
      const currentCount = countsPerType[entity.type] ?? 0;
      if (this.config.maxObservablesPerType && currentCount >= this.config.maxObservablesPerType) {
        continue;
      }

      // Add to observables
      observables.push({
        typeKey: entity.type as ObservableTypeKey,
        value: entity.normalizedValue,
        description: `Auto-extracted from alert ${entity.sourceAlertId} (field: ${entity.sourceField})`,
        createdAt: now,
        source: {
          alertId: entity.sourceAlertId,
          field: entity.sourceField,
          automatic: true,
        },
      });

      // Update counts
      countsPerType[entity.type] = currentCount + 1;
      existingValues.add(key);
    }

    this.logger.debug(
      `Observable auto-extraction completed: ${observables.length} observables from ${alerts.length} alerts, ${duplicatesSkipped} duplicates skipped`
    );

    return {
      observables,
      entitiesByType,
      totalExtracted: observables.length,
      duplicatesSkipped,
    };
  }

  /**
   * Extract observables from a single alert
   */
  extractObservablesFromAlert(
    alert: { _id: string; _source: Record<string, unknown> },
    existingObservables: CaseObservable[] = []
  ): ObservableExtractionResult {
    return this.extractObservablesFromAlerts([alert], existingObservables);
  }

  /**
   * Get the current configuration
   */
  getConfig(): ObservableAutoExtractionConfig {
    return { ...this.config };
  }
}
