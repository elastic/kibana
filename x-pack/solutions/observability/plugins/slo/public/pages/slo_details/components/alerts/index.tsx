/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SloDetailsFlyoutAlerts } from './slo_details_flyout_alerts';
import { SloDetailsPageAlerts } from './slo_detail_page_alerts';
import { useSloDetailsContext } from '../slo_details_context';

export function SloDetailsAlerts() {
  const { isFlyout } = useSloDetailsContext();

  if (isFlyout) {
    return <SloDetailsFlyoutAlerts />;
  }

  return <SloDetailsPageAlerts />;
}
