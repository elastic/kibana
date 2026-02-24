/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { WorkflowDataClient, DEFAULT_DEBOUNCE_SECONDS } from '../persistence';
import type { CaseTriggerConfig } from '../types';

/**
 * Case event types that can trigger actions
 */
export enum CaseEventType {
  ALERT_ATTACHED = 'alert_attached',
  ALERT_DETACHED = 'alert_detached',
  OBSERVABLE_ADDED = 'observable_added',
  OBSERVABLE_REMOVED = 'observable_removed',
  CASE_CREATED = 'case_created',
  CASE_UPDATED = 'case_updated',
  CASE_CLOSED = 'case_closed',
}

/**
 * Case event payload
 */
export interface CaseEvent {
  type: CaseEventType;
  caseId: string;
  spaceId: string;
  timestamp: string;
  data: {
    alertIds?: string[];
    observableIds?: string[];
    previousStatus?: string;
    newStatus?: string;
    userId?: string;
    [key: string]: unknown;
  };
}

/**
 * Action to trigger based on case events
 */
export enum TriggerAction {
  REGENERATE_ATTACK_DISCOVERY = 'regenerate_attack_discovery',
  INCREMENTAL_ATTACK_DISCOVERY = 'incremental_attack_discovery',
  EXTRACT_OBSERVABLES = 'extract_observables',
  NOTIFY_WEBHOOK = 'notify_webhook',
}

/**
 * Trigger action execution request
 */
export interface TriggerActionRequest {
  action: TriggerAction;
  caseId: string;
  eventType: CaseEventType;
  data: Record<string, unknown>;
}

/**
 * Pending trigger state for debouncing
 */
interface PendingTrigger {
  caseId: string;
  action: TriggerAction;
  events: CaseEvent[];
  scheduledAt: number;
  timeoutId?: NodeJS.Timeout;
}

/**
 * Service for managing case event triggers
 * Handles debouncing, trigger configuration, and action execution
 */
export class CaseEventTriggerService {
  private readonly logger: Logger;
  private readonly dataClient: WorkflowDataClient;
  private readonly pendingTriggers: Map<string, PendingTrigger> = new Map();
  private readonly defaultDebounceSeconds: number;

  constructor({
    logger,
    dataClient,
    defaultDebounceSeconds = DEFAULT_DEBOUNCE_SECONDS,
  }: {
    logger: Logger;
    dataClient: WorkflowDataClient;
    defaultDebounceSeconds?: number;
  }) {
    this.logger = logger;
    this.dataClient = dataClient;
    this.defaultDebounceSeconds = defaultDebounceSeconds;
  }

  /**
   * Static factory method
   */
  static create({
    logger,
    soClient,
    spaceId,
    currentUser,
  }: {
    logger: Logger;
    soClient: SavedObjectsClientContract;
    spaceId: string;
    currentUser: string;
  }): CaseEventTriggerService {
    const dataClient = new WorkflowDataClient({
      soClient,
      spaceId,
      currentUser,
    });

    return new CaseEventTriggerService({
      logger,
      dataClient,
    });
  }

  /**
   * Handle a case event and determine if triggers should fire
   */
  async handleEvent(
    event: CaseEvent,
    onTrigger: (request: TriggerActionRequest) => Promise<void>
  ): Promise<void> {
    this.logger.debug(`Handling case event: type=${event.type}, caseId=${event.caseId}`);

    // Get triggers configured for this case
    const triggers = await this.getTriggersForCase(event.caseId);

    if (triggers.length === 0) {
      this.logger.debug(`No triggers configured for case ${event.caseId}`);
      return;
    }

    // Filter triggers that match this event type
    const matchingTriggers = triggers.filter((trigger) => this.triggerMatchesEvent(trigger, event));

    if (matchingTriggers.length === 0) {
      this.logger.debug(
        `No matching triggers for event type ${event.type} on case ${event.caseId}`
      );
      return;
    }

    // Process each matching trigger
    for (const trigger of matchingTriggers) {
      await this.processTrigger(trigger, event, onTrigger);
    }
  }

