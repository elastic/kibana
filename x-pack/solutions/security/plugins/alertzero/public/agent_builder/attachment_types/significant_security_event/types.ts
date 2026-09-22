/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentNavigationDeps } from '../navigation';
import { buildAlertsLookupEsql, buildEventsLookupEsql } from '../navigation';
import { buildDiscoverActionButton } from '../shared/attachment_definition_helpers';
import { significantSecurityEventAttachmentDataSchema } from '../../../../common/significant_security_event_schema';
import type { SignificantSecurityEventAttachmentData } from '../../../../common/significant_security_event_schema';

export type { SignificantSecurityEventAttachmentData } from '../../../../common/significant_security_event_schema';

export type SignificantSecurityEventAttachment = Attachment<
  string,
  SignificantSecurityEventAttachmentData
>;

/** Convenience view-model aliases for the renderer, all inferred from the zod schema. */
export type SecurityKnowledgeIndicator =
  SignificantSecurityEventAttachmentData['security_knowledge_indicators'][number];
export type TimelineEntry = SignificantSecurityEventAttachmentData['timeline'][number];
export type SignificantSecurityEventRef = NonNullable<
  SignificantSecurityEventAttachmentData['events']
>[number];
export type SignificantSecurityAlertRef = NonNullable<
  SignificantSecurityEventAttachmentData['alerts']
>[number];
export type HuntResult = NonNullable<SignificantSecurityEventAttachmentData['hunt_result']>;
export type MapsToProposal = NonNullable<
  SignificantSecurityEventAttachmentData['maps_to_proposal']
>;

/**
 * Validates the raw attachment payload against the zod schema. The server already
 * validates on write with the identical schema, so a payload that fails here is one
 * the server would have rejected; the renderer falls back to its empty state.
 */
export const parseSignificantSecurityEventData = (
  candidate: unknown
): SignificantSecurityEventAttachmentData | undefined => {
  const result = significantSecurityEventAttachmentDataSchema.safeParse(candidate);
  return result.success ? result.data : undefined;
};

/**
 * The single Discover exit the SSE header offers: all of its referenced events at once, or
 * its alerts when it carries no events. Shared with inline content, which renders the
 * headline fields itself when this yields no button (Agent Builder then omits the chrome
 * header entirely, so title/severity/status/confidence would otherwise be invisible).
 */
export const buildSignificantSecurityEventActionButtons = ({
  parsed,
  navigation,
  openEventsLabel,
  openAlertsLabel,
}: {
  parsed: SignificantSecurityEventAttachmentData | undefined;
  navigation: AttachmentNavigationDeps;
  openEventsLabel: string;
  openAlertsLabel: string;
}): ActionButton[] => {
  if (!parsed) {
    return [];
  }

  const events = parsed.events ?? [];
  const alerts = parsed.alerts ?? [];
  const exit =
    events.length > 0
      ? { esql: buildEventsLookupEsql({ events }), label: openEventsLabel }
      : {
          esql: buildAlertsLookupEsql({ alerts, spaceId: navigation.spaceId }),
          label: openAlertsLabel,
        };

  return buildDiscoverActionButton({
    share: navigation.share,
    esql: exit.esql,
    label: exit.label,
  });
};
