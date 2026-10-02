/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ISearchGeneric } from '@kbn/search-types';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';

const LazyAlertPill = React.lazy(() =>
  import(
    /* webpackChunkName: "security_conversation_details_alert_pill" */
    './alert_pill'
  ).then((m) => ({ default: m.AlertPill }))
);

const LazyAlertsPill = React.lazy(() =>
  import(
    /* webpackChunkName: "security_conversation_details_alerts_pill" */
    './alerts_pill'
  ).then((m) => ({ default: m.AlertsPill }))
);

/** Renders a conversation-details pill for a single `security.alert` attachment. */
export const renderAlertConversationDetails = ({
  attachment,
  resolveSecurityCanvasContext,
}: {
  attachment: UnknownAttachment;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}) => (
  <React.Suspense fallback={null}>
    <LazyAlertPill
      attachment={attachment}
      resolveSecurityCanvasContext={resolveSecurityCanvasContext}
    />
  </React.Suspense>
);

/** Renders a conversation-details pill for a `security.alerts` (batch) attachment. */
export const renderAlertsConversationDetails = ({
  attachment,
  application,
  getSpaceId,
  search,
  resolveSecurityCanvasContext,
}: {
  attachment: UnknownAttachment;
  application: ApplicationStart;
  getSpaceId: () => Promise<string>;
  search: ISearchGeneric;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}) => (
  <React.Suspense fallback={null}>
    <LazyAlertsPill
      attachment={attachment}
      application={application}
      getSpaceId={getSpaceId}
      search={search}
      resolveSecurityCanvasContext={resolveSecurityCanvasContext}
    />
  </React.Suspense>
);
