/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface PipelineConfig {
  readonly enabled: boolean;
  readonly intervalMinutes: number;
  readonly deduplication: DeduplicationConfig;
  readonly entityExtraction: EntityExtractionConfig;
  readonly caseMatching: CaseMatchingConfig;
  readonly incrementalAd: IncrementalAdConfig;
}

export interface DeduplicationConfig {
  readonly enabled: boolean;
  readonly similarityThreshold: number;
  readonly maxResults: number;
}

export interface EntityExtractionConfig {
  readonly enabled: boolean;
  readonly exclusionFilters: Record<string, string[]>;
}

export interface CaseMatchingConfig {
  readonly enabled: boolean;
  readonly strategy: 'strict' | 'relaxed' | 'weighted' | 'temporal';
  readonly matchThreshold: number;
  readonly weights: EntityWeights;
  readonly temporalDecayDays: number;
}

export interface EntityWeights {
  readonly ip: number;
  readonly hostname: number;
  readonly user: number;
  readonly fileHash: number;
  readonly domain: number;
  readonly process: number;
  readonly other: number;
}

export interface IncrementalAdConfig {
  readonly enabled: boolean;
  readonly minNewAlerts: number;
  readonly autoTriggerOnAttachment: boolean;
}

export type ObservableTypeKey =
  | 'ipv4'
  | 'ipv6'
  | 'url'
  | 'hostname'
  | 'file_hash'
  | 'file_path'
  | 'email'
  | 'domain'
  | 'agent_id'
  | 'user'
  | 'process'
  | 'registry'
  | 'service';

export interface ExtractedEntity {
  readonly typeKey: ObservableTypeKey;
  readonly value: string;
  readonly sourceField: string;
  readonly alertId: string;
}

export interface CaseMatchScore {
  readonly caseId: string;
  readonly caseTitle: string;
  readonly score: number;
  readonly matchedEntities: Array<{
    readonly typeKey: ObservableTypeKey;
    readonly value: string;
  }>;
  readonly caseUpdatedAt: string;
}

export interface PipelineExecutionResult {
  readonly executionId: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly alertsProcessed: number;
  readonly alertsDeduplicated: number;
  readonly entitiesExtracted: number;
  readonly casesMatched: number;
  readonly casesCreated: number;
  readonly alertsAttached: number;
  readonly adTriggered: number;
  readonly errors: string[];
}

export interface ProcessedAlertTracker {
  readonly caseId: string;
  readonly processedAlertIds: string[];
  readonly lastProcessedAt: string;
  readonly generationUuids: string[];
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  enabled: false,
  intervalMinutes: 15,
  deduplication: {
    enabled: true,
    similarityThreshold: 0.85,
    maxResults: 10,
  },
  entityExtraction: {
    enabled: true,
    exclusionFilters: {
      user: ['SYSTEM', 'LOCAL SERVICE', 'NETWORK SERVICE'],
      hostname: ['localhost'],
    },
  },
  caseMatching: {
    enabled: true,
    strategy: 'weighted',
    matchThreshold: 0.3,
    weights: {
      ip: 1.0,
      hostname: 0.8,
      user: 0.7,
      fileHash: 1.0,
      domain: 0.6,
      process: 0.5,
      other: 0.3,
    },
    temporalDecayDays: 30,
  },
  incrementalAd: {
    enabled: true,
    minNewAlerts: 2,
    autoTriggerOnAttachment: true,
  },
};
