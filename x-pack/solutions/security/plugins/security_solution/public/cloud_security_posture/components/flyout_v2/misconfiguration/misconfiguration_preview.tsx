/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MisconfigurationsPreview as MisconfigurationsPreviewBase } from '../../misconfiguration/misconfiguration_preview';

export type MisconfigurationsPreviewProps = Omit<
  React.ComponentProps<typeof MisconfigurationsPreviewBase>,
  'isPreviewMode'
>;

/**
 * Flyout v2 wrapper around the context-agnostic {@link MisconfigurationsPreviewBase}.
 * Composes the v1 preview with `isPreviewMode` pinned on (non-expandable form).
 */
export const MisconfigurationsPreview = (props: MisconfigurationsPreviewProps) => (
  <MisconfigurationsPreviewBase {...props} isPreviewMode />
);
