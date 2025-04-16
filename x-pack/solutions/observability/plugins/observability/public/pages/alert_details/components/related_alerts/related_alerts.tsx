/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingChart } from '@elastic/eui';
import { RelatedAlertsTable } from './related_alerts_table';
import { AlertData } from '../../../../hooks/use_fetch_alert_detail';

interface Props {
  alertData?: AlertData | null;
}

export function RelatedAlerts({ alertData }: Props) {
  if (!alertData) {
    return <EuiLoadingChart />;
  }

  return <RelatedAlertsTable alertData={alertData} />;
}
