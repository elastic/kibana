/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSkeletonText } from '@elastic/eui';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentUIDefinition, HeaderBadge } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentNavigationDeps } from '../navigation';
import { buildAlertsLookupEsql, buildDiscoverEsqlUrl, buildEventsLookupEsql } from '../navigation';
import { formatPercent } from '../shared/severity';
import { parseSignificantSecurityEventData } from './types';
import type { SignificantSecurityEventAttachment } from './types';

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

const LazySignificantSecurityEventInlineContent = React.lazy(() =>
  import(
    /* webpackChunkName: "alertzero_sse_attachment_inline" */
    './significant_security_event_inline_content'
  ).then((m) => ({ default: m.SignificantSecurityEventInlineContent }))
);

/**
 * Builds the `security.significant_security_event` `AttachmentUIDefinition`. Unlike the threat
 * attachment, this payload is static (no live fetch) so the factory takes no http. Kept as a
 * factory to mirror the sibling types' registration shape in `attachment_types/index.ts`.
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
  // server-side, tracked separately. Until then, lead with the hit count when we have one.
  getLabel: (attachment) => {
    const data = attachment?.data;
    const parsed = parseSignificantSecurityEventData(data);
    const title = data?.attachmentLabel ?? data?.title ?? DEFAULT_LABEL;
    const totalHits = parsed?.huntResult?.tier1.counts.totalHits;
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
    const subtitle = parsed?.reportId
      ? i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.subtitleFromReport', {
          defaultMessage: 'From {reportId} · {capability}',
          values: { reportId: parsed.reportId, capability: data?.capability ?? '' },
        })
      : [data?.source_watch, data?.capability].filter(Boolean).join(' · ');

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
    <React.Suspense fallback={<EuiSkeletonText lines={3} />}>
      <LazySignificantSecurityEventInlineContent {...props} navigation={navigation} />
    </React.Suspense>
  ),
  getActionButtons: ({ attachment }) => {
    const parsed = parseSignificantSecurityEventData(attachment?.data);
    if (!parsed) {
      return [];
    }

    const exit =
      parsed.events.length > 0
        ? { esql: buildEventsLookupEsql({ events: parsed.events }), label: OPEN_EVENTS_LABEL }
        : { esql: buildAlertsLookupEsql({ alerts: parsed.alerts }), label: OPEN_ALERTS_LABEL };
    if (!exit.esql) {
      return [];
    }

    const href = buildDiscoverEsqlUrl({ share: navigation.share, esql: exit.esql });
    if (!href) {
      return [];
    }

    return [
      {
        label: exit.label,
        icon: 'discoverApp',
        type: ActionButtonType.SECONDARY,
        href,
        openInNewTab: true,
        handler: () => undefined,
      },
    ];
  },
});
