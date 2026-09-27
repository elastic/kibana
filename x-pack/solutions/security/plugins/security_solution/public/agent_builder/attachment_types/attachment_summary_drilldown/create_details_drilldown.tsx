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
import { hasDrilldownIdentity } from './to_flyout_descriptor';

/**
 * Only loaded once a row is clicked. The opener pulls in the Security store, services and the
 * flyout API, none of which should reach the bundle of a surface that merely lists attachments.
 */
const LazyAttachmentSummaryFlyoutOpener = React.lazy(() =>
  import(
    /* webpackChunkName: "security_attachment_summary_drilldown" */
    './open_flyout_on_mount'
  ).then((m) => ({ default: m.AttachmentSummaryFlyoutOpener }))
);

/**
 * Builds the conversation-details drill-down for a `security.*` attachment type: the jump from
 * the investigation flyout's attachment summary to the flyout that describes the attachment.
 *
 * Returns both halves of the contract, so a type opts in by spreading one call. The renderer
 * draws no UI of its own — the row that mounts it owns the presentation — and the companion
 * predicate reports whether a given attachment identifies anything, which is what keeps a row
 * whose payload is unopenable from looking clickable. Registering this on a type is therefore
 * safe even when only some of its attachments carry enough to open with.
 */
export const createAttachmentSummaryDrilldown = <
  TAttachment extends UnknownAttachment = UnknownAttachment
>({
  resolveSecurityCanvasContext,
}: {
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}): Pick<
  AttachmentUIDefinition<TAttachment>,
  'renderConversationDetailsContent' | 'hasConversationDetailsContent'
> => ({
  hasConversationDetailsContent: (attachment) => hasDrilldownIdentity(attachment),
  renderConversationDetailsContent: function AttachmentSummaryDrilldown({ attachment }) {
    return (
      <Suspense fallback={null}>
        <LazyAttachmentSummaryFlyoutOpener
          attachment={attachment}
          resolveSecurityCanvasContext={resolveSecurityCanvasContext}
        />
      </Suspense>
    );
  },
});
