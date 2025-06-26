/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EnterpriseGuard } from './containers/enterprise_guard';

const LazyIndicatorsPageWrapper = React.lazy(() => import('./containers/indicators_page_wrapper'));

export const ThreatIntelligenceApp = () => {
  return (
    <IntlProvider>
      <EnterpriseGuard>
        <Suspense fallback={<div />}>
          <LazyIndicatorsPageWrapper />
        </Suspense>
      </EnterpriseGuard>
    </IntlProvider>
  );
};
