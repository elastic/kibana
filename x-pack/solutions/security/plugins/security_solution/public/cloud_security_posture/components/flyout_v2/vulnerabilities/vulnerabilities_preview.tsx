/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { VulnerabilitiesPreview as VulnerabilitiesPreviewBase } from '../../vulnerabilities/vulnerabilities_preview';

export type VulnerabilitiesPreviewProps = Omit<
  React.ComponentProps<typeof VulnerabilitiesPreviewBase>,
  'isPreviewMode'
>;

/**
 * Flyout v2 wrapper around the context-agnostic {@link VulnerabilitiesPreviewBase}.
 * Composes the v1 preview with `isPreviewMode` pinned on (non-expandable form).
 */
export const VulnerabilitiesPreview = (props: VulnerabilitiesPreviewProps) => (
  <VulnerabilitiesPreviewBase {...props} isPreviewMode />
);
