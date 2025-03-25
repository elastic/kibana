/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingChart, EuiSpacer } from '@elastic/eui';
import { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import { RelatedAlertsTable } from './related_alerts_table';
import { RelatedAlertsView } from './related_alerts_view';
import { AlertData } from '../../../../hooks/use_fetch_alert_detail';

interface Props {
  alertData?: AlertData | null;
}

export function RelatedAlerts({ alertData }: Props) {
  const queryClient = new QueryClient();

  if (!alertData) {
    return <EuiLoadingChart />;
  }

  return (
    <>
      <QueryClientProvider client={queryClient} context={AlertsQueryContext}>
        <RelatedAlertsView alertData={alertData} />
      </QueryClientProvider>
      <EuiSpacer />
      <RelatedAlertsTable alertData={alertData} />
    </>
  );
}
