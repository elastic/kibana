/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { JsonValue } from '@kbn/utility-types';
import { isAttachmentNotFoundError } from '@kbn/agent-builder-common';
import type { AttachmentPublicClient, ConversationPublicClient } from '@kbn/agent-builder-server';
import type { InvestigationAttachmentDocService } from '@kbn/agentic-investigations-plugin/server';
import { MAX_INVESTIGATION_NOTIFICATIONS } from '../../../common';
import type { InvestigationNotificationDestination } from '../../../common';
import { notificationRoutingAttachment, notificationRoutingSchema } from './notification_routing';
import type {
  NotificationAttempt,
  NotificationDestination,
  NotificationOutcome,
  NotificationPhase,
  NotificationRouting,
  StoredNotificationRouting,
} from './notification_routing';

const canonicalize = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])])
    );
  }
  return value;
};

const getDestinationId = ({
  type,
  connector_id,
  params,
}: InvestigationNotificationDestination): string =>
  createHash('sha256')
    .update(JSON.stringify([type, connector_id, canonicalize(params)]))
    .digest('hex');

/** Adds immutable endpoints and their automation associations, enforcing the retained association limit. */
export const mergeNotificationDestinations = (
  destinations: NotificationDestination[],
  inputs: InvestigationNotificationDestination[]
): NotificationDestination[] => {
  const merged = structuredClone(destinations);
  for (const input of inputs) {
    const id = getDestinationId(input);
    let destination = merged.find((entry) => entry.id === id);
    if (!destination) {
      const { automation_id, automation_name, ...configuration } = input;
      destination = { ...configuration, id, automations: [] };
      merged.push(destination);
    }
    const automationId = input.automation_id || undefined;
    if (!destination.automations.some((automation) => automation.id === automationId)) {
      destination.automations.push({ id: automationId, name: input.automation_name });
    }
  }
  const associations = merged.reduce(
    (count, destination) => count + destination.automations.length,
    0
  );
  if (associations > MAX_INVESTIGATION_NOTIFICATIONS) {
    throw new Error(
      `An investigation supports at most ${MAX_INVESTIGATION_NOTIFICATIONS} notification associations`
    );
  }
  return merged;
};

export class NotificationRoutingClient {
  readonly id: string;

  constructor(
    private readonly deps: {
      service: InvestigationAttachmentDocService<StoredNotificationRouting>;
      attachments: AttachmentPublicClient;
      conversations: ConversationPublicClient;
      spaceId: string;
      conversationId: string;
      investigationId: string;
    }
  ) {
    this.id = notificationRoutingAttachment.documentId(deps.spaceId, deps.conversationId);
  }

  async get(): Promise<NotificationRouting | undefined> {
    const document = await this.deps.service.get(this.id, this.deps.spaceId);
    if (!document) {
      return undefined;
    }
    const routing = notificationRoutingSchema.parse(document);
    if (
      routing.investigationId !== this.deps.investigationId ||
      routing.conversationId !== this.deps.conversationId
    ) {
      throw new Error('Notification routing does not belong to this investigation');
    }
    return routing;
  }

  async isActive(): Promise<boolean> {
    try {
      const attachment = await this.deps.attachments.get({
        conversationId: this.deps.conversationId,
        attachmentId: this.id,
      });
      return attachment.active !== false;
    } catch (error) {
      if (!isAttachmentNotFoundError(error)) {
        throw error;
      }
      return true;
    }
  }

  private async write(
    mutate: (current: NotificationRouting) => StoredNotificationRouting
  ): Promise<NotificationRouting> {
    const { service, attachments, conversations, spaceId, conversationId, investigationId } =
      this.deps;
    return notificationRoutingAttachment.writeAndAttach({
      service,
      attachments,
      conversations,
      spaceId,
      conversationId,
      id: this.id,
      mutate: (current) => {
        const routing = current
          ? notificationRoutingSchema.parse(current)
          : {
              id: this.id,
              spaceId,
              conversationId,
              investigationId,
              destinations: [],
              executions: [],
              attempts: [],
            };
        if (
          routing.investigationId !== investigationId ||
          routing.conversationId !== conversationId ||
          routing.spaceId !== spaceId
        ) {
          throw new Error('Notification routing does not belong to this investigation');
        }
        const { id, ...document } = notificationRoutingSchema.parse({
          ...mutate(routing),
          id: this.id,
        });
        return document;
      },
    });
  }

