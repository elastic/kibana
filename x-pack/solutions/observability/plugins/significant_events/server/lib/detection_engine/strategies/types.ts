/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { DetectionStrategyDescriptor } from '../../../../common/detection_engine/types';
import type { KnowledgeIndicatorClient } from '../../knowledge_indicators/knowledge_indicator_client';

/** What a strategy gets for one evaluation. */
export interface StrategyContext {
  /** Reads the customer's data (source views). */
  dataEsClient: ElasticsearchClient;
  /** Reads alert indices. */
  esClient: ElasticsearchClient;
  spaceId: string;
  /** Enabled sources; strategies watch only what the admin chose. */
  sources: NightshiftSource[];
  getKnowledgeIndicatorClient: () => Promise<KnowledgeIndicatorClient>;
  /** Buckets to evaluate: [from, to), each `bucketMs` long. */
  from: number;
  to: number;
  bucketMs: number;
  logger: Logger;
}

/**
 * One evaluation of one series in one bucket. Strategies report these for every series they
 * evaluate, breaching or not, because the baseline check needs the non-breaching ones too.
 */
export interface StrategyObservation {
  fingerprint: string;
  service: string;
  bucket_start: number;
  value: number;
  unit: string;
  /** The strategy's own trigger. Only these become detections. */
  looks_off: boolean;
  title: string;
  description: string;
  importance: number;
  evidence_esql: string;
  source_id?: string;
  /** When the problem started, if the strategy knows better than the bucket start. */
  since?: string;
}

export interface StrategyEvaluation {
  observations: StrategyObservation[];
  /** Things the strategy could not do, such as a source without the fields it needs. */
  notes: string[];
}

/**
 * A detection strategy: one way of finding that something may be wrong. It watches data or
 * alerts and reports what looks off. It never decides whether a detection becomes an event.
 */
export interface IDetectionStrategy {
  descriptor: DetectionStrategyDescriptor;
  /** Evaluates every bucket in [from, to). */
  evaluate(context: StrategyContext): Promise<StrategyEvaluation>;
}
