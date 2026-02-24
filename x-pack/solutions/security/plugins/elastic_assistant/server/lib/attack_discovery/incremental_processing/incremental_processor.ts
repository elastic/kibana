/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { v4 as uuidv4 } from 'uuid';

import type {
  IncrementalAttackDiscovery,
  IncrementalProcessingRequest,
  IncrementalProcessingResult,
  DeltaAlertResult,
} from './types';
import type {
  AttackDiscoveryMergeService,
  type AlertForProcessing,
  type AttackDiscoveryResult,
} from '../batch_processing';

/**
 * Function type for generating Attack Discovery from alerts
 */
export type GenerateDiscoveryFn = (
  alerts: AlertForProcessing[]
) => Promise<AttackDiscoveryResult[]>;

/**
 * Service for incremental Attack Discovery processing
 */
export class IncrementalProcessor {
  private readonly logger: Logger;
  private readonly mergeService: AttackDiscoveryMergeService;
  private readonly generateDiscovery: GenerateDiscoveryFn;

  constructor({
    logger,
    mergeService,
    generateDiscovery,
  }: {
    logger: Logger;
    mergeService: AttackDiscoveryMergeService;
    generateDiscovery: GenerateDiscoveryFn;
  }) {
    this.logger = logger;
    this.mergeService = mergeService;
    this.generateDiscovery = generateDiscovery;
  }

  /**
   * Identify delta (new, unprocessed) alerts
   */
  identifyDeltaAlerts(allAlertIds: string[], processedAlertIds: string[]): DeltaAlertResult {
    const processedSet = new Set(processedAlertIds);
    const newAlerts = allAlertIds.filter((id) => !processedSet.has(id));
    const processedAlerts = allAlertIds.filter((id) => processedSet.has(id));

    return {
      newAlerts,
      processedAlerts,
      totalAlerts: allAlertIds,
      hasNewAlerts: newAlerts.length > 0,
    };
  }

  /**
   * Process alerts incrementally
   */
  async process(request: IncrementalProcessingRequest): Promise<IncrementalProcessingResult> {
    const startTime = Date.now();
    const now = new Date().toISOString();

    // If no existing discovery or mode is 'full', generate from scratch
    if (!request.existingDiscovery || request.mode === 'full') {
      return this.processFullGeneration(request, startTime, now);
    }

    // If no new alerts, return existing discovery unchanged
    if (request.newAlerts.length === 0) {
      return {
        discovery: request.existingDiscovery,
        newlyProcessedAlertIds: [],
        action: 'enhanced',
        metrics: {
          newAlertsProcessed: 0,
          totalAlertsInScope: request.allAlertIds.length,
          processingDurationMs: Date.now() - startTime,
          mergeOperations: 0,
        },
      };
    }

    // Process new alerts only
    if (request.mode === 'delta') {
      return this.processDeltaGeneration(request, startTime, now);
    }

    // Mode is 'enhance' - generate from new alerts and merge with existing
    return this.processEnhanceGeneration(request, startTime, now);
  }

  /**
   * Full generation - process all alerts from scratch
   */
  private async processFullGeneration(
    request: IncrementalProcessingRequest,
    startTime: number,
    now: string
  ): Promise<IncrementalProcessingResult> {
    this.logger.info(
      `Starting full Attack Discovery generation for ${request.newAlerts.length} alerts`
    );

    const discoveries = await this.generateDiscovery(request.newAlerts);

    // Take the first discovery or create a placeholder if none
    const primaryDiscovery = discoveries[0] ?? this.createEmptyDiscovery();

    // Merge additional discoveries into the primary one
    let finalDiscovery = primaryDiscovery;
    let mergeOperations = 0;

    if (discoveries.length > 1) {
      for (let i = 1; i < discoveries.length; i++) {
        const merged = await this.mergeService.merge([finalDiscovery], [discoveries[i]]);
        finalDiscovery = merged[0] ?? finalDiscovery;
        mergeOperations++;
      }
    }

    // Create incremental discovery
    const incrementalDiscovery: IncrementalAttackDiscovery = {
      ...finalDiscovery,
      processedAlertIds: request.newAlerts.map((a) => a.id),
      isIncremental: false,
      lastUpdatedAt: now,
      updateCount: 0,
      originalCreatedAt: now,
    };

    return {
      discovery: incrementalDiscovery,
      newlyProcessedAlertIds: request.newAlerts.map((a) => a.id),
      action: 'created',
      metrics: {
        newAlertsProcessed: request.newAlerts.length,
        totalAlertsInScope: request.allAlertIds.length,
        processingDurationMs: Date.now() - startTime,
        mergeOperations,
      },
    };
  }

