/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { PageScope } from '../../data_view_manager/constants';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { useSignalIndexName } from '../../data_view_manager/hooks/use_signal_index_name';

export const useSignalHelpers = (): {
  /* when true, signal index has been initiated but does not exist yet */
  signalIndexNeedsInit: boolean;
} => {
  const { dataView, status } = useDataView(PageScope.alerts);
  const signalIndexName = useSignalIndexName();

  const defaultDataViewPattern = dataView.getIndexPattern() ?? '';

  const signalIndexNeedsInit = useMemo(() => {
    if (status === 'pristine') {
      return false;
    }
    return !defaultDataViewPattern.includes(`${signalIndexName}`);
  }, [defaultDataViewPattern, signalIndexName, status]);

  return {
    signalIndexNeedsInit,
  };
};