  /** Initialization adds destinations once and freezes this execution's participants; replay keeps the snapshot. */
  async initialize(
    executionId: string,
    workflowId: string,
    inputs: InvestigationNotificationDestination[]
  ): Promise<NotificationRouting> {
    return this.write((current) => {
      const execution = current.executions.find(({ id }) => id === executionId);
      if (execution) {
        if (execution.workflow_id !== workflowId) {
          throw new Error('Notification execution workflow does not match');
        }
        return current;
      }
      const destinations = mergeNotificationDestinations(current.destinations, inputs);
      return {
        ...current,
        destinations,
        executions: [
          ...current.executions,
          {
            id: executionId,
            workflow_id: workflowId,
            destination_ids: destinations.map(({ id }) => id),
          },
        ],
      };
    });
  }

  async selectTerminalPhase(
    executionId: string,
    phase: 'completed' | 'failed'
  ): Promise<NotificationRouting> {
    return this.write((current) => {
      const execution = current.executions.find(({ id }) => id === executionId);
      if (!execution) {
        throw new Error('Notification execution was not initialized');
      }
      if (execution.terminal_phase && execution.terminal_phase !== phase) {
        throw new Error('Notification execution already selected a different terminal phase');
      }
      return {
        ...current,
        executions: current.executions.map((entry) =>
          entry.id === executionId ? { ...entry, terminal_phase: phase } : entry
        ),
      };
    });
  }

  async claim(
    executionId: string,
    destinationId: string,
    phase: NotificationPhase,
    attemptId: string,
    createsRoot: boolean
  ): Promise<NotificationAttempt | undefined> {
    const routing = await this.write((current) => {
      const execution = current.executions.find(({ id }) => id === executionId);
      if (
        !execution?.destination_ids.includes(destinationId) ||
        (phase !== 'started' && execution.terminal_phase !== phase)
      ) {
        throw new Error('Notification attempt does not belong to this execution');
      }
      if (
        current.attempts.some(
          (attempt) =>
            attempt.execution_id === executionId &&
            attempt.destination_id === destinationId &&
            attempt.phase === phase
        )
      ) {
        return current;
      }
      return {
        ...current,
        attempts: [
          ...current.attempts,
          {
            execution_id: executionId,
            destination_id: destinationId,
            phase,
            attempt_id: attemptId,
            status: 'unconfirmed',
            attempted_at: new Date().toISOString(),
            creates_root: createsRoot,
          },
        ],
      };
    });
    return routing.attempts.find((attempt) => attempt.attempt_id === attemptId);
  }

  /** Saves the matching receipt and confirmed thread in one write, leaving other executions and attempts intact. */
  async record(attemptId: string, outcome: NotificationOutcome): Promise<void> {
    await this.write((current) => {
      const attempt = current.attempts.find((entry) => entry.attempt_id === attemptId);
      if (!attempt) {
        throw new Error('Notification attempt disappeared');
      }
      const { channel, ...result } = outcome;
      const destinations = current.destinations.map((destination) => {
        if (
          destination.id !== attempt.destination_id ||
          attempt.phase !== 'started' ||
          result.status !== 'sent'
        ) {
          return destination;
        }
        const explicitParent = destination.params.thread_ts;
        const threadTs =
          destination.thread?.thread_ts ||
          (typeof explicitParent === 'string' && explicitParent) ||
          result.message_ts;
        if (!threadTs || !channel) {
          throw new Error('Confirmed notification has no thread reference');
        }
        return { ...destination, thread: { channel, thread_ts: threadTs } };
      });
      return {
        ...current,
        destinations,
        attempts: current.attempts.map((entry) =>
          entry.attempt_id === attemptId
            ? {
                ...entry,
                error: undefined,
                message_ts: undefined,
                sent_at: undefined,
                ...result,
              }
            : entry
        ),
      };
    });
  }
}