  /**
   * Check if a trigger configuration matches an event
   */
  private triggerMatchesEvent(trigger: CaseTriggerConfig, event: CaseEvent): boolean {
    if (!trigger.enabled) {
      return false;
    }

    switch (trigger.triggerType) {
      case 'alert_attached':
        return event.type === CaseEventType.ALERT_ATTACHED;
      default:
        return false;
    }
  }

  /**
   * Process a trigger, potentially with debouncing
   */
  private async processTrigger(
    trigger: CaseTriggerConfig,
    event: CaseEvent,
    onTrigger: (request: TriggerActionRequest) => Promise<void>
  ): Promise<void> {
    const debounceSeconds = trigger.debounceSeconds ?? this.defaultDebounceSeconds;
    const triggerKey = `${event.caseId}:${trigger.action}`;

    // Check for existing pending trigger
    const existing = this.pendingTriggers.get(triggerKey);

    if (existing) {
      // Add event to pending trigger and reset debounce timer
      existing.events.push(event);
      if (existing.timeoutId) {
        clearTimeout(existing.timeoutId);
      }
    } else {
      // Create new pending trigger
      const pending: PendingTrigger = {
        caseId: event.caseId,
        action: trigger.action as TriggerAction,
        events: [event],
        scheduledAt: Date.now() + debounceSeconds * 1000,
      };
      this.pendingTriggers.set(triggerKey, pending);
    }

    // Get the pending trigger (new or existing)
    const pendingTrigger = this.pendingTriggers.get(triggerKey)!;

    // Schedule execution after debounce period
    pendingTrigger.timeoutId = setTimeout(async () => {
      try {
        // Execute the trigger
        await this.executeTrigger(pendingTrigger, trigger, onTrigger);
      } catch (error) {
        this.logger.error(`Failed to execute trigger for case ${event.caseId}: ${error}`);
      } finally {
        // Clean up
        this.pendingTriggers.delete(triggerKey);
      }
    }, debounceSeconds * 1000);

    this.logger.debug(
      `Scheduled trigger ${trigger.action} for case ${event.caseId} in ${debounceSeconds}s`
    );
  }

  /**
   * Execute a trigger action
   */
  private async executeTrigger(
    pending: PendingTrigger,
    trigger: CaseTriggerConfig,
    onTrigger: (request: TriggerActionRequest) => Promise<void>
  ): Promise<void> {
    this.logger.info(
      `Executing trigger ${pending.action} for case ${pending.caseId} with ${pending.events.length} accumulated events`
    );

    // Aggregate event data
    const alertIds = [...new Set(pending.events.flatMap((e) => e.data.alertIds ?? []))];

    const request: TriggerActionRequest = {
      action: pending.action,
      caseId: pending.caseId,
      eventType: pending.events[pending.events.length - 1].type,
      data: {
        alertIds,
        eventCount: pending.events.length,
        triggerConfig: trigger.config,
      },
    };

    await onTrigger(request);

    // Record trigger execution
    await this.dataClient.recordTriggerExecution(trigger.id);
  }

  /**
   * Get triggers configured for a specific case
   */
  async getTriggersForCase(caseId: string): Promise<CaseTriggerConfig[]> {
    const { results } = await this.dataClient.findTriggers({
      page: 1,
      perPage: 100,
    });

    return results.filter((trigger) => trigger.caseId === caseId);
  }

  /**
   * Create a new trigger for a case
   */
  async createTrigger(
    config: Omit<CaseTriggerConfig, 'id' | 'createdAt' | 'lastTriggeredAt' | 'triggerCount'>
  ): Promise<CaseTriggerConfig> {
    return this.dataClient.createTrigger(config);
  }

  /**
   * Delete a trigger
   */
  async deleteTrigger(triggerId: string): Promise<void> {
    await this.dataClient.deleteTrigger(triggerId);
  }

  /**
   * Cancel all pending triggers and clean up timers (for shutdown)
   */
  shutdown(): void {
    for (const [, pending] of this.pendingTriggers) {
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
    }
    this.pendingTriggers.clear();
    this.logger.debug('Cleaned up all pending triggers');
  }
}
