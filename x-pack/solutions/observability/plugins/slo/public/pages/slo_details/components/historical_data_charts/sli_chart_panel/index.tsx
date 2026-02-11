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
import { useSloDetailsContext } from '../../slo_details_context';

export function SliChartPanel(props: SliChartPanelProps) {
  const { isFlyout } = useSloDetailsContext();

  if (isFlyout) {
    return <SliChartFlyoutPanel {...props} />;
  }

  return <SliChartPagePanel {...props} />;
}
