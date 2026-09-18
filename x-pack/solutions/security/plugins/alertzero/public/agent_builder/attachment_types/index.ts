/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser/attachments';
import { ALERTZERO_ATTACHMENT_TYPES } from '../../../common/constants';

/**
 * Registers the `security.threat` attachment UI definition. Uses a dynamic `import()` with its
 * own `webpackChunkName` so the threat attachment's `useQuery`/`http.fetch` dependencies are not
 * pulled into the plugin's initial bundle until a threat attachment is actually registered.
 */
export const registerThreatAttachmentUI = async (
  attachments: AttachmentServiceStartContract,
  http: HttpStart
): Promise<void> => {
  const { createThreatAttachmentDefinition } = await import(
    /* webpackChunkName: "alertzero_threat_attachment" */
    './threat'
  );
  attachments.addAttachmentType(
    ALERTZERO_ATTACHMENT_TYPES.threat,
    createThreatAttachmentDefinition({ http })
  );
};

/** Registers the `security.significant_security_event` attachment UI definition. */
export const registerSignificantSecurityEventAttachmentUI = async (
  attachments: AttachmentServiceStartContract
): Promise<void> => {
  const { createSignificantSecurityEventAttachmentDefinition } = await import(
    /* webpackChunkName: "alertzero_sse_attachment" */
    './significant_security_event'
  );
  attachments.addAttachmentType(
    ALERTZERO_ATTACHMENT_TYPES.significantSecurityEvent,
    createSignificantSecurityEventAttachmentDefinition()
  );
};

/** Registers the `security.hunt_correlation` attachment UI definition. */
export const registerHuntCorrelationAttachmentUI = async (
  attachments: AttachmentServiceStartContract
): Promise<void> => {
  const { createHuntCorrelationAttachmentDefinition } = await import(
    /* webpackChunkName: "alertzero_hunt_correlation_attachment" */
    './hunt_correlation'
  );
  attachments.addAttachmentType(
    ALERTZERO_ATTACHMENT_TYPES.huntCorrelation,
    createHuntCorrelationAttachmentDefinition()
  );
};

/** Registers all Hunt Watch attachment UI definitions with the Agent Builder attachments service. */
export const registerAlertZeroAttachmentTypesUI = async (
  attachments: AttachmentServiceStartContract,
  http: HttpStart
): Promise<void> => {
  await Promise.all([
    registerThreatAttachmentUI(attachments, http),
    registerSignificantSecurityEventAttachmentUI(attachments),
    registerHuntCorrelationAttachmentUI(attachments),
  ]);
};