  /**
   * Delta generation - only process new alerts and merge with existing
   */
  private async processDeltaGeneration(
    request: IncrementalProcessingRequest,
    startTime: number,
    now: string
  ): Promise<IncrementalProcessingResult> {
    const existingDiscovery = request.existingDiscovery!;

    this.logger.info(
      `Processing delta of ${request.newAlerts.length} new alerts for existing discovery ${existingDiscovery.id}`
    );

    // Generate discoveries from new alerts only
    const newDiscoveries = await this.generateDiscovery(request.newAlerts);

    if (newDiscoveries.length === 0) {
      // No new discoveries found, but still mark alerts as processed
      const updatedDiscovery: IncrementalAttackDiscovery = {
        ...existingDiscovery,
        processedAlertIds: [
          ...existingDiscovery.processedAlertIds,
          ...request.newAlerts.map((a) => a.id),
        ],
        lastUpdatedAt: now,
        updateCount: existingDiscovery.updateCount + 1,
        isIncremental: true,
      };

      return {
        discovery: updatedDiscovery,
        newlyProcessedAlertIds: request.newAlerts.map((a) => a.id),
        action: 'enhanced',
        metrics: {
          newAlertsProcessed: request.newAlerts.length,
          totalAlertsInScope: request.allAlertIds.length,
          processingDurationMs: Date.now() - startTime,
          mergeOperations: 0,
        },
      };
    }

    // Merge new discoveries with existing
    const existingAsResult: AttackDiscoveryResult = {
      id: existingDiscovery.id,
      title: existingDiscovery.title,
      summaryMarkdown: existingDiscovery.summaryMarkdown,
      detailsMarkdown: existingDiscovery.detailsMarkdown,
      entitySummaryMarkdown: existingDiscovery.entitySummaryMarkdown,
      alertIds: existingDiscovery.alertIds,
      mitreAttackTactics: existingDiscovery.mitreAttackTactics,
      riskScore: existingDiscovery.riskScore,
    };

    let mergedResult = existingAsResult;
    let mergeOperations = 0;

    for (const newDiscovery of newDiscoveries) {
      const merged = await this.mergeService.merge([mergedResult], [newDiscovery]);
      mergedResult = merged[0] ?? mergedResult;
      mergeOperations++;
    }

    // Create updated incremental discovery
    const updatedDiscovery: IncrementalAttackDiscovery = {
      ...mergedResult,
      processedAlertIds: [
        ...new Set([...existingDiscovery.processedAlertIds, ...request.newAlerts.map((a) => a.id)]),
      ],
      isIncremental: true,
      parentDiscoveryId: existingDiscovery.parentDiscoveryId ?? existingDiscovery.id,
      lastUpdatedAt: now,
      updateCount: existingDiscovery.updateCount + 1,
      originalCreatedAt: existingDiscovery.originalCreatedAt,
    };

    return {
      discovery: updatedDiscovery,
      newlyProcessedAlertIds: request.newAlerts.map((a) => a.id),
      action: 'enhanced',
      metrics: {
        newAlertsProcessed: request.newAlerts.length,
        totalAlertsInScope: request.allAlertIds.length,
        processingDurationMs: Date.now() - startTime,
        mergeOperations,
      },
    };
  }

  /**
   * Enhance generation - process new alerts with context of existing discovery
   */
  private async processEnhanceGeneration(
    request: IncrementalProcessingRequest,
    startTime: number,
    now: string
  ): Promise<IncrementalProcessingResult> {
    const existingDiscovery = request.existingDiscovery!;

    this.logger.info(
      `Enhancing existing discovery ${existingDiscovery.id} with ${request.newAlerts.length} new alerts`
    );

    // For enhance mode, we could potentially include existing discovery context
    // in the generation prompt, but for now we use delta approach
    return this.processDeltaGeneration(request, startTime, now);
  }

  /**
   * Create an empty discovery placeholder
   */
  private createEmptyDiscovery(): AttackDiscoveryResult {
    return {
      id: uuidv4(),
      title: 'No Attack Patterns Detected',
      summaryMarkdown: 'No significant attack patterns were identified in the analyzed alerts.',
      detailsMarkdown: 'The analyzed alerts did not reveal any clear attack patterns or chains.',
      alertIds: [],
    };
  }

  /**
   * Check if incremental update is needed based on alert counts
   */
  shouldTriggerIncrementalUpdate(
    currentState: { processedAlertIds: string[]; lastUpdatedAt: string },
    currentAlertIds: string[],
    options: {
      minNewAlerts?: number;
      minTimeSinceLastUpdate?: number; // seconds
    } = {}
  ): boolean {
    const { minNewAlerts = 1, minTimeSinceLastUpdate = 0 } = options;

    // Check if we have enough new alerts
    const delta = this.identifyDeltaAlerts(currentAlertIds, currentState.processedAlertIds);
    if (delta.newAlerts.length < minNewAlerts) {
      return false;
    }

    // Check if enough time has passed since last update
    if (minTimeSinceLastUpdate > 0) {
      const lastUpdate = new Date(currentState.lastUpdatedAt).getTime();
      const now = Date.now();
      const secondsSinceUpdate = (now - lastUpdate) / 1000;
      if (secondsSinceUpdate < minTimeSinceLastUpdate) {
        return false;
      }
    }

    return true;
  }
}
