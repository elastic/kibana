/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { BurnRatePanelProps } from './types';
import { BurnRateFlyoutPanel } from './burn_rate_flyout_panel';
import { BurnRatePagePanel } from './burn_rate_page_panel';

interface Props extends BurnRatePanelProps {
  renderMode?: 'flyout' | 'page';
}

export function BurnRatePanel({ renderMode = 'page', ...props }: Props) {
  if (renderMode === 'flyout') {
    return <BurnRateFlyoutPanel {...props} />;
  }

  return <BurnRatePagePanel {...props} />;
}
