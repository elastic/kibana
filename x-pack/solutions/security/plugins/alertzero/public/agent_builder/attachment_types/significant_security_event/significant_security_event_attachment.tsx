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
import {
  buildAlertDetailsUrl,
  buildDiscoverEsqlUrl,
  buildEventLookupEsql,
} from '../navigation';
import { parseSignificantSecurityEventData } from './types';
import type { SignificantSecurityEventAttachment } from './types';

const DEFAULT_LABEL = i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.label', {
  defaultMessage: 'Significant Security Event',
});

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
 */
export const createSignificantSecurityEventAttachmentDefinition = ({
  navigation,
}: {
  navigation: AttachmentNavigationDeps;
}): AttachmentUIDefinition<SignificantSecurityEventAttachment> => ({
  getLabel: (attachment) => attachment?.data?.attachmentLabel ?? DEFAULT_LABEL,
  getIcon: () => 'flag',
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

    const firstEvent = parsed.events[0];
    if (firstEvent) {
      const esql = buildEventLookupEsql({
        index: firstEvent.source_index,
        eventId: firstEvent.event_id,
      });
      const href = buildDiscoverEsqlUrl({ share: navigation.share, esql });
      if (href) {
        return [
          {
            label: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.openInDiscover', {
              defaultMessage: 'Open in Discover',
            }),
            icon: 'discoverApp',
            type: ActionButtonType.SECONDARY,
            href,
            openInNewTab: true,
            handler: () => undefined,
          },
        ];
      }
    }

    const firstAlert = parsed.alerts[0];
    if (firstAlert) {
      const href = buildAlertDetailsUrl({
        prependPath: navigation.prependPath,
        spaceId: navigation.spaceId,
        alertId: firstAlert,
      });
      return [
        {
          label: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.openAlert', {
            defaultMessage: 'Open alert',
          }),
          icon: 'warning',
          type: ActionButtonType.SECONDARY,
          href,
          openInNewTab: true,
          handler: () => undefined,
        },
      ];
    }

    return [];
  },
});
