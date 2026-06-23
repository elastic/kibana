/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AlertsPreview as AlertsPreviewBase } from '../../alerts/alerts_preview';

export type AlertsPreviewProps = Omit<
  React.ComponentProps<typeof AlertsPreviewBase>,
  'isPreviewMode'
>;

/**
 * Flyout v2 wrapper around the context-agnostic {@link AlertsPreviewBase}.
 * Composes the v1 preview with `isPreviewMode` pinned on (non-expandable form).
 */
export const AlertsPreview = (props: AlertsPreviewProps) => (
  <AlertsPreviewBase {...props} isPreviewMode />
);
