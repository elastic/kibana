/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';

/** Only loaded on click: the opener pulls in the Security store, services and flyout API. */
const LazyAttachmentSummaryFlyoutOpener = React.lazy(() =>
  import(
    /* webpackChunkName: "security_attachment_summary_drilldown" */
    './open_flyout_on_mount'
  ).then((m) => ({ default: m.AttachmentSummaryFlyoutOpener }))
);

/**
 * Builds the conversation-details drill-down for a `security.*` type. It renders no UI, and an
 * attachment that identifies nothing opens nothing, so registering it on a type is safe even
 * when only some of its attachments carry enough to open with.
 */
export const createAttachmentSummaryDrilldown = <
  TAttachment extends UnknownAttachment = UnknownAttachment
>({
  resolveSecurityCanvasContext,
}: {
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}): NonNullable<AttachmentUIDefinition<TAttachment>['renderConversationDetailsContent']> =>
  function AttachmentSummaryDrilldown({ attachment }) {
    return (
      <Suspense fallback={null}>
        <LazyAttachmentSummaryFlyoutOpener
          attachment={attachment}
          resolveSecurityCanvasContext={resolveSecurityCanvasContext}
        />
      </Suspense>
    );
  };
