/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EventsChartPanelProps } from './types';
import { EventsChartFlyoutPanel } from './events_chart_flyout_panel';
import { EventsChartPagePanel } from './events_chart_page_panel';

interface Props extends EventsChartPanelProps {
  isFlyout?: boolean;
}

export function EventsChartPanel({ isFlyout, ...props }: Props) {
  if (isFlyout) {
    return <EventsChartFlyoutPanel {...props} />;
  }

  return <EventsChartPagePanel {...props} />;
}
