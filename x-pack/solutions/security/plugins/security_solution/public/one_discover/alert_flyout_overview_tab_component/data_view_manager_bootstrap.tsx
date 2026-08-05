/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useInitDataViewManager, useDataViewManagerStatus } from '../../data_view_manager';
import { SecuritySolutionDataViewManagerProvider } from '../../data_view_manager/data_view_manager_provider';

const DataViewManagerBootstrapInner = () => {
  const initDataViewManager = useInitDataViewManager();
  const sharedStatus = useDataViewManagerStatus();

  useEffect(() => {
    if (sharedStatus === 'pristine' || sharedStatus === 'error') {
      initDataViewManager([]);
    }
  }, [initDataViewManager, sharedStatus]);

  return null;
};

/**
 * Bootstraps the data view manager when rendered outside of the security
 * solution app (e.g. embedded in Discover). Provides its own package provider
 * so the engine hooks resolve against the package store and dependencies.
 */
export const DataViewManagerBootstrap = () => (
  <SecuritySolutionDataViewManagerProvider>
    <DataViewManagerBootstrapInner />
  </SecuritySolutionDataViewManagerProvider>
);
