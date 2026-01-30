/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SliChartPanelProps } from './types';
import { SliChartFlyoutPanel } from './sli_chart_flyout_panel';
import { SliChartPagePanel } from './sli_chart_page_panel';

interface Props extends SliChartPanelProps {
  isFlyout?: boolean;
}

export function SliChartPanel({ isFlyout, ...props }: Props) {
  if (isFlyout) {
    return <SliChartFlyoutPanel {...props} />;
  }

  return <SliChartPagePanel {...props} />;
}
