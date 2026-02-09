/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { DatePickerContextProvider } from '../context/date_picker_context/date_picker_context';
import { useKibana } from '../hooks/use_kibana';
import { LandingPage } from '../pages/landing/landing';
import { OverviewPage } from '../pages/overview/overview';
import { HasDataContextProvider } from '../context/has_data_context/has_data_context';

const completeRoutes = {
  '/': {
    handler: () => {
      return (
        <HasDataContextProvider>
          <DatePickerContextProvider>
            <OverviewPage />
          </DatePickerContextProvider>
        </HasDataContextProvider>
      );
    },
    params: {},
    exact: true,
  },
};

const routes = {
  '/landing': {
    handler: () => {
      return (
        <HasDataContextProvider>
          <LandingPage />
        </HasDataContextProvider>
      );
    },
    params: {},
    exact: true,
  },
};

export const useAppRoutes = () => {
  const { pricing } = useKibana().services;
  const isCompleteOverviewEnabled = pricing.isFeatureAvailable('observability:complete_overview');
  return {
    ...(isCompleteOverviewEnabled ? { ...completeRoutes, ...routes } : { ...routes }),
  };
};
