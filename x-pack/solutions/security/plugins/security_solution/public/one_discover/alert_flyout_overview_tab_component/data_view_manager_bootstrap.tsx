/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useInitDataViewManager, useDataViewManagerStatus } from '../../data_view_manager';

export const DataViewManagerBootstrap = () => {
  const initDataViewManager = useInitDataViewManager();
  const sharedStatus = useDataViewManagerStatus();

  useEffect(() => {
    if (sharedStatus === 'pristine' || sharedStatus === 'error') {
      initDataViewManager([]);
    }
  }, [initDataViewManager, sharedStatus]);

  return null;
};
