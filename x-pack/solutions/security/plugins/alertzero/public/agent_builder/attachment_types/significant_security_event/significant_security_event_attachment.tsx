/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { AttachmentUIDefinition, HeaderBadge } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentNavigationDeps } from '../navigation';
import { formatPercent, severityBadgeColor } from '../shared/severity';
import { joinSubtitle, lazyInlineContent } from '../shared/attachment_definition_helpers';
import {
  buildSignificantSecurityEventActionButtons,
  parseSignificantSecurityEventData,
} from './types';
import type { SignificantSecurityEventAttachment } from './types';
import type { SignificantSecurityEventInlineContentProps } from './significant_security_event_inline_content';

const parsedDataCache = new WeakMap<
  NonNullable<SignificantSecurityEventAttachment['data']>,
  ReturnType<typeof parseSignificantSecurityEventData>
>();

/**
 * `parseSignificantSecurityEventData`, memoized per attachment payload object. getLabel,
 * getHeader, and getActionButtons each need the parsed shape for the same attachment within
 * one render pass; this avoids re-running the zod parse three times for that one payload.
 */
const parseOnce = (
  data: SignificantSecurityEventAttachment['data']
): ReturnType<typeof parseSignificantSecurityEventData> => {
  // `WeakMap` keys must be objects. Persisted attachment data is `unknown` at runtime, so a
  // truthy JSON primitive (e.g. a string) would throw here before zod could reject it.
  if (typeof data !== 'object' || data === null) {
    return parseSignificantSecurityEventData(data);
  }
  if (!parsedDataCache.has(data)) {
    parsedDataCache.set(data, parseSignificantSecurityEventData(data));
  }
  return parsedDataCache.get(data);
};

const DEFAULT_LABEL = i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.label', {
  defaultMessage: 'Significant Security Event',
});

const OPEN_EVENTS_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.sse.openEventsInDiscover',
  { defaultMessage: 'Open events in Discover' }
);

const OPEN_ALERTS_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.sse.openAlertsInDiscover',
  { defaultMessage: 'Open alerts in Discover' }
);

const HUNT_FINDING_BADGE_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.sse.typeBadge',
  { defaultMessage: 'Hunt finding' }
);

const FROM_REPORT_LABEL = (reportId: string) =>
  i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.subtitleFromReport', {
    defaultMessage: 'From {reportId}',
    values: { reportId },
  });

const LazySignificantSecurityEventInlineContent =
  lazyInlineContent<SignificantSecurityEventInlineContentProps>(
    () =>
      import(
        /* webpackChunkName: "alertzero_sse_attachment_inline" */
        './significant_security_event_inline_content'
      ).then((m) => ({ default: m.SignificantSecurityEventInlineContent })),
    3
  );

/**
 * Builds the `security.significant_security_event` `AttachmentUIDefinition`. Unlike the threat
 * attachment, this payload is static (no live fetch) so the factory takes no http.
 *
 * The SSE itself is not a Discover-queryable doc, so the header exit opens the documents it
 * references instead: all of its events at once, or its alerts when it carries no events.
 * Per-row exits still live in inline content.
 */
export const createSignificantSecurityEventAttachmentDefinition = ({
  navigation,
}: {
  navigation: AttachmentNavigationDeps;
}): AttachmentUIDefinition<SignificantSecurityEventAttachment> => ({
  // The attachment title lags one write behind the finding shown, so it cannot yet say
  // which finding it is. Lead with the hit count when we have one.
  getLabel: (attachment) => {
    const data = attachment?.data;
    const parsed = parseOnce(data);
    const title = data?.attachmentLabel ?? data?.title ?? DEFAULT_LABEL;
    const totalHits = parsed?.hunt_result?.tier1.counts.total_hits;
    if (parsed?.hunt_result?.has_confirmed_hit && typeof totalHits === 'number') {
      return i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.labelWithHits', {
        defaultMessage: '{count, plural, one {# hit confirms} other {# hits confirm}}: {title}',
        values: { count: totalHits, title },
      });
    }
    return title;
  },
  getIcon: () => 'securitySignalDetected',
  getHeader: ({ attachment }) => {
    const data = attachment?.data;
    const parsed = parseOnce(data);
    const subtitle = parsed?.report_id
      ? joinSubtitle(FROM_REPORT_LABEL(parsed.report_id), parsed.capability)
      : joinSubtitle(data?.source_watch, data?.capability);

    const badges: HeaderBadge[] = [{ label: HUNT_FINDING_BADGE_LABEL, color: 'primary' }];
    // Severity is required, and inline content only renders its headline when this header is
    // absent, so leaving severity out here hides it on every actionable SSE.
    if (parsed?.severity) {
      badges.push({ label: parsed.severity, color: severityBadgeColor(parsed.severity) });
    }
    if (parsed?.status) {
      badges.push({ label: parsed.status, color: 'hollow' });
    }
    if (parsed?.confidence != null) {
      badges.push({
        label: formatPercent(parsed.confidence),
        color: 'hollow',
      });
    }

    return {
      icon: 'securitySignalDetected',
      ...(subtitle ? { subtitle } : {}),
      badges,
    };
  },
  renderInlineContent: (props) => (
    <LazySignificantSecurityEventInlineContent {...props} navigation={navigation} />
  ),
  getActionButtons: ({ attachment }) =>
    buildSignificantSecurityEventActionButtons({
      parsed: parseOnce(attachment?.data),
      navigation,
      openEventsLabel: OPEN_EVENTS_LABEL,
      openAlertsLabel: OPEN_ALERTS_LABEL,
    }),
});
