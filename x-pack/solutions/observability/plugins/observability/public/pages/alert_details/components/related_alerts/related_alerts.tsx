/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingChart } from '@elastic/eui';
import { TopAlert } from '../../../..';
import { ObservabilityFields } from '../../../../../common/utils/alerting/types';
import { RelatedAlertsView } from './related_alerts_view';

interface Props {
  alert?: TopAlert<ObservabilityFields>;
}

export function RelatedAlerts({ alert }: Props) {
  if (!alert) {
    return <EuiLoadingChart />;
  }

  return <RelatedAlertsView alert={alert} />;
}
