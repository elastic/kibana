/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AlertFeatures {
  readonly ruleName: string;
  readonly ruleDescription?: string;
  readonly severity?: string;
  readonly riskScore?: number;
  readonly mitreTactics: string[];
  readonly mitreTechniques: string[];
  readonly processName?: string;
  readonly processExecutable?: string;
  readonly processCommandLine?: string;
  readonly parentProcessName?: string;
  readonly hostName?: string;
  readonly userName?: string;
  readonly sourceIp?: string;
  readonly destinationIp?: string;
  readonly fileName?: string;
  readonly filePath?: string;
  readonly fileHash?: string;
  readonly eventCategory?: string;
  readonly eventAction?: string;
  readonly networkProtocol?: string;
  readonly dnsQuestionName?: string;
}

export interface AlertVectorDocument {
  readonly alert_id: string;
  readonly alert_index: string;
  readonly vector: number[];
  readonly feature_text_hash: string;
  readonly inference_endpoint_id: string;
  readonly feature_text: string;
  readonly '@timestamp': string;
}

export interface VectorizationResult {
  readonly alertId: string;
  readonly success: boolean;
  readonly error?: string;
  readonly vectorDocumentId?: string;
}

export interface BatchVectorizationResult {
  readonly total: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly results: VectorizationResult[];
}

export interface SimilarAlert {
  readonly alertId: string;
  readonly alertIndex: string;
  readonly score: number;
  readonly featureText: string;
}

export interface SimilaritySearchResult {
  readonly query: {
    readonly alertId?: string;
    readonly text?: string;
  };
  readonly similarAlerts: SimilarAlert[];
  readonly total: number;
  readonly threshold: number;
}

export const ALERT_VECTOR_INDEX_PREFIX = '.security-alert-vectors';

export const getAlertVectorIndexName = (spaceId: string): string =>
  `${ALERT_VECTOR_INDEX_PREFIX}-${spaceId}`;

export const DEFAULT_SIMILARITY_THRESHOLD = 0.85;
export const DEFAULT_MAX_RESULTS = 10;
export const DEFAULT_BATCH_SIZE = 20;
export const DEFAULT_INFERENCE_ENDPOINT_ID = '.multilingual-e5-small-elasticsearch';
