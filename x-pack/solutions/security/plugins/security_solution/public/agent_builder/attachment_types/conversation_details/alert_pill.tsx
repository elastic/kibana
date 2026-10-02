/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { toAlertDescriptor } from './to_flyout_descriptor';
import { useFlyoutPill } from './use_flyout_pill';
import { CONVERSATION_DETAILS_LABELS } from './translations';

interface AlertPillProps {
  attachment: UnknownAttachment;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

/** Pill for `security.alert` — always opens a flyout (always 1 alert per attachment). */
export const AlertPill = memo(({ attachment, resolveSecurityCanvasContext }: AlertPillProps) => {
  const descriptor = useMemo(() => toAlertDescriptor(attachment), [attachment]);
  const resolveDescriptor = useCallback(() => Promise.resolve(descriptor), [descriptor]);

  const pill = useFlyoutPill({
    label: CONVERSATION_DETAILS_LABELS.alerts(1),
    resolveDescriptor,
    resolveSecurityCanvasContext,
  });

  if (!descriptor) return null;
  return <>{pill}</>;
});
AlertPill.displayName = 'AlertPill';
