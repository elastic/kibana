/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentResolveContext,
  AttachmentTypeDefinition,
} from '@kbn/agent-builder-server/attachments';
import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { Logger } from '@kbn/core/server';
import {
  getSeverityLabel,
  significantEventSchema,
  type SignificantEvent,
} from '@kbn/significant-events-schema';
import { SIGNIFICANT_EVENT_ATTACHMENT_TYPE } from '../../../common';
import type { GetScopedClients } from '../../routes/types';

interface CreateSignificantEventAttachmentTypeOptions {
  logger: Logger;
  getScopedClients: GetScopedClients;
}

const formatList = (values: string[] | undefined): string => {
  if (!values || values.length === 0) {
    return 'None';
  }
  return values.join(', ');
};

export const formatSignificantEventAsText = (event: SignificantEvent): string => {
  return [
    `Significant Event "${event.title}"`,
    `Event ID: ${event.event_id}`,
    `Event UUID: ${event.event_uuid}`,
    `Status: ${event.status}`,
    `Severity: ${getSeverityLabel(event.severity)}`,
    `Confidence: ${event.confidence}`,
    `Sources: ${formatList(event.source_ids)}`,
    event.symptom_hypothesis ? `Symptom hypothesis: ${event.symptom_hypothesis}` : undefined,
    `Summary: ${event.summary}`,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
};

export const createSignificantEventAttachmentType = ({
  logger,
  getScopedClients,
}: CreateSignificantEventAttachmentTypeOptions): AttachmentTypeDefinition<
  typeof SIGNIFICANT_EVENT_ATTACHMENT_TYPE,
  SignificantEvent
> => {
  const fetchByEventId = async (
    eventId: string,
    context: AttachmentResolveContext
  ): Promise<SignificantEvent | undefined> => {
    const { getEventSearchClient } = await getScopedClients({ request: context.request });
    const eventClient = await getEventSearchClient();

    return eventClient.findLatestByEventId(eventId);
  };

  /**
   * Reads the canonical (legacy) event store regardless of the feature flag. Used by `isStale` so
   * that fire-and-forget `.rule-events` write lag can never cause a stale attachment to appear
   * fresh — canonical is the authoritative write source.
   */
  const fetchCanonicalByEventId = async (
    eventId: string,
    context: AttachmentResolveContext
  ): Promise<SignificantEvent | undefined> => {
    const { getEventClient } = await getScopedClients({ request: context.request });
    const canonicalClient = await getEventClient();

    return canonicalClient.findLatestByEventId(eventId);
  };

  return {
    id: SIGNIFICANT_EVENT_ATTACHMENT_TYPE,
    isReadonly: true,
    validate: (input) => {
      const parseResult = significantEventSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },
    resolve: async (origin, context): Promise<SignificantEvent | undefined> => {
      try {
        return await fetchByEventId(origin, context);
      } catch (error) {
        logger.warn(
          `Failed to resolve significant event attachment for origin "${origin}": ${error}`
        );
        return undefined;
      }
    },
    isStale: async (
      attachment: VersionedAttachment<typeof SIGNIFICANT_EVENT_ATTACHMENT_TYPE, SignificantEvent>,
      context
    ): Promise<boolean> => {
      if (!attachment.origin) {
        return false;
      }

      const latestVersion = getLatestVersion(attachment);
      if (!latestVersion) {
        return false;
      }

      try {
        const latestEvent = await fetchCanonicalByEventId(attachment.origin, context);
        // Use the canonical client (not the flag-aware search client) so that fire-and-forget
        // `.rule-events` write lag cannot cause a stale attachment to appear fresh. Canonical is
        // the authoritative write source; @timestamp here always reflects the true latest version.
        // Avoid comparing event_uuid: when SIGNIFICANT_EVENTS_USE_RULE_EVENTS_READ is ON,
        // the search client returns group_hash as event_uuid (synthetic, not a real UUID),
        // which never matches the real UUID stored in the attachment — causing isStale to
        // always return true. @timestamp is sufficient to detect any write since attachment.
        return !latestEvent || latestVersion.data['@timestamp'] !== latestEvent['@timestamp'];
      } catch (error) {
        logger.warn(
          `Failed to check staleness for significant event attachment "${attachment.origin}": ${error}`
        );
        return false;
      }
    },
    format: (attachment) => ({
      getRepresentation: () => ({
        type: 'text',
        value: formatSignificantEventAsText(attachment.data),
      }),
    }),
    getAgentDescription: () =>
      'A significant event attachment represents a durable incident-level event. Rendering it inline displays a read-only event summary card in the conversation UI. Use it as authoritative context for the incident and affected sources.',
    getTools: () => [],
  };
};
