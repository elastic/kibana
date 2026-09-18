/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSkeletonText } from '@elastic/eui';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
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
 * attachment, this payload is static (no live fetch) so the factory takes no arguments — kept as
 * a factory anyway to mirror the sibling types' registration shape in `attachment_types/index.ts`.
 */
export const createSignificantSecurityEventAttachmentDefinition =
  (): AttachmentUIDefinition<SignificantSecurityEventAttachment> => ({
    getLabel: (attachment) => attachment?.data?.attachmentLabel ?? DEFAULT_LABEL,
    getIcon: () => 'flag',
    renderInlineContent: (props) => (
      <React.Suspense fallback={<EuiSkeletonText lines={3} />}>
        <LazySignificantSecurityEventInlineContent {...props} />
      </React.Suspense>
    ),
  });
