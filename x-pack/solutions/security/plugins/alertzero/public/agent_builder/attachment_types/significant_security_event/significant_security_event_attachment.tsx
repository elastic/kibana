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
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentNavigationDeps } from '../navigation';
import { buildAlertsLookupEsql, buildDiscoverEsqlUrl, buildEventsLookupEsql } from '../navigation';
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

const LazySignificantSecurityEventInlineContent = React.lazy(() =>
  import(
    /* webpackChunkName: "alertzero_sse_attachment_inline" */
    './significant_security_event_inline_content'
  ).then((m) => ({ default: m.SignificantSecurityEventInlineContent }))
);

/**
 * Builds the `security.significant_security_event` `AttachmentUIDefinition`. Unlike the threat
 * attachment, this payload is static (no live fetch) so the factory takes no http — kept as a
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
  getLabel: (attachment) => attachment?.data?.attachmentLabel ?? DEFAULT_LABEL,
  getIcon: () => 'flag',
  getHeader: () => ({ icon: 'flag' }),
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
