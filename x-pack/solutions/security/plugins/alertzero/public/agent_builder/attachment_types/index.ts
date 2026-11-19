/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser/attachments';
import { ALERTZERO_ATTACHMENT_TYPES } from '../../../common/constants';
import type { AttachmentNavigationDeps } from './navigation';
import { withAccessBoundary } from './with_access_boundary';

type AttachmentAccessBoundary = React.ComponentType<React.PropsWithChildren>;

/**
 * Registers the `security.threat` attachment UI definition. Uses a dynamic `import()` with its
 * own `webpackChunkName` so the threat attachment's `useQuery`/`http.fetch` dependencies are not
 * pulled into the plugin's initial bundle until a threat attachment is actually registered.
 */
const registerThreatAttachmentUI = async (
  attachments: AttachmentServiceStartContract,
  {
    http,
    navigation,
    AccessBoundary,
  }: {
    http: HttpStart;
    navigation: AttachmentNavigationDeps;
    AccessBoundary: AttachmentAccessBoundary;
  }
): Promise<void> => {
  const { createThreatAttachmentDefinition } = await import(
    /* webpackChunkName: "alertzero_threat_attachment" */
    './threat'
  );
  attachments.addAttachmentType(
    ALERTZERO_ATTACHMENT_TYPES.threat,
    withAccessBoundary(createThreatAttachmentDefinition({ http, navigation }), AccessBoundary)
  );
};

/**
 * Registers the `security.significant_security_event` attachment UI definition. Same dynamic
 * `import()` reasoning as the threat attachment above: the renderer pulls in the distribution
 * bar and the shared attachment primitives, which stay out of the initial bundle.
 */
const registerSignificantSecurityEventAttachmentUI = async (
  attachments: AttachmentServiceStartContract,
  {
    navigation,
    AccessBoundary,
  }: {
    navigation: AttachmentNavigationDeps;
    AccessBoundary: AttachmentAccessBoundary;
  }
): Promise<void> => {
  const { createSignificantSecurityEventAttachmentDefinition } = await import(
    /* webpackChunkName: "alertzero_sse_attachment" */
    './significant_security_event'
  );
  attachments.addAttachmentType(
    ALERTZERO_ATTACHMENT_TYPES.significantSecurityEvent,
    withAccessBoundary(
      createSignificantSecurityEventAttachmentDefinition({ navigation }),
      AccessBoundary
    )
  );
};

/** Registers all Hunt Watch attachment UI definitions with the Agent Builder attachments service. */
export const registerAlertZeroAttachmentTypesUI = async (
  attachments: AttachmentServiceStartContract,
  {
    http,
    navigation,
    AccessBoundary,
  }: {
    http: HttpStart;
    navigation: AttachmentNavigationDeps;
    AccessBoundary: AttachmentAccessBoundary;
  }
): Promise<void> => {
  await Promise.all([
    registerThreatAttachmentUI(attachments, { http, navigation, AccessBoundary }),
    registerSignificantSecurityEventAttachmentUI(attachments, { navigation, AccessBoundary }),
  ]);
};
