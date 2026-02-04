/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { SloDetailsFlyoutAlerts } from './slo_details_flyout_alerts';
import { SloDetailsPageAlerts } from './slo_detail_alerts';

export interface SloDetailsAlertsProps {
  slo: SLOWithSummaryResponse;
}

interface Props extends SloDetailsAlertsProps {
  isFlyout?: boolean;
}

export function SloDetailsAlerts({ slo, isFlyout }: Props) {
  if (isFlyout) {
    return <SloDetailsFlyoutAlerts slo={slo} />;
  }

  return <SloDetailsPageAlerts slo={slo} />;
}
