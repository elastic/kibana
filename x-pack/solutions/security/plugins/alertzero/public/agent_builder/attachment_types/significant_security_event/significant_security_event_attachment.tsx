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
import { buildAlertsLookupEsql, buildEventsLookupEsql } from '../navigation';
import { formatPercent } from '../shared/severity';
import {
  buildDiscoverActionButton,
  joinSubtitle,
  lazyInlineContent,
} from '../shared/attachment_definition_helpers';
import { parseSignificantSecurityEventData } from './types';
import type { SignificantSecurityEventAttachment } from './types';
import type { SignificantSecurityEventInlineContentProps } from './significant_security_event_inline_content';

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
  // The SSE mapper copies the report title into the SSE today, so the attachment title cannot
  // yet say which finding it is; the long-term fix is a finding-shaped title written
  // server-side. Until then, lead with the hit count when we have one.
  getLabel: (attachment) => {
    const data = attachment?.data;
    const parsed = parseSignificantSecurityEventData(data);
    const title = data?.attachmentLabel ?? data?.title ?? DEFAULT_LABEL;
    const totalHits = parsed?.hunt_result?.tier1.counts.total_hits;
    if (typeof totalHits === 'number') {
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
    const parsed = parseSignificantSecurityEventData(data);
    const subtitle = parsed?.report_id
      ? joinSubtitle(FROM_REPORT_LABEL(parsed.report_id), parsed.capability)
      : joinSubtitle(data?.source_watch, data?.capability);

    const badges: HeaderBadge[] = [{ label: HUNT_FINDING_BADGE_LABEL, color: 'primary' }];
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
  getActionButtons: ({ attachment }) => {
    const parsed = parseSignificantSecurityEventData(attachment?.data);
    if (!parsed) {
      return [];
    }

    const events = parsed.events ?? [];
    const alerts = parsed.alerts ?? [];
    const exit =
      events.length > 0
        ? { esql: buildEventsLookupEsql({ events }), label: OPEN_EVENTS_LABEL }
        : { esql: buildAlertsLookupEsql({ alerts }), label: OPEN_ALERTS_LABEL };

    return buildDiscoverActionButton({
      share: navigation.share,
      esql: exit.esql,
      label: exit.label,
    });
  },
});
