/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { State } from '../../common/store/types';
import { useInitDataViewManager } from '../../data_view_manager/hooks/use_init_data_view_manager';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';

export const DataViewManagerBootstrap = () => {
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const initDataViewManager = useInitDataViewManager();
  const sharedStatus = useSelector((state: State) => state.dataViewManager.shared.status);

  useEffect(() => {
    if (!newDataViewPickerEnabled) {
      return;
    }

    if (sharedStatus === 'pristine' || sharedStatus === 'error') {
      initDataViewManager([]);
    }
  }, [initDataViewManager, newDataViewPickerEnabled, sharedStatus]);

  return null;
};
