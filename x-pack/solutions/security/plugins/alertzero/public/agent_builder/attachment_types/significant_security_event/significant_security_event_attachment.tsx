/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentNavigationDeps } from '../navigation';
import { lazyInlineContent } from '../shared/attachment_definition_helpers';
import {
  buildSignificantSecurityEventActionButtons,
  buildSignificantSecurityEventHeadline,
  parseSignificantSecurityEventData,
} from './view_model';
import type { SignificantSecurityEventAttachment } from './view_model';
import type { SignificantSecurityEventInlineContentProps } from './significant_security_event_inline_content';

const DEFAULT_LABEL = i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.label', {
  defaultMessage: 'Significant Security Event',
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
    const parsed = parseSignificantSecurityEventData(data);
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
  // Severity / status / confidence live in the card body; the header stays title + subtitle.
  getHeader: ({ attachment }) => {
    const data = attachment?.data;
    const parsed = parseSignificantSecurityEventData(data);
    const { subtitle } = buildSignificantSecurityEventHeadline(parsed, data);

    return {
      icon: 'securitySignalDetected',
      ...(subtitle ? { subtitle } : {}),
    };
  },
  renderInlineContent: (props) => (
    <LazySignificantSecurityEventInlineContent {...props} navigation={navigation} />
  ),
  getActionButtons: ({ attachment }) =>
    buildSignificantSecurityEventActionButtons({
      parsed: parseSignificantSecurityEventData(attachment?.data),
      navigation,
    }),
});
