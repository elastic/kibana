/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ErrorRateFlyoutPanel } from './error_rate_flyout_panel';
import { ErrorRatePagePanel } from './error_rate_page_panel';
import type { ErrorRatePanelProps } from './types';

interface Props extends ErrorRatePanelProps {
  isFlyout?: boolean;
}

export function ErrorRatePanel({ isFlyout, ...props }: Props) {
  if (isFlyout) {
    return <ErrorRateFlyoutPanel {...props} />;
  }

  return <ErrorRatePagePanel {...props} />;
}
