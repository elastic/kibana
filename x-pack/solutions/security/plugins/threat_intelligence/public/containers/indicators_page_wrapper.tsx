/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, VFC } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CasesPermissions } from '@kbn/cases-plugin/common';
import { IndicatorsPage } from '../modules/indicators/pages/indicators';
import { IntegrationsGuard } from './integrations_guard';
import { useKibana } from '../hooks/use_kibana';

export const APP_ID = 'securitySolution';

const queryClient = new QueryClient();

const casesContextOwner = [APP_ID];

export const IndicatorsPageWrapper: VFC = () => {
  const { cases } = useKibana().services;
  const CasesContext = useMemo(() => cases.ui.getCasesContext(), [cases.ui]);
  const permissions: CasesPermissions = useMemo(() => cases.helpers.canUseCases(), [cases.helpers]);

  return (
    <CasesContext owner={casesContextOwner} permissions={permissions}>
      <QueryClientProvider client={queryClient}>
        <IntegrationsGuard>
          <IndicatorsPage />
        </IntegrationsGuard>
      </QueryClientProvider>
    </CasesContext>
  );
};

// Note: This is for lazy loading
// eslint-disable-next-line import/no-default-export
export default memo(IndicatorsPageWrapper);
