/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ActionButton, HeaderBadge } from '@kbn/agent-builder-browser/attachments';
import { i18n } from '@kbn/i18n';
import type { AttachmentNavigationDeps } from '../navigation';
import { buildAlertsLookupEsql, buildEventsLookupEsql } from '../navigation';
import { buildDiscoverActionButton, joinSubtitle } from '../shared/attachment_definition_helpers';
import { formatPercent, severityBadgeColor } from '../shared/severity';
import { significantSecurityEventAttachmentDataSchema } from '../../../../common/significant_security_event_schema';
import type { SignificantSecurityEventAttachmentData } from '../../../../common/significant_security_event_schema';

export const OPEN_EVENTS_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.sse.openEventsInDiscover',
  { defaultMessage: 'Open events in Discover' }
);

export const OPEN_ALERTS_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.sse.openAlertsInDiscover',
  { defaultMessage: 'Open alerts in Discover' }
);

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

export const HUNT_FINDING_BADGE_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.sse.typeBadge',
  { defaultMessage: 'Hunt finding' }
);

const FROM_REPORT_LABEL = (reportId: string) =>
  i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.subtitleFromReport', {
    defaultMessage: 'From {reportId}',
    values: { reportId },
  });

/**
 * The header badges and subtitle for an SSE attachment, shared between `getHeader` (the
 * platform chrome header) and inline content's fallback headline (rendered instead, when the
 * header has no action buttons and so does not render at all). Both must show the same
 * severity/status/confidence, or an analyst sees a different picture depending on whether
 * the attachment has a Discover exit.
 */
export const buildSignificantSecurityEventHeadline = (
  parsed: SignificantSecurityEventAttachmentData | undefined,
  data: { source_watch?: string; capability?: string } | undefined
): { subtitle?: string; badges: HeaderBadge[] } => {
  const subtitle = parsed?.report_id
    ? joinSubtitle(FROM_REPORT_LABEL(parsed.report_id), parsed.capability)
    : joinSubtitle(data?.source_watch, data?.capability);

  const badges: HeaderBadge[] = [{ label: HUNT_FINDING_BADGE_LABEL, color: 'primary' }];
  if (parsed?.severity) {
    badges.push({ label: parsed.severity, color: severityBadgeColor(parsed.severity) });
  }
  if (parsed?.status) {
    badges.push({ label: parsed.status, color: 'hollow' });
  }
  if (parsed?.confidence != null) {
    badges.push({ label: formatPercent(parsed.confidence), color: 'hollow' });
  }

  return { ...(subtitle ? { subtitle } : {}), badges };
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
}: {
  parsed: SignificantSecurityEventAttachmentData | undefined;
  navigation: AttachmentNavigationDeps;
}): ActionButton[] => {
  if (!parsed) {
    return [];
  }

  const events = parsed.events ?? [];
  const alerts = parsed.alerts ?? [];
  const exit =
    events.length > 0
      ? { esql: buildEventsLookupEsql({ events }), label: OPEN_EVENTS_LABEL }
      : {
          esql: buildAlertsLookupEsql({ alerts, spaceId: navigation.spaceId }),
          label: OPEN_ALERTS_LABEL,
        };

  return buildDiscoverActionButton({
    share: navigation.share,
    esql: exit.esql,
    label: exit.label,
  });
};
