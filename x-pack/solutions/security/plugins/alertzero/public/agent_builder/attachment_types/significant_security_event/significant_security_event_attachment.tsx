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
import { asString } from '../shared/runtime_guards';
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
  getLabel: (attachment) => {
    const data = attachment?.data;
    const parsed = parseSignificantSecurityEventData(data);
    if (parsed) {
      const { title } = buildSignificantSecurityEventHeadline(parsed, data);
      if (title) {
        return title;
      }
    }
    // Narrowed for the same reason the threat attachment narrows them: a persisted payload
    // can carry captured fields this build no longer accepts, and the platform requires a
    // string here. An object would reach Agent Builder's own chrome, outside this
    // renderer's control. The captured fields are read unparsed on purpose, so a payload
    // this build rejects still labels itself.
    return asString(data?.attachmentLabel) ?? asString(data?.title) ?? DEFAULT_LABEL;
  },
  getIcon: () => 'securitySignalDetected',
  getHeader: ({ attachment }) => {
    const data = attachment?.data;
    const parsed = parseSignificantSecurityEventData(data);
    const { subtitle, basisBadge } = buildSignificantSecurityEventHeadline(parsed, data);

    return {
      icon: 'securitySignalDetected',
      ...(subtitle ? { subtitle } : {}),
      ...(basisBadge ? { badges: [basisBadge] } : {}),
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
