/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BurnRateFlyoutPanel } from './burn_rate_flyout_panel';
import { BurnRatePagePanel } from './burn_rate_page_panel';
import { useSloDetailsContext } from '../slo_details_context';

export function BurnRatePanel() {
  const { isFlyout } = useSloDetailsContext();

  if (isFlyout) {
    return <BurnRateFlyoutPanel />;
  }

  return <BurnRatePagePanel />;
}
