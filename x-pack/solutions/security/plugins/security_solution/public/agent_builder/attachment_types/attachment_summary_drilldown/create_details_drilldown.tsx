/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { renderAlertSection, renderAlertsSection } from './summary_rows';

export const createAlertSummaryRows =
  <TAttachment extends UnknownAttachment = UnknownAttachment>({
    resolveSecurityCanvasContext,
  }: {
    resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
  }): NonNullable<AttachmentUIDefinition<TAttachment>['renderConversationDetailsContent']> =>
  ({ attachment }) =>
    renderAlertSection({ attachment, resolveSecurityCanvasContext });

export const createAlertsSummaryRows =
  <TAttachment extends UnknownAttachment = UnknownAttachment>({
    resolveSecurityCanvasContext,
    getSpaceId,
  }: {
    resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
    getSpaceId: () => Promise<string>;
  }): NonNullable<AttachmentUIDefinition<TAttachment>['renderConversationDetailsContent']> =>
  ({ attachment }) =>
    renderAlertsSection({ attachment, getSpaceId, resolveSecurityCanvasContext });
