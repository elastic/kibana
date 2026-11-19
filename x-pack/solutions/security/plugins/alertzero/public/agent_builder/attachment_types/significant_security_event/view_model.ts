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
import { significantSecurityEventAttachmentReadSchema } from '../../../../common/significant_security_event_schema';
import type { SignificantSecurityEventAttachmentData } from '../../../../common/significant_security_event_schema';
import { SSE_BASIS_LABELS, toSseViewModel, type SseBasis } from '../../../../common/sse_view';

export { toSseViewModel, type SseEntityLine, type SseViewModel } from '../../../../common/sse_view';

export const OPEN_EVENTS_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.sse.openEventsInDiscover',
  { defaultMessage: 'Open cited events' }
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
export type SignificantSecurityEventRef = NonNullable<
  SignificantSecurityEventAttachmentData['events']
>[number];
export type SignificantSecurityAlertRef = NonNullable<
  SignificantSecurityEventAttachmentData['alerts']
>[number];
export type HuntResult = NonNullable<SignificantSecurityEventAttachmentData['hunt_result']>;
export type HuntResultBehavior = NonNullable<HuntResult['tier2']>['behaviors'][number];
export type HuntResultBehaviorExecution = NonNullable<HuntResultBehavior['execution']>;
export type SseEntityRef = SignificantSecurityEventAttachmentData['entities'][number];

/**
 * Validates the raw attachment payload against the zod schema. The server already
 * validates on write with the identical schema, so a payload that fails here is one
 * the server would have rejected; the renderer falls back to its empty state.
 */
export const parseSignificantSecurityEventData = (
  candidate: unknown
): SignificantSecurityEventAttachmentData | undefined => {
  const result = significantSecurityEventAttachmentReadSchema.safeParse(candidate);
  return result.success ? result.data : undefined;
};

const FROM_REPORT_LABEL = (reportId: string) =>
  i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.subtitleFromReport', {
    defaultMessage: 'From {reportId}',
    values: { reportId },
  });

/** Hollow header badge for a graded SSE basis (chrome + inline fallback). */
export const basisHeaderBadge = (basis: SseBasis): HeaderBadge => ({
  label: SSE_BASIS_LABELS[basis],
  color: 'hollow',
});

/**
 * Chrome title / subtitle / basis badge for an SSE attachment. Severity, status,
 * and confidence stay in the card body; the chrome header only carries basis.
 */
export const buildSignificantSecurityEventHeadline = (
  parsed: SignificantSecurityEventAttachmentData | undefined,
  data: { source_watch?: string; capability?: string } | undefined
): { title: string; subtitle?: string; basisBadge?: HeaderBadge } => {
  const viewModel = parsed ? toSseViewModel(parsed) : undefined;
  const title = viewModel?.summary ?? '';

  const subtitle = parsed?.report_id
    ? joinSubtitle(FROM_REPORT_LABEL(parsed.report_id), parsed.capability)
    : joinSubtitle(data?.source_watch, data?.capability);

  return {
    title,
    ...(subtitle ? { subtitle } : {}),
    ...(viewModel?.basis ? { basisBadge: basisHeaderBadge(viewModel.basis) } : {}),
  };
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
